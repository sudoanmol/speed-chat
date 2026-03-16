export type ChatModelId =
  | 'google/gemini-3-flash-preview'
  | 'google/gemini-3-pro-preview'
  | 'google/gemini-3.1-pro-preview'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-opus-4.6'
  | 'openai/gpt-5.3-chat'
  | 'openai/gpt-5.4'
  | 'z-ai/glm-5'
  | 'moonshotai/kimi-k2.5'

export type ImageModelId = 'google/gemini-3-pro-image-preview' | 'google/gemini-2.5-flash-image'

export type ModelId = ChatModelId | ImageModelId

export type Model = {
  provider: 'google' | 'anthropic' | 'openai' | 'z-ai' | 'moonshotai'
  id: ModelId
  name: string
  imageModel?: boolean
  thinking: boolean
  default?: boolean
  supportsAttachment: boolean
}

export const AVAILABLE_MODELS: Model[] = [
  {
    provider: 'google',
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    thinking: false,
    supportsAttachment: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Thinking)',
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6',
    thinking: false,
    supportsAttachment: true,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-sonnet-4.6',
    name: 'Claude Sonnet 4.6 (Thinking)',
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude Opus 4.6',
    thinking: false,
    supportsAttachment: true,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-opus-4.6',
    name: 'Claude Opus 4.6 (Thinking)',
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'openai',
    id: 'openai/gpt-5.3-chat',
    name: 'GPT-5.3 Instant',
    thinking: false,
    default: true,
    supportsAttachment: true,
  },
  {
    provider: 'openai',
    id: 'openai/gpt-5.4',
    name: 'GPT-5.4', // auto reasoning, doesn't think "always"
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'z-ai',
    id: 'z-ai/glm-5',
    name: 'GLM 5',
    thinking: false,
    supportsAttachment: false,
  },
  {
    provider: 'z-ai',
    id: 'z-ai/glm-5',
    name: 'GLM 5 (Thinking)',
    thinking: true,
    supportsAttachment: false,
  },
  {
    provider: 'moonshotai',
    id: 'moonshotai/kimi-k2.5',
    name: 'Kimi K2.5',
    thinking: false,
    supportsAttachment: true,
  },
  {
    provider: 'moonshotai',
    id: 'moonshotai/kimi-k2.5',
    name: 'Kimi K2.5 (Thinking)',
    thinking: true,
    supportsAttachment: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-2.5-flash-image',
    name: 'Nano Banana',
    imageModel: true,
    thinking: false,
    supportsAttachment: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    imageModel: true,
    thinking: false,
    supportsAttachment: true,
  },
]
