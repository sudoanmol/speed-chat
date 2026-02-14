import type { CustomInstructions } from '@/lib/types'
import { create } from 'zustand'

type CustomInstructionsStore = {
  customInstructions: CustomInstructions | null
  setCustomInstructions: (customInstructions: CustomInstructions | null) => void
  clearCustomInstructions: () => void
}

export const useCustomInstructionsStore = create<CustomInstructionsStore>()((set) => ({
  customInstructions: null,
  setCustomInstructions: (customInstructions) => set({ customInstructions }),
  clearCustomInstructions: () => set({ customInstructions: null }),
}))
