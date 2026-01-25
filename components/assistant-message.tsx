import { api } from '@/convex/_generated/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getErrorMessage } from '@/lib/convex-error'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useChatContext } from '@/lib/stores/chat-store'
import { UIMessageWithMetadata } from '@/lib/types'
import type { ExaSearchResult } from '@exalabs/ai-sdk'
import { useMutation } from 'convex/react'
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Streamdown } from 'streamdown'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

type AssistantMessageProps = {
  message: UIMessageWithMetadata
  isAnimating: boolean
}

export function BaseAssistantMessage({ message, isAnimating }: AssistantMessageProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <div className="space-y-2 wrap-break-word whitespace-pre-wrap">
      {message.parts.map((part, index) => {
        const id = `${message.id}-${part.type}-${index}`

        switch (part.type) {
          case 'reasoning':
            return (
              <div key={id} className="mb-6 w-full space-y-3">
                <Collapsible open={openItems[id]} onOpenChange={() => toggleItem(id)}>
                  <CollapsibleTrigger className="text-muted-foreground flex w-full items-center justify-between text-sm font-normal hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <Brain className="text-primary size-4" />
                      <span>{part.state === 'streaming' ? 'Reasoning' : 'View reasoning'}</span>
                    </div>
                    <ChevronDown className={`size-4 transition-transform ${openItems[id] ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="text-muted-foreground w-full space-y-2 pt-4 text-sm">
                    <Streamdown isAnimating={isAnimating}>{part.text}</Streamdown>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )
          case 'text':
            return (
              <Streamdown key={id} isAnimating={isAnimating}>
                {part.text}
              </Streamdown>
            )
          case 'tool-webSearch':
            const webSearchToolOutput = (part.output as { results: ExaSearchResult[] })?.results || []
            const webSearchQuery = (part.input as { query: string })?.query || ''

            switch (part.state) {
              case 'input-available':
                return (
                  <div
                    key={id}
                    className="border-border/50 bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
                    <span>Searching the web for &ldquo;{webSearchQuery}&rdquo;</span>
                  </div>
                )
              case 'output-available':
                return (
                  <div key={id} className="mb-6 w-full space-y-3">
                    <Collapsible open={openItems[id]} onOpenChange={() => toggleItem(id)}>
                      <CollapsibleTrigger className="text-muted-foreground flex w-full items-center justify-between text-sm font-normal hover:bg-transparent">
                        <div className="flex items-center gap-2">
                          <Search className="text-primary size-4" />
                          <span>
                            Searched for{' '}
                            <span className="text-foreground font-medium">&ldquo;{webSearchQuery}&rdquo;</span>
                          </span>
                        </div>
                        <ChevronDown className={`size-4 transition-transform ${openItems[id] ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="w-full space-y-2 pt-2">
                        {webSearchToolOutput.map((result, index) => (
                          <Link
                            key={result.id || index}
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
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )
              case 'output-error':
                return (
                  <div
                    key={id}
                    className="border-border/50 bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <AlertCircle className="size-4 shrink-0 text-red-500" />
                    <span>Error searching the web for &ldquo;{webSearchQuery}&rdquo;</span>
                  </div>
                )
            }
            return null
        }
      })}
    </div>
  )
}

export function AssistantMessage({ message, isAnimating }: AssistantMessageProps) {
  const router = useRouter()
  const { isCopied, copyToClipboard } = useCopyToClipboard()
  const chatId = useChatConfigStore((s) => s.chatId)
  const { regenerate, messages: allMessages, buildBodyAndHeaders } = useChatContext()

  const deleteMessages = useMutation(api.delete.deleteMessages)
  const branchOffFromMessage = useMutation(api.chatActions.branchOffFromMessage)

  const isLastMessage = allMessages[allMessages.length - 1].id === message.id
  const messageContent = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')

  return (
    <div className="group">
      <BaseAssistantMessage message={message} isAnimating={isAnimating} />
      <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" type="button" onClick={() => copyToClipboard(messageContent)}>
              {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span className="sr-only">Copy message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCopied ? 'Copied!' : 'Copy'}</TooltipContent>
        </Tooltip>
        {isLastMessage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                onClick={() => {
                  try {
                    deleteMessages({ messageIdsToDelete: [message.id] })
                  } catch (error) {
                    toast.error(getErrorMessage(error))
                  }
                  const { body, headers } = buildBodyAndHeaders()
                  regenerate({
                    body,
                    headers,
                  })
                }}
              >
                <RefreshCw className="size-4" />
                <span className="sr-only">Regenerate</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              type="button"
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
              <span className="sr-only">Branch</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Branch</TooltipContent>
        </Tooltip>
        {message.metadata && (
          <span className="text-muted-foreground text-xs">
            Generated by{' '}
            <span className="font-medium">
              {AVAILABLE_MODELS.find((model: Model) => model.id === message.metadata?.modelId)?.name}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
