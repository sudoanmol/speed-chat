import type { UIMessage } from 'ai'
import * as z from 'zod'
import type { Model } from './models'

const CUSTOM_INSTRUCTIONS_MAX_NAME_LENGTH = 120
const CUSTOM_INSTRUCTIONS_MAX_PROFESSION_LENGTH = 120
const CUSTOM_INSTRUCTIONS_MAX_ABOUT_USER_LENGTH = 2000
const CUSTOM_INSTRUCTIONS_MAX_RESPONSE_INSTRUCTIONS_LENGTH = 4000

export const DraftMessageEntrySchema = z.object({
  message: z.string(),
  files: z.array(z.any()),
})

export type DraftMessageEntry = z.infer<typeof DraftMessageEntrySchema>

export const ChatConfigSchema = z.object({
  selectedModel: z.custom<Model>(), // to load last used model on page load
  apiKey: z.string(),
  draftMessageEntry: DraftMessageEntrySchema.optional(),
})

export type ChatConfig = z.infer<typeof ChatConfigSchema>

export const CustomInstructionsSchema = z.object({
  name: z.string().max(CUSTOM_INSTRUCTIONS_MAX_NAME_LENGTH).optional(),
  profession: z.string().max(CUSTOM_INSTRUCTIONS_MAX_PROFESSION_LENGTH).optional(),
  aboutUser: z.string().max(CUSTOM_INSTRUCTIONS_MAX_ABOUT_USER_LENGTH).optional(),
  responseInstructions: z.string().max(CUSTOM_INSTRUCTIONS_MAX_RESPONSE_INSTRUCTIONS_LENGTH).optional(),
})

export type CustomInstructions = z.infer<typeof CustomInstructionsSchema>

export type MessageMetadata = {
  modelName: string
}

export type UIMessageWithMetadata = UIMessage<MessageMetadata>
