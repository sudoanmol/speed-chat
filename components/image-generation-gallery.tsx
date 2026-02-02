'use client'

import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import { useMutation } from 'convex/react'
import { FunctionReturnType } from 'convex/server'
import { Download, ImageIcon, Loader2, Trash2, XCircle } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

type Generation = FunctionReturnType<typeof api.imageGeneration.getUserGenerations>['page'][number]

export function ImageGenerationGallery({ generations, isLoading }: { generations: Generation[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    )
  }

  if (generations.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
        <ImageIcon className="mb-4 size-12 opacity-50" />
        <p>No images generated yet</p>
        <p className="text-sm">Create your first image above!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {generations.map((generation, index) => (
        <GenerationCard key={generation.id} generation={generation} isPriority={index === 0} />
      ))}
    </div>
  )
}

function GenerationCard({ generation, isPriority }: { generation: Generation; isPriority: boolean }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteGeneration = useMutation(api.imageGeneration.deleteGeneration)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteGeneration({ generationId: generation.id })
      toast.success('Image deleted')
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (generation.resultImageUrl) {
      try {
        const response = await fetch(generation.resultImageUrl)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `generated-${generation.id}.png`
        link.click()
        URL.revokeObjectURL(blobUrl)
      } catch {
        toast.error('Failed to download image')
      }
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) {
      handleDelete()
    } else {
      setShowDeleteDialog(true)
    }
  }

  return (
    <>
      <div className="group relative aspect-square overflow-hidden rounded-lg border">
        {generation.status === 'completed' && generation.resultImageUrl ? (
          <>
            <Image
              src={generation.resultImageUrl}
              alt={generation.prompt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="cursor-pointer object-cover"
              priority={isPriority}
              onClick={() => window.open(generation.resultImageUrl, '_blank')}
            />
            <div className="pointer-events-none absolute inset-0 flex items-end bg-linear-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex w-full items-center justify-between p-3">
                <p className="line-clamp-2 flex-1 text-xs text-white">{generation.prompt}</p>
                <div className="pointer-events-auto flex gap-1">
                  <Button size="icon-sm" variant="secondary" onClick={handleDownload}>
                    <Download className="size-3" />
                  </Button>
                  <Button size="icon-sm" variant="destructive" onClick={handleDeleteClick}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : generation.status === 'failed' ? (
          <div className="bg-destructive/10 flex h-full flex-col items-center justify-center p-4 text-center">
            <XCircle className="text-destructive mb-2 size-8" />
            <p className="text-destructive text-xs">{generation.errorMessage || 'Failed'}</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={handleDeleteClick}>
              <Trash2 className="mr-1 size-3" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="bg-muted flex h-full flex-col items-center justify-center p-4">
            <Loader2 className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground mt-2 text-xs">
              {generation.status === 'pending' ? 'Queued...' : 'Generating...'}
            </p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{generation.prompt}</p>
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </>
  )
}
