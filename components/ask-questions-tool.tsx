'use client'

import { api } from '@/convex/_generated/api'
import { getErrorMessage } from '@/lib/convex-error'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useChatContext } from '@/lib/stores/chat-store'
import {
  AskQuestionsInputSchema,
  AskQuestionsOutputSchema,
  type AskQuestionsInput,
  type AskQuestionsOutput,
} from '@/lib/tools/ask-questions'
import type { UIMessageWithMetadata } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { ToolUIPart } from 'ai'
import { useMutation } from 'convex/react'
import { AlertCircle, CheckCircle2, ChevronDown, CircleDashed, Edit3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent } from './ui/collapsible'
import { Skeleton } from './ui/skeleton'
import { Textarea } from './ui/textarea'

type AskQuestionsToolState = ToolUIPart['state']

type AskQuestionsToolBaseProps = {
  toolCallId: string
  state: AskQuestionsToolState
  input: unknown
  output: unknown
  errorText: string | undefined
  readOnly: boolean
  isSubmitting: boolean
  onSubmit: ((output: AskQuestionsOutput) => Promise<void>) | undefined
}

type AskQuestionsToolProps = {
  toolCallId: string
  state: AskQuestionsToolState
  input: unknown
  output: unknown
  errorText: string | undefined
}

type InteractiveAskQuestionsToolProps = AskQuestionsToolProps & {
  message: UIMessageWithMetadata
}

type DraftAnswer = { answerType: 'option'; optionId: string } | { answerType: 'custom'; answer: string }

export function AskQuestionsTool(props: AskQuestionsToolProps) {
  return <AskQuestionsToolBase {...props} readOnly isSubmitting={false} onSubmit={undefined} />
}

export function InteractiveAskQuestionsTool({ message, ...props }: InteractiveAskQuestionsToolProps) {
  const { addToolOutput } = useChatContext()
  const upsertMessage = useMutation(api.chat.upsertMessage)
  const chatId = useChatConfigStore((state) => state.chatId)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (output: AskQuestionsOutput) => {
    void addToolOutput({
      tool: 'askQuestions',
      toolCallId: props.toolCallId,
      output,
    }).catch((error) => {
      toast.error(getErrorMessage(error))
    })

    const updatedParts = message.parts.map((part) => {
      if (part.type !== 'tool-askQuestions') {
        return part
      }

      if (part.toolCallId !== props.toolCallId) {
        return part
      }

      return {
        ...part,
        state: 'output-available',
        output,
      }
    })

    setIsSubmitting(true)
    try {
      await upsertMessage({
        chatId,
        message: {
          ...message,
          parts: updatedParts,
        },
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return <AskQuestionsToolBase {...props} readOnly={false} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
}

function AskQuestionsToolBase({
  toolCallId,
  state,
  input,
  output,
  errorText,
  readOnly,
  isSubmitting,
  onSubmit,
}: AskQuestionsToolBaseProps) {
  const parsedInput = useMemo(() => AskQuestionsInputSchema.safeParse(input), [input])
  const parsedOutput = useMemo(() => AskQuestionsOutputSchema.safeParse(output), [output])
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const hasCapturedAnswers = state === 'output-available' && parsedOutput.success

  useEffect(() => {
    setAnswers({})
    setAttemptedSubmit(false)
    setIsCollapsed(false)
  }, [toolCallId])

  useEffect(() => {
    if (hasCapturedAnswers) {
      setIsCollapsed(true)
    }
  }, [hasCapturedAnswers])

  const missingQuestionIds = useMemo(() => {
    if (!parsedInput.success) {
      return []
    }

    return parsedInput.data.questions
      .filter((question) => {
        const draft = answers[question.id]
        if (!draft) {
          return true
        }

        if (draft.answerType === 'option') {
          return !question.options.some((option) => option.id === draft.optionId)
        }

        return draft.answer.trim().length === 0
      })
      .map((question) => question.id)
  }, [answers, parsedInput])

  const outputByQuestionId = useMemo(() => {
    if (!parsedOutput.success) {
      return new Map<string, AskQuestionsOutput['responses'][number]>()
    }

    return new Map(parsedOutput.data.responses.map((response) => [response.questionId, response]))
  }, [parsedOutput])

  const submitAnswers = async () => {
    if (!parsedInput.success || !onSubmit) {
      return
    }

    setAttemptedSubmit(true)

    const nextOutput = buildOutputFromAnswers(parsedInput.data.questions, answers)
    if (!nextOutput) {
      toast.error('Please answer all questions before submitting')
      return
    }

    await onSubmit(nextOutput)
  }

  if (state === 'input-streaming') {
    return (
      <div className="border-border/60 bg-muted/20 space-y-3 rounded-xl border p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-10/12 rounded-lg" />
      </div>
    )
  }

  if (!parsedInput.success) {
    return (
      <Alert variant="destructive" className="rounded-xl">
        <AlertCircle />
        <AlertTitle>Invalid ask-questions payload</AlertTitle>
        <AlertDescription>Could not render this question set.</AlertDescription>
      </Alert>
    )
  }

  const { questions } = parsedInput.data

  return (
    <Collapsible
      className="border-border/70 bg-muted/20 space-y-4 rounded-xl border p-4"
      open={!isCollapsed}
      onOpenChange={(open) => setIsCollapsed(!open)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CircleDashed className="text-muted-foreground size-4" />
          <p className="text-sm font-medium">A few quick questions</p>
        </div>
        <div className="flex items-center gap-1">
          {hasCapturedAnswers && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCollapsed((prev) => !prev)}>
              <ChevronDown className={cn('size-4 transition-transform', !isCollapsed && 'rotate-180')} />
              {isCollapsed ? 'Expand' : 'Collapse'}
            </Button>
          )}
          <Badge variant="secondary">{questions.length} question(s)</Badge>
        </div>
      </div>

      {isCollapsed && hasCapturedAnswers ? (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <CheckCircle2 className="size-3.5" />
          Answers captured. Expand to review.
        </div>
      ) : (
        <CollapsibleContent forceMount className="space-y-4">
          {state === 'output-error' ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle />
              <AlertTitle>Could not save answers</AlertTitle>
              <AlertDescription>{errorText ?? 'Unknown error'}</AlertDescription>
            </Alert>
          ) : null}

          {state === 'output-available' && !parsedOutput.success ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle />
              <AlertTitle>Invalid answer payload</AlertTitle>
              <AlertDescription>Could not parse stored answers for this tool call.</AlertDescription>
            </Alert>
          ) : null}

          {questions.map((question, questionIndex) => {
            const draft = answers[question.id]
            const saved = outputByQuestionId.get(question.id)
            const showMissing = attemptedSubmit && missingQuestionIds.includes(question.id)

            return (
              <div key={`${toolCallId}-${question.id}`} className="bg-background/80 space-y-3 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {questionIndex + 1}. {question.prompt}
                  </p>
                  {saved ? (
                    <Badge variant="outline" className="shrink-0">
                      {saved.answerType === 'option' ? 'Option' : 'Custom'}
                    </Badge>
                  ) : null}
                </div>

                {state !== 'output-available' && (
                  <div className="flex flex-wrap gap-2">
                    {question.options.map((option) => {
                      const isSelected = draft?.answerType === 'option' && draft.optionId === option.id
                      return (
                        <Button
                          key={option.id}
                          type="button"
                          size="sm"
                          variant={isSelected ? 'default' : 'outline'}
                          onClick={() => {
                            if (readOnly) return
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: { answerType: 'option', optionId: option.id },
                            }))
                          }}
                          disabled={readOnly}
                        >
                          {option.label}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {state !== 'output-available' && !readOnly && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn('h-7 px-0 text-xs', draft?.answerType === 'custom' && 'text-primary')}
                      onClick={() => {
                        const current = answers[question.id]
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: {
                            answerType: 'custom',
                            answer: current?.answerType === 'custom' ? current.answer : '',
                          },
                        }))
                      }}
                    >
                      <Edit3 className="size-3.5" />
                      Write my own answer
                    </Button>
                    {draft?.answerType === 'custom' && (
                      <Textarea
                        value={draft.answer}
                        onChange={(event) => {
                          const value = event.target.value
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: {
                              answerType: 'custom',
                              answer: value,
                            },
                          }))
                        }}
                        className="min-h-20 text-sm"
                        placeholder="Type your answer..."
                      />
                    )}
                  </div>
                )}

                {(state === 'output-available' || readOnly) && (
                  <div className="bg-muted/40 rounded-lg p-3 text-sm">
                    {saved ? (
                      <>
                        <p className="text-muted-foreground text-xs font-medium uppercase">Answer</p>
                        <p className="mt-1 whitespace-pre-wrap">{saved.answer}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">No answer recorded.</p>
                    )}
                  </div>
                )}

                {showMissing && <p className="text-destructive text-xs">Please answer this question.</p>}
              </div>
            )
          })}

          {!readOnly && state === 'input-available' && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Choose one option or write your own answer for each question.
              </p>
              <Button type="button" onClick={submitAnswers} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Submit answers'}
              </Button>
            </div>
          )}

          {hasCapturedAnswers ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <CheckCircle2 className="size-3.5" />
              Answers captured
            </div>
          ) : null}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

function buildOutputFromAnswers(
  questions: AskQuestionsInput['questions'],
  answers: Record<string, DraftAnswer>
): AskQuestionsOutput | null {
  const responses: AskQuestionsOutput['responses'] = []

  for (const question of questions) {
    const draft = answers[question.id]
    if (!draft) {
      return null
    }

    if (draft.answerType === 'option') {
      const selectedOption = question.options.find((option) => option.id === draft.optionId)
      if (!selectedOption) {
        return null
      }

      responses.push({
        questionId: question.id,
        answerType: 'option',
        optionId: selectedOption.id,
        answer: selectedOption.label,
      })
      continue
    }

    const customAnswer = draft.answer.trim()
    if (!customAnswer) {
      return null
    }

    responses.push({
      questionId: question.id,
      answerType: 'custom',
      answer: customAnswer,
    })
  }

  const parsedOutput = AskQuestionsOutputSchema.safeParse({ responses })
  if (!parsedOutput.success) {
    return null
  }

  return parsedOutput.data
}
