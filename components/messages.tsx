'use client'

import { api } from '@/convex/_generated/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getErrorMessage } from '@/lib/convex-error'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useChatContext } from '@/lib/stores/chat-store'
import { UIMessageWithMetadata } from '@/lib/types'
import type { ExaSearchResult } from '@exalabs/ai-sdk'
import { getToolName, isToolUIPart, type FileUIPart } from 'ai'
import { useMutation } from 'convex/react'
import { Check, Copy, ExternalLink, GitBranch, ImageIcon, PaperclipIcon, Pencil, RefreshCw, XIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
  MessageResponse,
} from './ai-elements/message'
import { Reasoning, ReasoningContent, ReasoningTrigger } from './ai-elements/reasoning'
import { Shimmer } from './ai-elements/shimmer'
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from './ai-elements/tool'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

function WebSearchResults({ output }: { output: { results: ExaSearchResult[] } }) {
  const results = output?.results || []

  if (results.length === 0) {
    return <div className="text-muted-foreground p-4 text-sm">No results found</div>
  }

  return (
    <div className="space-y-2 p-4">
      <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Results</h4>
      <div className="space-y-2">
        {results.map((result, idx) => (
          <Link
            key={result.id || idx}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border/50 bg-muted/30 hover:bg-muted/50 block w-full rounded-lg border p-3 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-foreground line-clamp-2 text-sm font-medium">{result.title}</h4>
                  {result.publishedDate && (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {new Date(result.publishedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{result.text}</p>
                <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                  <span className="truncate text-blue-500 dark:text-blue-400">{result.url}</span>
                  <ExternalLink className="size-3 shrink-0" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Messages() {
  const { messages, status } = useChatContext()

  return (
    <div className="mx-auto w-full max-w-186.25 space-y-4 pt-16 pb-8 text-[14.5px]">
      {messages.map((message, messageIndex) => {
        const isLastMessage = messageIndex === messages.length - 1

        if (message.role === 'user') {
          return <UserMessage key={message.id} message={message} />
        }

        if (message.role === 'assistant') {
          return (
            <AssistantMessage
              key={message.id}
              message={message}
              isAnimating={status === 'streaming'}
              isLastMessage={isLastMessage}
            />
          )
        }
      })}
    </div>
  )
}

function UserMessage({ message }: { message: UIMessageWithMetadata }) {
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

  const textParts = displayParts.filter((part) => part.type === 'text')
  const fileParts = displayParts.filter((part) => part.type === 'file') as FileUIPart[]

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

    const originalFiles = originalParts.filter((part) => part.type === 'file')
    const editedFileUrls = editedFiles.map((file) => file.url)
    const removedFiles = originalFiles.filter((file) => !editedFileUrls.includes(file.url))

    const messagesToDelete = allMessages.slice(editingMessageIndex + 1)

    try {
      if (messagesToDelete.length > 0) {
        deleteMessages({ messageIdsToDelete: messagesToDelete.map((m) => m.id) })
      }

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

  if (isEditing) {
    return (
      <Message from="user" className="max-w-full">
        <MessageContent className="w-full max-w-full">
          {fileParts.map((part) => (
            <div
              key={part.filename}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-4 py-2"
              onClick={() => window.open(part.url, '_blank')}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {part.mediaType?.startsWith('image/') ? (
                  <ImageIcon className="size-4 shrink-0 opacity-60" />
                ) : (
                  <PaperclipIcon className="size-4 shrink-0 opacity-60" />
                )}
                <p className="truncate text-[13px] font-medium">{part.filename}</p>
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
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ))}
          <Textarea
            ref={editRef}
            value={textParts.map((p) => p.text).join('')}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCancel()
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="min-h-15 w-full resize-none border-0 bg-transparent! px-2 shadow-none outline-none focus-visible:ring-0"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={handleSend}>
              Send
            </Button>
          </div>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message from="user">
      {fileParts.length > 0 && (
        <MessageAttachments>
          {fileParts.map((part) => (
            <MessageAttachment
              key={part.filename}
              data={part}
              onClick={() => window.open(part.url, '_blank')}
              className="cursor-pointer"
            />
          ))}
        </MessageAttachments>
      )}
      <MessageContent className="wrap-break-word whitespace-pre-wrap">
        {textParts.map((part, i) => (
          <span key={i}>{part.text}</span>
        ))}
      </MessageContent>
      <MessageActions className="justify-end opacity-0 transition-opacity group-hover:opacity-100">
        <MessageAction tooltip={isCopied ? 'Copied!' : 'Copy'} onClick={() => copyToClipboard(messageContent)}>
          {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </MessageAction>
        <MessageAction tooltip="Edit" onClick={handleEditClick}>
          <Pencil className="size-4" />
        </MessageAction>
      </MessageActions>
    </Message>
  )
}

type AssistantMessageProps = {
  message: UIMessageWithMetadata
  isAnimating: boolean
  isLastMessage: boolean
}

function AssistantMessage({ message, isAnimating, isLastMessage }: AssistantMessageProps) {
  const router = useRouter()
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const chatId = useChatConfigStore((s) => s.chatId)
  const { regenerate, buildBodyAndHeaders } = useChatContext()

  const deleteMessages = useMutation(api.delete.deleteMessages)
  const branchOffFromMessage = useMutation(api.chatActions.branchOffFromMessage)

  const messageContent = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  const hasContent = message.parts.some(
    (part) => part.type === 'text' || part.type === 'reasoning' || part.type.startsWith('tool-')
  )

  return (
    <Message from="assistant">
      <MessageContent className="wrap-break-word whitespace-pre-wrap">
        {!hasContent && isAnimating && <Shimmer>Processing message...</Shimmer>}
        {message.parts.map((part, index) => {
          const id = `${message.id}-${part.type}-${index}`

          switch (part.type) {
            case 'reasoning':
              return (
                <Reasoning key={id} isStreaming={part.state === 'streaming'}>
                  <ReasoningTrigger />
                  <ReasoningContent>{part.text}</ReasoningContent>
                </Reasoning>
              )

            case 'text':
              return (
                <MessageResponse key={id} isAnimating={isAnimating}>
                  {part.text}
                </MessageResponse>
              )

            default:
              if (isToolUIPart(part)) {
                const toolName = getToolName(part)
                const isWebSearch = part.type === 'tool-webSearch'

                return (
                  <Tool key={id}>
                    <ToolHeader title={toolName} type={part.type} state={part.state} />
                    <ToolContent>
                      <ToolInput input={part.input} />
                      {part.state === 'output-available' &&
                        (isWebSearch ? (
                          <WebSearchResults output={part.output as { results: ExaSearchResult[] }} />
                        ) : (
                          <ToolOutput output={part.output} errorText={undefined} />
                        ))}
                      {part.state === 'output-error' && <ToolOutput output={undefined} errorText={part.errorText} />}
                    </ToolContent>
                  </Tool>
                )
              }
              return null
          }
        })}
      </MessageContent>
      <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
        <MessageAction tooltip={isCopied ? 'Copied!' : 'Copy'} onClick={() => copyToClipboard(messageContent)}>
          {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </MessageAction>
        {isLastMessage && (
          <MessageAction
            tooltip="Regenerate"
            onClick={() => {
              try {
                deleteMessages({ messageIdsToDelete: [message.id] })
              } catch (error) {
                toast.error(getErrorMessage(error))
              }
              const { body, headers } = buildBodyAndHeaders()
              regenerate({ body, headers })
            }}
          >
            <RefreshCw className="size-4" />
          </MessageAction>
        )}
        <MessageAction
          tooltip="Branch"
          onClick={() => {
            toast.promise(branchOffFromMessage({ parentChatId: chatId, messageId: message.id }), {
              loading: 'Branching off from message...',
              success: (branchChatId) => {
                router.push(`/chat/${branchChatId}`)
                return 'Message branched off successfully'
              },
              error: (error) => getErrorMessage(error),
            })
          }}
        >
          <GitBranch className="size-4" />
        </MessageAction>
        {message.metadata && (
          <span className="text-muted-foreground text-xs">
            Generated by{' '}
            <span className="font-medium">
              {AVAILABLE_MODELS.find((model: Model) => model.id === message.metadata?.modelId)?.name}
            </span>
          </span>
        )}
      </MessageActions>
    </Message>
  )
}
