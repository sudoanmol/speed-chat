import { AVAILABLE_MODELS } from '@/lib/models'
import { type ChatConfig, ChatConfigSchema } from '@/lib/types'
import type { FileUIPart } from 'ai'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const generateId = () => crypto.randomUUID()

const STORAGE_KEY = 'chat-config'

const getDefaultConfig = (): ChatConfig => ({
  selectedModel: AVAILABLE_MODELS.find((m) => m.default) ?? AVAILABLE_MODELS[0],
  apiKey: '',
  draftMessageEntry: { message: '', files: [] },
})

type ChatConfigStore = {
  config: ChatConfig
  chatId: string
  isHydrated: boolean
  updateConfig: (updates: Partial<ChatConfig>) => void
  setChatId: (chatId: string) => void
  updateDraftMessageEntry: (message: string, files: FileUIPart[]) => void
  clearDraftMessageEntry: () => void
  setHydrated: () => void
}

export const useChatConfigStore = create<ChatConfigStore>()(
  persist(
    (set, get) => ({
      config: getDefaultConfig(),
      chatId: generateId(),
      isHydrated: false,

      updateConfig: (updates) => {
        try {
          const merged = { ...get().config, ...updates }
          const validated = ChatConfigSchema.parse(merged)
          set({ config: validated })
        } catch (error) {
          console.error('Invalid chat config update:', error)
        }
      },

      setChatId: (chatId) => set({ chatId }),

      updateDraftMessageEntry: (message, files) => {
        const { config } = get()
        try {
          const merged = { ...config, draftMessageEntry: { message, files } }
          const validated = ChatConfigSchema.parse(merged)
          set({ config: validated })
        } catch (error) {
          console.error('Invalid draft message update:', error)
        }
      },

      clearDraftMessageEntry: () => {
        const { config } = get()
        set({ config: { ...config, draftMessageEntry: { message: '', files: [] } } })
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ config: state.config }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)
