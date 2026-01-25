import { getAuthUserId } from '@convex-dev/auth/server'
import { webSearch } from '@exalabs/ai-sdk'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { UIMessage } from 'ai'
import { convertToModelMessages, generateId, smoothStream, stepCountIs, streamText } from 'ai'
import { httpRouter } from 'convex/server'
import { z } from 'zod'
import type { Model } from '../lib/models'
import { internal } from './_generated/api'
import { httpAction } from './_generated/server'
import { auth } from './auth'
import { chatSystemPrompt } from './prompts'

const http = httpRouter()

auth.addHttpRoutes(http)

export const ChatRequestSchema = z.object({
  chatId: z.string(),
  messages: z.array(z.custom<UIMessage>()),
  model: z.custom<Model>(),
  isNewChat: z.boolean(),
})

export type ChatRequest = z.infer<typeof ChatRequestSchema>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
}

http.route({
  path: '/api/chat',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }),
})

http.route({
  path: '/api/chat',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    const { chatId, messages, model, isNewChat } = parsed.data

    const lastMessage = messages[messages.length - 1]

    if (isNewChat) {
      await ctx.runMutation(internal.chat.createChat, {
        chatId,
        userId,
      })

      ctx
        .runAction(internal.chat.generateChatTitle, {
          chatId,
          userId,
          apiKey,
          userMessage: lastMessage,
        })
        .catch(() => {
          console.error('Failed to generate chat title for chat', chatId)
        })
    }

    await ctx.runMutation(internal.chat.upsertMessage, {
      chatId,
      userId,
      message: lastMessage,
    })

    const openrouter = createOpenRouter({
      apiKey,
    })

    const result = streamText({
      model: openrouter.chat(model.id, {
        extraBody: {
          reasoning: {
            enabled: model.thinking,
          },
        },
      }),
      system: chatSystemPrompt(model.name),
      messages: await convertToModelMessages(messages),
      experimental_transform: smoothStream({
        chunking: 'word',
      }),
      stopWhen: stepCountIs(5),
      tools: {
        webSearch: webSearch(),
      },
    })

    return result.toUIMessageStreamResponse({
      headers: corsHeaders,
      originalMessages: messages,
      generateMessageId: () => generateId(),
      onFinish: async ({ responseMessage }) => {
        await ctx.runMutation(internal.chat.upsertMessage, {
          chatId,
          userId,
          message: responseMessage,
        })
      },
    })
  }),
})

export default http
