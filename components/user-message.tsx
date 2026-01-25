import { api } from '@/convex/_generated/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getErrorMessage } from '@/lib/convex-error'
import { useChatContext } from '@/lib/stores/chat-store'
import { UIMessageWithMetadata } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMutation } from 'convex/react'
import { Check, Copy, ImageIcon, PaperclipIcon, Pencil, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function BaseUserMessage({ message }: { message: UIMessageWithMetadata }) {
  const hasFiles = message.parts.some((part) => part.type === 'file')

  return (
    <div
      className={cn(
        'bg-muted ml-auto rounded-xl p-2 px-3 wrap-break-word whitespace-pre-wrap',
        hasFiles && 'flex flex-col gap-2'
      )}
    >
      {message.parts.map((part, index) => {
        switch (part.type) {
          case 'text':
            return <span key={index}>{part.text}</span>
          case 'file':
            return (
              <div
                key={part.filename}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-2"
                onClick={() => {
                  window.open(part.url, '_blank')
                }}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {part.mediaType.startsWith('image/') ? (
                    <ImageIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                  ) : (
                    <PaperclipIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{part.filename}</p>
                  </div>
                </div>
              </div>
            )
        }
      })}
    </div>
  )
}

export function UserMessage({ message }: { message: UIMessageWithMetadata }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const { sendMessage, buildBodyAndHeaders, messages: allMessages } = useChatContext()
  const [isEditing, setIsEditing] = useState(false)
  const [editedParts, setEditedParts] = useState(message.parts)
  const [originalParts] = useState(message.parts)
  const editRef = useRef<HTMLTextAreaElement>(null)

  const displayParts = isEditing ? editedParts : message.parts
  const messageContent = displayParts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  const deleteMessages = useMutation(api.delete.deleteMessages)
  const deleteFiles = useMutation(api.storage.deleteFiles)

  const handleEditClick = () => {
    setIsEditing(true)
    setEditedParts(message.parts)
    setTimeout(() => {
      if (editRef.current) {
        editRef.current.focus()
        editRef.current.select()
      }
    }, 0)
  }

  const handleCancel = () => {
    setEditedParts(originalParts)
    setIsEditing(false)
  }

  const handleRemoveFile = (filename: string | undefined) => {
    if (!filename) return
    setEditedParts((prev) => prev.filter((part) => part.type !== 'file' || part.filename !== filename))
  }

  const handleTextChange = (newText: string) => {
    setEditedParts((prev) => prev.map((part) => (part.type === 'text' ? { ...part, text: newText } : part)))
  }

  const handleSend = async () => {
    const editedText = editedParts
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('')

    const editedFiles = editedParts.filter((part) => part.type === 'file')

    if (!editedText && editedFiles.length === 0) {
      toast.error('Message is empty')
      return
    }

    const editingMessageIndex = allMessages.findIndex((m) => m.id === message.id)

    // Find files that were removed (in original but not in edited)
    const originalFiles = originalParts.filter((part) => part.type === 'file')
    const editedFileUrls = editedFiles.map((file) => file.url)
    const removedFiles = originalFiles.filter((file) => !editedFileUrls.includes(file.url))

    // Delete only messages BELOW the current one from DB (not including current message)
    const messagesToDelete = allMessages.slice(editingMessageIndex + 1)

    try {
      if (messagesToDelete.length > 0) {
        deleteMessages({ messageIdsToDelete: messagesToDelete.map((m) => m.id) })
      }

      // Delete removed files from storage
      if (removedFiles.length > 0) {
        deleteFiles({ fileUrls: removedFiles.map((file) => file.url) })
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
      return
    }

    const { body, headers } = buildBodyAndHeaders()

    sendMessage(
      {
        messageId: message.id,
        text: editedText,
        ...(editedFiles.length > 0 && { files: editedFiles }),
      },
      {
        body,
        headers,
      }
    )

    setIsEditing(false)
  }

  return (
    <div className={cn('group ml-auto flex flex-col', isEditing ? 'w-full' : 'w-fit max-w-[85%]')}>
      {isEditing ? (
        <div className="bg-muted w-full rounded-xl p-2 px-3 wrap-break-word whitespace-pre-wrap">
          {displayParts.map((part, index) => {
            switch (part.type) {
              case 'text':
                return (
                  <div className="flex flex-col gap-2" key={index}>
                    <Textarea
                      ref={editRef}
                      value={part.text}
                      onChange={(e) => handleTextChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          handleCancel()
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      className="min-h-15 w-full resize-none border-0 bg-transparent! px-2 shadow-none outline-none focus-visible:ring-0"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleSend}
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                )
              case 'file':
                return (
                  <div
                    key={part.filename}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-2"
                    onClick={() => {
                      window.open(part.url, '_blank')
                    }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {part.mediaType.startsWith('image/') ? (
                        <ImageIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                      ) : (
                        <PaperclipIcon className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{part.filename}</p>
                      </div>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveFile(part.filename)
                      }}
                      aria-label="Remove file"
                    >
                      <XIcon className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                )
            }
          })}
        </div>
      ) : (
        <BaseUserMessage message={message} />
      )}
      <div className="mt-1 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
              onClick={() => {
                copyToClipboard(messageContent)
              }}
            >
              {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span className="sr-only">Copy message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCopied ? 'Copied!' : 'Copy'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" type="button" onClick={handleEditClick}>
              <Pencil className="size-4" />
              <span className="sr-only">Edit message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
