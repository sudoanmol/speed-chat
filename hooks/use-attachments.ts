import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import type { FileUIPart } from 'ai'
import { useConvexAuth, useMutation } from 'convex/react'
import { useState } from 'react'
import { toast } from 'sonner'

type UseAttachmentsProps = {
  filesToSend: FileUIPart[]
  setFilesToSend: React.Dispatch<React.SetStateAction<FileUIPart[]>>
  setFilesToUpload: React.Dispatch<React.SetStateAction<File[]>>
}

export function useAttachments({ filesToSend, setFilesToSend, setFilesToUpload }: UseAttachmentsProps) {
  const { isAuthenticated } = useConvexAuth()
  const [isUploading, setIsUploading] = useState(false)

  const maxFileSize = 4 * 1024 * 1024

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const storeFile = useMutation(api.storage.storeFile)
  const deleteFiles = useMutation(api.storage.deleteFiles)

  const isFileTypeSupported = (fileType: string) => {
    return fileType.startsWith('image/') || fileType === 'application/pdf'
  }

  const startUpload = async (files: File[]) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to upload files')
      return
    }

    setIsUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const postUrl = await generateUploadUrl()

        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!result.ok) {
          throw new Error('Failed to generate upload URL')
        }

        const { storageId } = await result.json()

        const url = await storeFile({ fileId: storageId })

        return {
          type: 'file' as const,
          filename: file.name,
          mediaType: file.type,
          url,
        }
      })

      const urls = await Promise.all(uploadPromises)
      setFilesToSend((prev) => [...prev, ...urls])
      toast.success(`${urls.length} file(s) uploaded successfully`)
    } catch (error) {
      toast.error(getErrorMessage(error))
      // Remove files from preview on error
      setFilesToUpload((prev) => prev.filter((f) => !files.includes(f)))
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    processFilesAndUpload(files)
    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  const removeFile = (file: File) => {
    const fileToRemove = filesToSend.find((f) => f.filename === file.name)
    if (fileToRemove) {
      toast.promise(
        deleteFiles({ fileUrls: [fileToRemove.url] }).then(() => {
          setFilesToUpload((prev) => prev.filter((f) => f.name !== file.name))
          setFilesToSend((prev) => prev.filter((f) => f.filename !== file.name))
        }),
        {
          loading: 'Removing file...',
          success: 'File removed',
          error: 'Failed to remove file',
        }
      )
    }
  }

  const processFilesAndUpload = (files: File[]) => {
    const unsupportedFiles = files.filter((file) => !isFileTypeSupported(file.type))
    if (unsupportedFiles.length > 0) {
      toast.error('Only image and PDF files are allowed')
      return
    }

    // Max file size check
    const exceedMaxFiles = files.filter((file) => file.size > maxFileSize)
    if (exceedMaxFiles.length > 0) {
      toast.error(`File ${exceedMaxFiles.map((f) => f.name).join(', ')} size exceeds 4MB`)
      return
    }

    // Duplicate file check
    const duplicateFiles = files.filter((file) => filesToSend.some((f) => f.filename === file.name))

    if (duplicateFiles.length > 0) {
      toast.error(`File ${duplicateFiles.map((f) => f.name).join(', ')} is already uploaded`)
      return
    }

    // Max file count check
    if (files.length + filesToSend.length > 5) {
      toast.error('You can only upload up to 5 files')
      return
    }

    setFilesToUpload((prev) => [...prev, ...files])
    startUpload(files)
  }

  return {
    isUploading,
    handleFileChange,
    removeFile,
    processFilesAndUpload,
  }
}
