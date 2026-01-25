export type ChatModelId =
  | 'google/gemini-3-flash-preview'
  | 'google/gemini-3-pro-preview'
  | 'anthropic/claude-sonnet-4.5'
  | 'anthropic/claude-opus-4.5'
  | 'openai/gpt-5.2'
  | 'z-ai/glm-4.7'
  | 'moonshotai/kimi-k2-0905'
  | 'moonshotai/kimi-k2-thinking'

export type ImageModelId = 'google/gemini-3-pro-image-preview' | 'google/gemini-2.5-flash-image'

export type ModelId = ChatModelId | ImageModelId

export type Model = {
  provider: 'google' | 'anthropic' | 'openai' | 'z-ai' | 'moonshotai'
  id: ModelId
  name: string
  imageModel?: boolean
  thinking: boolean
  default?: boolean
}

export const AVAILABLE_MODELS: Model[] = [
  {
    provider: 'google',
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    thinking: false,
    default: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3-flash-preview',
    name: 'Gemini 3 Flash (Thinking)',
    thinking: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    thinking: true,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    thinking: false,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5 (Thinking)',
    thinking: true,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    thinking: false,
  },
  {
    provider: 'anthropic',
    id: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5 (Thinking)',
    thinking: true,
  },
  {
    provider: 'openai',
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2',
    thinking: false,
  },
  {
    provider: 'openai',
    id: 'openai/gpt-5.2',
    name: 'GPT-5.2 (Thinking)',
    thinking: true,
  },
  {
    provider: 'z-ai',
    id: 'z-ai/glm-4.7',
    name: 'GLM 4.7',
    thinking: false,
  },
  {
    provider: 'z-ai',
    id: 'z-ai/glm-4.7',
    name: 'GLM 4.7 (Thinking)',
    thinking: true,
  },
  {
    provider: 'moonshotai',
    id: 'moonshotai/kimi-k2-0905',
    name: 'Kimi K2',
    thinking: false,
  },
  {
    provider: 'moonshotai',
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 (Thinking)',
    thinking: true,
  },
  {
    provider: 'google',
    id: 'google/gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    imageModel: true,
    thinking: false,
  },
  {
    provider: 'google',
    id: 'google/gemini-2.5-flash-image',
    name: 'Nano Banana',
    imageModel: true,
    thinking: false,
  },
]
