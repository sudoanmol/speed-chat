import { api } from '@/convex/_generated/api'
import { codeExecution } from '@/lib/code-execution'
import { type Model } from '@/lib/models'
import { chatSystemPrompt } from '@/lib/prompts'
import type { MessageMetadata } from '@/lib/types'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { webSearch } from '@exalabs/ai-sdk'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { UIMessage } from 'ai'
import { convertToModelMessages, generateId, smoothStream, stepCountIs, streamText } from 'ai'
import { fetchAction, fetchMutation } from 'convex/nextjs'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  chatId: z.string(),
  messages: z.array(z.custom<UIMessage>()),
  model: z.custom<Model>(),
  isNewChat: z.boolean(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

export async function POST(request: Request) {
  const token = await convexAuthNextjsToken()

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = request.headers.get('X-API-Key')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json()
  const parsed = ChatRequestSchema.safeParse(body)

  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request body',
        details: z.treeifyError(parsed.error),
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const { chatId, messages, model, isNewChat } = parsed.data

  const lastMessage = messages[messages.length - 1]

  if (isNewChat) {
    await fetchMutation(api.chat.createChat, { chatId }, { token })

    fetchAction(
      api.chat.generateChatTitle,
      {
        chatId,
        apiKey,
        userMessage: lastMessage,
      },
      { token }
    ).catch(() => {
      console.error('Failed to generate chat title for chat', chatId)
    })
  }

  await fetchMutation(
    api.chat.upsertMessage,
    {
      chatId,
      message: lastMessage,
    },
    { token }
  )

  const openrouter = createOpenRouter({
    apiKey,
  })

  const result = streamText({
    model: openrouter.chat(model.id, {
      includeReasoning: model.thinking,
      extraBody: {
        reasoning: { enabled: model.thinking },
      },
    }),
    system: chatSystemPrompt(model.name),
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    experimental_transform: smoothStream({
      chunking: 'word',
    }),
    stopWhen: stepCountIs(5),
    tools: {
      webSearch: webSearch(),
      codeExecution: codeExecution(),
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    generateMessageId: () => generateId(),
    messageMetadata: () => {
      const metadata: MessageMetadata = {
        modelId: model.id,
        usedThinking: model.thinking,
      }

      return metadata
    },
    onFinish: async ({ responseMessage }) => {
      await fetchMutation(
        api.chat.upsertMessage,
        {
          chatId,
          message: responseMessage,
        },
        { token }
      )
    },
  })
}
