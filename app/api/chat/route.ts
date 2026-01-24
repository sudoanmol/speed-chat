import { api } from '@/convex/_generated/api'
import { chatSystemPrompt } from '@/lib/ai/prompts'
import { getErrorMessage } from '@/lib/error'
import { getStreamContext } from '@/lib/stream-context'
import { ChatRequestSchema, MessageMetadata } from '@/lib/types'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { webSearch } from '@exalabs/ai-sdk'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, createIdGenerator, smoothStream, stepCountIs, streamText } from 'ai'
import { fetchAction, fetchMutation } from 'convex/nextjs'
import { nanoid } from 'nanoid'

export async function POST(request: Request) {
  const token = await convexAuthNextjsToken()

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json()

  const parsedBody = ChatRequestSchema.safeParse(body)

  if (!parsedBody.success) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { messages, chatId, model, isNewChat } = parsedBody.data

  const headers = request.headers
  const apiKey = headers.get('x-api-key')

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const openrouter = createOpenRouter({
    apiKey: apiKey,
  })

  const latestUserMessage = messages.at(-1)

  try {
    if (isNewChat) {
      await fetchMutation(
        api.chat.createChat,
        {
          chatId,
        },
        {
          token,
        }
      )

      fetchAction(
        api.chat.generateChatTitle,
        {
          chatId,
          apiKey,
          userMessage: latestUserMessage,
        },
        {
          token,
        }
      ).catch((error) => {
        console.error('Failed to generate chat title:', getErrorMessage(error))
      })
    }

    fetchMutation(
      api.chat.upsertMessage,
      {
        chatId,
        message: latestUserMessage,
      },
      {
        token,
      }
    ).catch((error) => {
      console.error('Failed to upsert user message:', getErrorMessage(error))
    })

    const modelId = model.id.replace('reasoning-', '')
    const reasoningConfig = {
      reasoning: {
        effort: 'medium',
        enabled: model.isReasoningModel,
      },
    }

    const response = streamText({
      model: openrouter(modelId, {
        extraBody: reasoningConfig,
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

    return response.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: () =>
        createIdGenerator({
          prefix: 'assistant',
          size: 16,
        })(),
      messageMetadata: () => {
        const metadata: MessageMetadata = {
          modelId: model.id,
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
          {
            token,
          }
        )
      },
      async consumeSseStream({ stream }) {
        const streamId = nanoid()

        // Create a resumable stream from the SSE stream
        const streamContext = getStreamContext()
        if (streamContext) {
          await streamContext.createNewResumableStream(streamId, () => stream)
        }

        // Update the chat with the active stream ID
        await fetchMutation(
          api.chat.updateChatActiveStreamId,
          {
            chatId,
            activeStreamId: streamId,
          },
          {
            token,
          }
        )
      },
    })
  } catch (error) {
    console.error('Chat route error:', error)
    return new Response(
      JSON.stringify({
        error: getErrorMessage(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
