'use client'

import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { cn } from '@/lib/utils'
import { useMutation } from 'convex/react'
import { ChevronDown, ImageIcon, Loader2, Paperclip, Sparkles, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'
import { Textarea } from './ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9'] as const
const IMAGE_SIZES = ['1K', '2K', '4K'] as const

export function ImageGenerationForm() {
  const config = useChatConfigStore((s) => s.config)
  const [prompt, setPrompt] = useState('')
  const imageModels = useMemo(() => AVAILABLE_MODELS.filter((m) => m.imageModel), [])
  const [selectedModel, setSelectedModel] = useState<Model>(imageModels[0])
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>('1:1')
  const [imageSize, setImageSize] = useState<(typeof IMAGE_SIZES)[number]>('1K')
  const isProModel = selectedModel.id === 'google/gemini-3-pro-image-preview'
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createGeneration = useMutation(api.imageGeneration.createImageGeneration)
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const storeFile = useMutation(api.storage.storeFile)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed')
        return
      }
      if (file.size > 4 * 1024 * 1024) {
        toast.error('File size exceeds 4MB')
        return
      }
      setReferenceFile(file)
    }
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!config.apiKey) {
      toast.error('Please set your API key in Settings')
      return
    }

    setIsSubmitting(true)

    try {
      let referenceImageUrl: string | undefined

      if (referenceFile) {
        setIsUploading(true)
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': referenceFile.type },
          body: referenceFile,
        })
        const { storageId } = await result.json()
        referenceImageUrl = await storeFile({ fileId: storageId })
        setIsUploading(false)
      }

      await createGeneration({
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        model: selectedModel.id,
        aspectRatio,
        imageSize: isProModel ? imageSize : undefined,
        referenceImageUrl,
        apiKey: config.apiKey,
      })

      setPrompt('')
      setReferenceFile(null)
      toast.success('Image generation started!')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  return (
    <form
      className={cn('border-border bg-background mx-auto w-full max-w-3xl rounded-xl border p-2 px-2 shadow-xs')}
      onSubmit={handleSubmit}
    >
      {referenceFile && (
        <div className="flex flex-wrap gap-2 px-2 pb-3">
          <div className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-2">
            <div className="flex items-center gap-3 overflow-hidden">
              {isUploading ? (
                <Loader2 className="size-4 shrink-0 animate-spin opacity-60" />
              ) : (
                <ImageIcon className="size-4 shrink-0 opacity-60" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{referenceFile.name}</p>
              </div>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
              onClick={() => setReferenceFile(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Textarea
        autoFocus
        className="placeholder:text-muted-foreground max-h-60 min-h-15 w-full resize-none border-0 bg-transparent! px-1 text-[15px]! shadow-none focus-visible:ring-0"
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        placeholder="Describe the image you want to generate..."
        value={prompt}
      />

      <div className="flex items-center justify-between px-1 pt-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="icon-sm"
                type="button"
                variant="outline"
                className="rounded-full font-normal"
              >
                <Paperclip className="size-5" />
                <span className="sr-only">Attach reference image</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach reference image</p>
            </TooltipContent>
          </Tooltip>
          <input accept="image/*" className="hidden" onChange={handleFileChange} ref={fileInputRef} type="file" />
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="font-normal">
                {selectedModel.name}
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {imageModels.map((model) => (
                <DropdownMenuItem key={model.id} onClick={() => setSelectedModel(model)}>
                  {model.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="font-normal">
                {aspectRatio}
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {ASPECT_RATIOS.map((ratio) => (
                <DropdownMenuItem key={ratio} onClick={() => setAspectRatio(ratio)}>
                  {ratio}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {isProModel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="font-normal">
                  {imageSize}
                  <ChevronDown className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {IMAGE_SIZES.map((size) => (
                  <DropdownMenuItem key={size} onClick={() => setImageSize(size)}>
                    {size}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button className="rounded-full" disabled={isSubmitting || !prompt.trim()} size="icon-sm" type="submit">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span className="sr-only">Generate</span>
          </Button>
        </div>
      </div>
    </form>
  )
}
