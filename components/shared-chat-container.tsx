'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/convex/_generated/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getErrorMessage } from '@/lib/convex-error'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import { generateId } from '@/lib/stores/chat-config-store'
import type { UIMessageWithMetadata } from '@/lib/types'
import type { ExaSearchResult } from '@exalabs/ai-sdk'
import { getToolName, isToolUIPart, type FileUIPart } from 'ai'
import { useConvexAuth, useMutation, usePreloadedQuery, type Preloaded } from 'convex/react'
import { Check, Copy, ExternalLink, GitFork, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useDocumentTitle } from 'usehooks-ts'
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
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from './ai-elements/tool'
import { Header } from './header'

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

type SharedChatContainerProps = {
  preloadedChat: Preloaded<typeof api.chat.getSharedChat>
}

export function SharedChatContainer({ preloadedChat }: SharedChatContainerProps) {
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const { chatData, messages } = usePreloadedQuery(preloadedChat)
  const forkChat = useMutation(api.chatActions.forkChat)
  const [isForking, setIsForking] = useState(false)
  const { isCopied, copyToClipboard } = useCopyToClipboard()

  useDocumentTitle(`${chatData.title} | Speed Chat`)

  const handleFork = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to fork this chat')
      return
    }

    setIsForking(true)
    try {
      const newChatId = generateId()
      await forkChat({ chatId: chatData.id, newChatId })
      toast.success('Chat forked successfully')
      router.push(`/chat/${newChatId}`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsForking(false)
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Header />
      <ScrollArea className="min-h-0 flex-1 px-4 md:px-0">
        <div className="mx-auto w-full max-w-3xl">
          <Alert className="mx-auto mt-16 mb-8 w-full max-w-186.25">
            <Info />
            <AlertTitle>You are viewing a shared chat</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span className="text-xs">
                {chatData.isOwner ? 'Edit your chat to make changes' : 'Fork this chat to make your own copy'}
              </span>
              {chatData.isOwner ? (
                <Button asChild size="sm" variant="outline" className="text-primary text-xs">
                  <Link href={`/chat/${chatData.id}`}>Edit chat</Link>
                </Button>
              ) : (
                <Button onClick={handleFork} disabled={isForking} size="sm" className="text-xs">
                  {isForking ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      Forking...
                    </>
                  ) : (
                    <>
                      <GitFork className="size-3" />
                      Fork chat
                    </>
                  )}
                </Button>
              )}
            </AlertDescription>
          </Alert>

          <div className="mx-auto max-w-186.25 space-y-4 pb-8 text-[14.5px]">
            {messages.map((message: UIMessageWithMetadata) => {
              const messageContent = message.parts
                .filter((part) => part.type === 'text')
                .map((part) => part.text)
                .join('')

              if (message.role === 'user') {
                const textParts = message.parts.filter((part) => part.type === 'text')
                const fileParts = message.parts.filter((part) => part.type === 'file') as FileUIPart[]

                return (
                  <Message key={message.id} from="user">
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
                      <MessageAction
                        tooltip={isCopied ? 'Copied!' : 'Copy'}
                        onClick={() => copyToClipboard(messageContent)}
                      >
                        {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </MessageAction>
                    </MessageActions>
                  </Message>
                )
              }

              if (message.role === 'assistant') {
                return (
                  <Message key={message.id} from="assistant">
                    <MessageContent className="wrap-break-word whitespace-pre-wrap">
                      {message.parts.map((part, index) => {
                        const id = `${message.id}-${part.type}-${index}`

                        switch (part.type) {
                          case 'reasoning':
                            return (
                              <Reasoning key={id} isStreaming={false}>
                                <ReasoningTrigger />
                                <ReasoningContent>{part.text}</ReasoningContent>
                              </Reasoning>
                            )

                          case 'text':
                            return (
                              <MessageResponse key={id} isAnimating={false}>
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
                                    {part.state === 'output-error' && (
                                      <ToolOutput output={undefined} errorText={part.errorText} />
                                    )}
                                  </ToolContent>
                                </Tool>
                              )
                            }
                            return null
                        }
                      })}
                    </MessageContent>
                    <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100">
                      <MessageAction
                        tooltip={isCopied ? 'Copied!' : 'Copy'}
                        onClick={() => copyToClipboard(messageContent)}
                      >
                        {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
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

              return null
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
