'use client'

import type { ChatRequest } from '@/app/api/chat/route'
import { api } from '@/convex/_generated/api'
import { useChatIdSync } from '@/hooks/use-chat-id-sync'
import type { Model } from '@/lib/models'
import type { UIMessageWithMetadata } from '@/lib/types'
import { useQueryWithStatus } from '@/lib/utils'
import { useChat, type UseChatHelpers } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import { useConvexAuth } from 'convex/react'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useChatConfigStore } from './chat-config-store'

export type ChatState = {
  input: string
  setInput: (input: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  filesToSend: FileUIPart[]
  setFilesToSend: React.Dispatch<React.SetStateAction<FileUIPart[]>>
  filesToUpload: File[]
  setFilesToUpload: React.Dispatch<React.SetStateAction<File[]>>
  isStreaming: boolean
  messages: UIMessageWithMetadata[]
  sendMessage: UseChatHelpers<UIMessageWithMetadata>['sendMessage']
  status: UseChatHelpers<UIMessageWithMetadata>['status']
  regenerate: UseChatHelpers<UIMessageWithMetadata>['regenerate']
  stop: UseChatHelpers<UIMessageWithMetadata>['stop']
  isLoadingMessages: boolean
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  error: UseChatHelpers<UIMessageWithMetadata>['error']
  clearError: UseChatHelpers<UIMessageWithMetadata>['clearError']
  buildBodyAndHeaders: () => {
    body: { chatId: string; model: Model; isNewChat: boolean }
    headers: { 'X-API-Key': string }
  }
}

const ChatContext = createContext<ChatState | undefined>(undefined)

export function ChatProvider({ children, paramsChatId }: { children: React.ReactNode; paramsChatId: string }) {
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()

  // Get config from zustand store
  const config = useChatConfigStore((s) => s.config)
  const isHydrated = useChatConfigStore((s) => s.isHydrated)
  const updateDraftMessageEntry = useChatConfigStore((s) => s.updateDraftMessageEntry)
  const clearDraftMessageEntry = useChatConfigStore((s) => s.clearDraftMessageEntry)

  // Use the hook to manage chatId sync
  const chatId = useChatIdSync()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [filesToSend, setFilesToSend] = useState<FileUIPart[]>([])
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])

  const {
    data: initialMessages,
    isPending,
    isError,
  } = useQueryWithStatus(api.chat.getChatMessages, paramsChatId && isAuthenticated ? { chatId: paramsChatId } : 'skip')

  useEffect(() => {
    if (isError) {
      toast.error(`Chat ${paramsChatId} not found`)
      router.push('/')
    }
  }, [isError, router, paramsChatId])

  const { messages, sendMessage, status, setMessages, regenerate, stop, error, clearError } =
    useChat<UIMessageWithMetadata>({
      id: chatId,
      transport: new DefaultChatTransport({
        api: '/api/chat',
      }),
      onError: (error) => {
        try {
          const errorData = JSON.parse(error.message)
          toast.error(errorData.error || error.message)
        } catch {
          toast.error(error.message)
        }
      },
    })

  // Load initial messages when viewing an existing chat
  useEffect(() => {
    if (paramsChatId && initialMessages) {
      setMessages(initialMessages)
    }
  }, [initialMessages, paramsChatId, setMessages])

  // Load draft message and files only once on mount when on homepage
  const hasLoadedDraftRef = useRef(false)
  useEffect(() => {
    if (isHydrated && !paramsChatId && config.draftMessageEntry && !hasLoadedDraftRef.current) {
      setInput(config.draftMessageEntry.message)
      setFilesToSend(config.draftMessageEntry.files)

      const reconstructedFiles = config.draftMessageEntry.files.map((file) => {
        return new File([], file.filename, { type: file.mediaType })
      })
      setFilesToUpload(reconstructedFiles)

      hasLoadedDraftRef.current = true
    }
  }, [isHydrated, paramsChatId, config.draftMessageEntry])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    if (!paramsChatId && hasLoadedDraftRef.current) {
      updateDraftMessageEntry(value, filesToSend)
    }
  }

  // Persist filesToSend whenever they change
  useEffect(() => {
    if (isHydrated && !paramsChatId && hasLoadedDraftRef.current) {
      updateDraftMessageEntry(input, filesToSend)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, filesToSend, paramsChatId, input])

  const isStreaming = status === 'streaming' || status === 'submitted'

  const buildBodyAndHeaders = useCallback(() => {
    const isFirstMessage = messages.length === 0
    return {
      body: {
        chatId,
        model: config.selectedModel,
        isNewChat: isFirstMessage,
      } satisfies Omit<ChatRequest, 'messages'>,
      headers: {
        'X-API-Key': config.apiKey,
      },
    }
  }, [chatId, config, messages])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isAuthenticated) {
      toast.error('Please sign in to chat')
      return
    }

    if (!input.trim() || isStreaming) {
      return
    }

    if (!config.apiKey) {
      toast.error('Please set your API key in Settings')
      return
    }

    if (messages.length === 0) {
      window.history.replaceState({}, '', `/chat/${chatId}`)
    }

    const { body, headers } = buildBodyAndHeaders()

    sendMessage(
      {
        text: input,
        files: filesToSend,
      },
      {
        body,
        headers,
      }
    )

    setInput('')
    setFilesToSend([])
    setFilesToUpload([])
    if (!paramsChatId) {
      clearDraftMessageEntry()
    }
  }

  return (
    <ChatContext.Provider
      value={{
        input,
        setInput,
        inputRef,
        handleInputChange,
        filesToSend,
        setFilesToSend,
        filesToUpload,
        setFilesToUpload,
        isStreaming,
        messages,
        sendMessage,
        status,
        regenerate,
        stop,
        isLoadingMessages: isPending && !!paramsChatId && !!isAuthenticated,
        handleSubmit,
        error,
        clearError,
        buildBodyAndHeaders,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
