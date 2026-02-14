'use client'

import { api } from '@/convex/_generated/api'
import { useCustomInstructionsStore } from '@/lib/stores/custom-instructions-store'
import { useQueryWithStatus } from '@/lib/utils'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'

export function CustomInstructionsLoader() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const setCustomInstructions = useCustomInstructionsStore((s) => s.setCustomInstructions)
  const clearCustomInstructions = useCustomInstructionsStore((s) => s.clearCustomInstructions)

  const { data: customInstructions } = useQueryWithStatus(
    api.customInstructions.getCurrentUserCustomInstructions,
    isAuthenticated ? {} : 'skip'
  )

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      clearCustomInstructions()
      return
    }

    if (customInstructions !== undefined) {
      setCustomInstructions(customInstructions)
    }
  }, [clearCustomInstructions, customInstructions, isAuthenticated, isLoading, setCustomInstructions])

  return null
}
