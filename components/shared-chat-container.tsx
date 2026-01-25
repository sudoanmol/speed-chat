'use client'

import { BaseAssistantMessage } from '@/components/assistant-message'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BaseUserMessage } from '@/components/user-message'
import { api } from '@/convex/_generated/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getErrorMessage } from '@/lib/convex-error'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import { generateId } from '@/lib/stores/chat-config-store'
import type { UIMessageWithMetadata } from '@/lib/types'
import { type Preloaded, useConvexAuth, useMutation, usePreloadedQuery } from 'convex/react'
import { Check, Copy, GitFork, Info, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Header } from './header'

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

  useEffect(() => {
    document.title = `${chatData.title} | Speed Chat`
  }, [chatData])

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
                return (
                  <div key={message.id} className="group ml-auto flex max-w-[85%] flex-col">
                    <BaseUserMessage message={message} />
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
                    </div>
                  </div>
                )
              }

              if (message.role === 'assistant') {
                return (
                  <div key={message.id} className="group">
                    <BaseAssistantMessage message={message} isAnimating={false} />
                    <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            type="button"
                            onClick={() => copyToClipboard(messageContent)}
                          >
                            {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                            <span className="sr-only">Copy message</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{isCopied ? 'Copied!' : 'Copy'}</TooltipContent>
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

              return null
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
