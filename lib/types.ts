import type { UIMessage } from 'ai'
import * as z from 'zod'
import type { Model, ModelId } from './models'

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

export type MessageMetadata = {
  modelId: ModelId
  usedThinking: boolean
}

export type UIMessageWithMetadata = UIMessage<MessageMetadata>
