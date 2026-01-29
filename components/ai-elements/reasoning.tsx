'use client'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { BrainIcon, ChevronDownIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { createContext, memo, useContext, useEffect, useState } from 'react'
import { Streamdown } from 'streamdown'
import { Shimmer } from './shimmer'

type ReasoningContextValue = {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null)

export const useReasoning = () => {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning')
  }
  return context
}

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
}

const AUTO_CLOSE_DELAY = 1000

export const Reasoning = memo(({ className, isStreaming = false, children, ...props }: ReasoningProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [wasStreaming, setWasStreaming] = useState(false)

  // Track if we were ever streaming
  useEffect(() => {
    if (isStreaming) {
      setWasStreaming(true)
    }
  }, [isStreaming])

  // Auto-open when streaming starts, auto-close when streaming ends (only if we were streaming)
  useEffect(() => {
    if (isStreaming && !isOpen) {
      setIsOpen(true)
    } else if (!isStreaming && isOpen && wasStreaming) {
      const timer = setTimeout(() => {
        setIsOpen(false)
        setWasStreaming(false)
      }, AUTO_CLOSE_DELAY)

      return () => clearTimeout(timer)
    }
  }, [isStreaming, isOpen, wasStreaming])

  return (
    <ReasoningContext.Provider value={{ isStreaming, isOpen, setIsOpen }}>
      <Collapsible className={cn('not-prose', className)} onOpenChange={setIsOpen} open={isOpen} {...props}>
        {children}
      </Collapsible>
    </ReasoningContext.Provider>
  )
})

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  getThinkingMessage?: (isStreaming: boolean) => ReactNode
}

const defaultGetThinkingMessage = (isStreaming: boolean) => {
  if (isStreaming) {
    return <Shimmer duration={1}>Reasoning...</Shimmer>
  }
  return <p>View reasoning</p>
}

export const ReasoningTrigger = memo(
  ({ className, children, getThinkingMessage = defaultGetThinkingMessage, ...props }: ReasoningTriggerProps) => {
    const { isStreaming, isOpen } = useReasoning()

    return (
      <CollapsibleTrigger
        className={cn(
          'text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-sm transition-colors',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="size-4" />
            {getThinkingMessage(isStreaming)}
            <ChevronDownIcon className={cn('size-4 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
          </>
        )}
      </CollapsibleTrigger>
    )
  }
)

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string
}

export const ReasoningContent = memo(({ className, children, ...props }: ReasoningContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-4 text-sm',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground data-[state=closed]:animate-out data-[state=open]:animate-in outline-none',
      className
    )}
    {...props}
  >
    <Streamdown {...props}>{children}</Streamdown>
  </CollapsibleContent>
))

Reasoning.displayName = 'Reasoning'
ReasoningTrigger.displayName = 'ReasoningTrigger'
ReasoningContent.displayName = 'ReasoningContent'
