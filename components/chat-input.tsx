'use client'

import { useAttachments } from '@/hooks/use-attachments'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useChatContext } from '@/lib/stores/chat-store'
import { cn } from '@/lib/utils'
import { useConvexAuth } from 'convex/react'
import { ArrowUp, ChevronDown, Paperclip, Square } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { MemoizedFilePreview } from './file-preview'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Textarea } from './ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function ChatInput({
  isDragActive,
  droppedFiles,
  setDroppedFiles,
  noActiveChat,
}: {
  isDragActive: boolean
  droppedFiles: File[]
  setDroppedFiles: React.Dispatch<React.SetStateAction<File[]>>
  noActiveChat: boolean
}) {
  const { isAuthenticated } = useConvexAuth()
  const {
    input,
    inputRef,
    handleInputChange,
    handleSubmit,
    status,
    isStreaming,
    stop,
    filesToSend,
    setFilesToSend,
    filesToUpload,
    setFilesToUpload,
  } = useChatContext()
  const config = useChatConfigStore((s) => s.config)
  const updateConfig = useChatConfigStore((s) => s.updateConfig)
  const isHydrated = useChatConfigStore((s) => s.isHydrated)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { handleFileChange, removeFile, isUploading, processFilesAndUpload } = useAttachments({
    filesToSend,
    setFilesToSend,
    setFilesToUpload,
  })

  // Process dropped files when they arrive
  useEffect(() => {
    if (droppedFiles.length > 0) {
      if (!config.selectedModel.supportsAttachment) {
        toast.error(`${config.selectedModel.name} does not support file attachments`)
        setDroppedFiles([])
        return
      }
      processFilesAndUpload(droppedFiles)
      setDroppedFiles([])
    }
  }, [droppedFiles, processFilesAndUpload, setDroppedFiles, config.selectedModel])

  // Provider display names
  const providerDisplayNames: Record<Model['provider'], string> = {
    google: 'Google',
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    'z-ai': 'Z-AI',
    moonshotai: 'Moonshot AI',
  }

  // Group models by provider (excluding image models)
  const modelsByProvider = useMemo(() => {
    const grouped = new Map<Model['provider'], Model[]>()
    for (const model of AVAILABLE_MODELS) {
      if (model.imageModel) continue
      const existing = grouped.get(model.provider) ?? []
      grouped.set(model.provider, [...existing, model])
    }
    return grouped
  }, [])

  return (
    <form
      className={cn(
        'border-border bg-background mx-auto w-full max-w-3xl border p-2 px-2 shadow-xs transition-colors',
        isDragActive && 'border-primary',
        noActiveChat ? 'rounded-xl' : 'rounded-t-xl'
      )}
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(e)
        setFilesToUpload([])
      }}
    >
      {filesToUpload.length > 0 && (
        <MemoizedFilePreview
          filesToSend={filesToSend}
          filesToUpload={filesToUpload}
          isUploading={isUploading}
          removeFile={removeFile}
        />
      )}
      <Textarea
        autoFocus
        className="placeholder:text-muted-foreground max-h-60 min-h-15 w-full resize-none border-0 bg-transparent! px-1 text-[15px]! shadow-none focus-visible:ring-0"
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        placeholder="Ask anything..."
        ref={inputRef}
        value={input}
      />
      <div className="flex items-center justify-between px-1 pt-2">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error('Please sign in to attach files')
                    return
                  }
                  if (!config.selectedModel.supportsAttachment) {
                    toast.error(`${config.selectedModel.name} does not support file attachments`)
                    return
                  }
                  fileInputRef.current?.click()
                }}
                size="icon-sm"
                type="button"
                variant="outline"
                className="rounded-full font-normal"
              >
                <Paperclip className="size-5" />
                <span className="sr-only">Attach files</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach files</p>
            </TooltipContent>
          </Tooltip>
          <input
            accept="image/*, application/pdf"
            className="hidden"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="font-normal" suppressHydrationWarning>
                {!isHydrated ? 'Loading...' : config.selectedModel.name}
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit rounded-xl p-2" align="end">
              {Array.from(modelsByProvider.entries()).map(([provider, models]) => (
                <DropdownMenuSub key={provider}>
                  <DropdownMenuSubTrigger className="rounded-lg">
                    {providerDisplayNames[provider]}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="rounded-xl p-1">
                      {models.map((model) => (
                        <DropdownMenuItem
                          className="rounded-lg"
                          key={`${model.id}-${model.thinking}`}
                          onClick={() => {
                            if (!model.supportsAttachment && filesToUpload.length > 0) {
                              toast.error(`${model.name} does not support file attachments. Remove files first.`)
                              return
                            }
                            updateConfig({ selectedModel: model })
                          }}
                        >
                          {model.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="rounded-full"
            disabled={status === 'ready' && !input.trim()}
            size="icon-sm"
            type={isStreaming ? 'button' : 'submit'}
            onClick={isStreaming ? stop : undefined}
          >
            {isStreaming ? <Square className="size-4" /> : <ArrowUp className="size-4" />}
            <span className="sr-only">{isStreaming ? 'Stop' : 'Send message'}</span>
          </Button>
        </div>
      </div>
    </form>
  )
}
