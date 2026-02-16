import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import type { FileUIPart } from 'ai'
import { useConvexAuth, useMutation } from 'convex/react'
import { PDFDocument } from 'pdf-lib'
import { useState } from 'react'
import { toast } from 'sonner'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_FILE_SIZE_BYTES = 25 * 1024 * 1024
const MAX_FILE_COUNT = 10
const MAX_PDF_PAGE_COUNT = 100

type UseAttachmentsProps = {
  filesToUpload: File[]
  filesToSend: FileUIPart[]
  setFilesToSend: React.Dispatch<React.SetStateAction<FileUIPart[]>>
  setFilesToUpload: React.Dispatch<React.SetStateAction<File[]>>
}

export function useAttachments({ filesToUpload, filesToSend, setFilesToSend, setFilesToUpload }: UseAttachmentsProps) {
  const { isAuthenticated } = useConvexAuth()
  const [isUploading, setIsUploading] = useState(false)

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const storeFile = useMutation(api.storage.storeFile)
  const deleteFiles = useMutation(api.storage.deleteFiles)

  const isFileTypeSupported = (fileType: string) => {
    return fileType.startsWith('image/') || fileType === 'application/pdf'
  }

  const getPdfPageCount = async (file: File) => {
    const fileBuffer = await file.arrayBuffer()
    const pdfDocument = await PDFDocument.load(fileBuffer)
    return pdfDocument.getPageCount()
  }

  const validatePdfPageCount = async (files: File[]) => {
    const pdfFiles = files.filter((file) => file.type === 'application/pdf')

    for (const pdfFile of pdfFiles) {
      try {
        const pageCount = await getPdfPageCount(pdfFile)
        if (pageCount > MAX_PDF_PAGE_COUNT) {
          toast.error(
            `PDF ${pdfFile.name} has ${pageCount} pages. Maximum allowed pages per PDF is ${MAX_PDF_PAGE_COUNT}.`
          )
          return false
        }
      } catch {
        toast.error(`Could not read PDF ${pdfFile.name}. Please try another file.`)
        return false
      }
    }

    return true
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
    if (files.length === 0) {
      return
    }

    const unsupportedFiles = files.filter((file) => !isFileTypeSupported(file.type))
    if (unsupportedFiles.length > 0) {
      toast.error('Only image and PDF files are allowed')
      return
    }

    // Max file size check
    const filesExceedingSizeLimit = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES)
    if (filesExceedingSizeLimit.length > 0) {
      toast.error(`File ${filesExceedingSizeLimit.map((f) => f.name).join(', ')} size exceeds 10MB`)
      return
    }

    // Duplicate file check
    const duplicateFiles = files.filter((file) => filesToUpload.some((existingFile) => existingFile.name === file.name))

    if (duplicateFiles.length > 0) {
      toast.error(`File ${duplicateFiles.map((f) => f.name).join(', ')} is already uploaded`)
      return
    }

    // Max file count check
    if (files.length + filesToUpload.length > MAX_FILE_COUNT) {
      toast.error(`You can only upload up to ${MAX_FILE_COUNT} files`)
      return
    }

    const totalIncomingSize = files.reduce((total, file) => total + file.size, 0)
    const totalExistingSize = filesToUpload.reduce((total, file) => total + file.size, 0)
    if (totalIncomingSize + totalExistingSize > MAX_TOTAL_FILE_SIZE_BYTES) {
      toast.error('Total file size cannot exceed 25MB')
      return
    }

    void (async () => {
      const arePdfPagesValid = await validatePdfPageCount(files)
      if (!arePdfPagesValid) {
        return
      }

      setFilesToUpload((prev) => [...prev, ...files])
      await startUpload(files)
    })()
  }

  return {
    isUploading,
    handleFileChange,
    removeFile,
    processFilesAndUpload,
  }
}
