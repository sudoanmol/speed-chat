'use client'

import type { ChatRequest } from '@/app/api/chat/route'
import { api } from '@/convex/_generated/api'
import { useChatIdSync } from '@/hooks/use-chat-id-sync'
import { AVAILABLE_MODELS, type Model } from '@/lib/models'
import type { UIMessageWithMetadata } from '@/lib/types'
import { useQueryWithStatus } from '@/lib/utils'
import { useChat, type UseChatHelpers } from '@ai-sdk/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type FileUIPart } from 'ai'
import { useConvexAuth } from 'convex/react'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useChatConfigStore } from './chat-config-store'
import { useCustomInstructionsStore } from './custom-instructions-store'

export type ChatState = {
  input: string
  setInput: (input: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  filesToSend: FileUIPart[]
  setFilesToSend: React.Dispatch<React.SetStateAction<FileUIPart[]>>
  filesToUpload: File[]
  setFilesToUpload: React.Dispatch<React.SetStateAction<File[]>>
  currentModel: Model
  setCurrentModel: (model: Model) => void
  isStreaming: boolean
  messages: UIMessageWithMetadata[]
  sendMessage: UseChatHelpers<UIMessageWithMetadata>['sendMessage']
  status: UseChatHelpers<UIMessageWithMetadata>['status']
  regenerate: UseChatHelpers<UIMessageWithMetadata>['regenerate']
  stop: UseChatHelpers<UIMessageWithMetadata>['stop']
  addToolOutput: UseChatHelpers<UIMessageWithMetadata>['addToolOutput']
  isLoadingMessages: boolean
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  error: UseChatHelpers<UIMessageWithMetadata>['error']
  clearError: UseChatHelpers<UIMessageWithMetadata>['clearError']
}

const ChatContext = createContext<ChatState | undefined>(undefined)

const getLastAssistantModel = (messages: UIMessageWithMetadata[]): Model | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message.role !== 'assistant' || !message.metadata) {
      continue
    }
    const metadata = message.metadata

    const matchedModel = AVAILABLE_MODELS.find(
      (candidate) => !candidate.imageModel && candidate.name === metadata.modelName
    )

    if (matchedModel) {
      return matchedModel
    }
  }

  return null
}

export function ChatProvider({ children, paramsChatId }: { children: React.ReactNode; paramsChatId: string }) {
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()

  // Get config from zustand store
  const config = useChatConfigStore((s) => s.config)
  const isHydrated = useChatConfigStore((s) => s.isHydrated)
  const updateConfig = useChatConfigStore((s) => s.updateConfig)
  const updateDraftMessageEntry = useChatConfigStore((s) => s.updateDraftMessageEntry)
  const clearDraftMessageEntry = useChatConfigStore((s) => s.clearDraftMessageEntry)
  const customInstructions = useCustomInstructionsStore((s) => s.customInstructions)

  // Use the hook to manage chatId sync
  const chatId = useChatIdSync()

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')
  const [filesToSend, setFilesToSend] = useState<FileUIPart[]>([])
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [currentModel, setCurrentModelState] = useState<Model>(config.selectedModel)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const requestContextRef = useRef({
    chatId,
    model: currentModel,
    apiKey: config.apiKey,
    customInstructions,
  })

  useEffect(() => {
    requestContextRef.current = {
      chatId,
      model: currentModel,
      apiKey: config.apiKey,
      customInstructions,
    }
  }, [chatId, currentModel, config.apiKey, customInstructions])

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

  const { messages, sendMessage, status, setMessages, regenerate, stop, addToolOutput, error, clearError } =
    useChat<UIMessageWithMetadata>({
      id: chatId,
      transport: new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ trigger, messageId, messages, headers }) => {
          const nextHeaders = new Headers(headers)
          const apiKey = requestContextRef.current.apiKey

          if (apiKey) {
            nextHeaders.set('X-API-Key', apiKey)
          }

          const isNewChat =
            trigger === 'submit-message' &&
            messageId === undefined &&
            messages.length === 1 &&
            messages[0]?.role === 'user'

          return {
            headers: nextHeaders,
            body: {
              messages,
              chatId: requestContextRef.current.chatId,
              model: requestContextRef.current.model,
              isNewChat,
              ...(requestContextRef.current.customInstructions
                ? { customInstructions: requestContextRef.current.customInstructions }
                : {}),
              ...(apiKey ? { apiKey } : {}),
            } satisfies ChatRequest,
          }
        },
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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

  // Existing chat route follows last assistant model.
  useEffect(() => {
    if (!paramsChatId || !initialMessages) {
      return
    }

    const modelFromLastAssistant = getLastAssistantModel(initialMessages)
    if (modelFromLastAssistant) {
      setCurrentModelState(modelFromLastAssistant)
    }
  }, [initialMessages, paramsChatId])

  // Home route follows persisted zustand model.
  useEffect(() => {
    if (paramsChatId) {
      return
    }

    setCurrentModelState(config.selectedModel)
  }, [paramsChatId, config.selectedModel])

  const setCurrentModel = useCallback(
    (model: Model) => {
      setCurrentModelState(model)
      if (!paramsChatId) {
        updateConfig({ selectedModel: model })
      }
    },
    [paramsChatId, updateConfig]
  )

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isAuthenticated) {
      toast.error('Please sign in to chat')
      return
    }

    if (!input.trim() || isStreaming) {
      return
    }

    const lastAssistant = messages.findLast((m) => m.role === 'assistant')
    if (
      lastAssistant?.parts.some(
        (part) =>
          part.type === 'tool-askQuestions' && (part.state === 'input-available' || part.state === 'input-streaming')
      )
    ) {
      toast.error('Please answer the questions or start a new chat')
      return
    }

    if (!isDevelopment && !config.apiKey) {
      toast.error('Please set your API key in Settings')
      return
    }

    if (messages.length === 0) {
      window.history.replaceState({}, '', `/chat/${chatId}`)
    }

    sendMessage({
      text: input,
      files: filesToSend,
    })

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
        currentModel,
        setCurrentModel,
        isStreaming,
        messages,
        sendMessage,
        status,
        regenerate,
        stop,
        addToolOutput,
        isLoadingMessages: isPending && !!paramsChatId && !!isAuthenticated,
        handleSubmit,
        error,
        clearError,
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
