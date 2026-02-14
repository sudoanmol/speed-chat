import { type InferUITool, tool } from 'ai'
import { z } from 'zod'

const AskQuestionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

const AskQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(AskQuestionOptionSchema).min(2).max(5),
})

export const AskQuestionsInputSchema = z.object({
  questions: z.array(AskQuestionSchema).min(1).max(5),
})

const OptionAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerType: z.literal('option'),
  optionId: z.string().min(1),
  answer: z.string().min(1),
})

const CustomAnswerSchema = z.object({
  questionId: z.string().min(1),
  answerType: z.literal('custom'),
  answer: z.string().min(1),
})

export const AskQuestionsOutputSchema = z.object({
  responses: z
    .array(z.discriminatedUnion('answerType', [OptionAnswerSchema, CustomAnswerSchema]))
    .min(1)
    .max(5),
})

export const askQuestions = () =>
  tool({
    description:
      'Ask up to 5 concise multiple-choice clarification questions when key info is missing. Do not include an "Other" option because the UI handles free-text answers.',
    inputSchema: AskQuestionsInputSchema,
    outputSchema: AskQuestionsOutputSchema,
  })

type AskQuestionsUITool = InferUITool<ReturnType<typeof askQuestions>>
export type AskQuestionsInput = AskQuestionsUITool['input']
export type AskQuestionsOutput = AskQuestionsUITool['output']
