import { getOneFrom } from 'convex-helpers/server/relationships'
import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalAction, internalMutation, internalQuery } from './_generated/server'
import { authedMutation, authedQuery } from './utils'

export const getUserGenerations = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const generations = await ctx.db
      .query('imageGenerations')
      .withIndex('by_user_id', (q) => q.eq('userId', ctx.userId))
      .order('desc')
      .take(args.limit ?? 50)

    return generations
  },
})

export const createImageGeneration = authedMutation({
  args: {
    id: v.string(),
    prompt: v.string(),
    model: v.string(),
    aspectRatio: v.optional(v.string()),
    imageSize: v.optional(v.string()),
    referenceImageUrl: v.optional(v.string()),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const generationId = await ctx.db.insert('imageGenerations', {
      id: args.id,
      userId: ctx.userId,
      prompt: args.prompt,
      model: args.model,
      aspectRatio: args.aspectRatio,
      imageSize: args.imageSize,
      referenceImageUrl: args.referenceImageUrl,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    await ctx.scheduler.runAfter(0, internal.imageGeneration.processImageGeneration, {
      generationId,
      apiKey: args.apiKey,
    })

    return args.id
  },
})

export const deleteGeneration = authedMutation({
  args: {
    generationId: v.string(),
  },
  handler: async (ctx, args) => {
    const generation = await getOneFrom(ctx.db, 'imageGenerations', 'by_generation_id', args.generationId, 'id')

    if (!generation || generation.userId !== ctx.userId) {
      throw new ConvexError('Generation not found')
    }

    if (generation.resultStorageId) {
      await ctx.storage.delete(generation.resultStorageId)
    }

    await ctx.db.delete(generation._id)
  },
})

export const getGenerationById = internalQuery({
  args: { generationId: v.id('imageGenerations') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.generationId)
  },
})

export const updateStatus = internalMutation({
  args: {
    generationId: v.id('imageGenerations'),
    status: v.union(v.literal('pending'), v.literal('processing'), v.literal('completed'), v.literal('failed')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: args.status,
      updatedAt: Date.now(),
    })
  },
})

export const completeGeneration = internalMutation({
  args: {
    generationId: v.id('imageGenerations'),
    resultImageUrl: v.string(),
    resultStorageId: v.id('_storage'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: 'completed',
      resultImageUrl: args.resultImageUrl,
      resultStorageId: args.resultStorageId,
      updatedAt: Date.now(),
    })
  },
})

export const failGeneration = internalMutation({
  args: {
    generationId: v.id('imageGenerations'),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: 'failed',
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    })
  },
})

export const processImageGeneration = internalAction({
  args: {
    generationId: v.id('imageGenerations'),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.imageGeneration.updateStatus, {
      generationId: args.generationId,
      status: 'processing',
    })

    try {
      const generation = await ctx.runQuery(internal.imageGeneration.getGenerationById, {
        generationId: args.generationId,
      })

      if (!generation) {
        throw new Error('Generation not found')
      }

      type MessageContent =
        | string
        | Array<{ type: 'image_url'; image_url: { url: string } } | { type: 'text'; text: string }>

      let content: MessageContent

      if (generation.referenceImageUrl) {
        content = [
          { type: 'image_url', image_url: { url: generation.referenceImageUrl } },
          { type: 'text', text: generation.prompt },
        ]
      } else {
        content = generation.prompt
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${args.apiKey}`,
        },
        body: JSON.stringify({
          model: generation.model,
          messages: [{ role: 'user', content }],
          modalities: ['image', 'text'],
          image_config: {
            aspect_ratio: generation.aspectRatio ?? '1:1',
            image_size: generation.imageSize ?? '1K',
          },
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: { message?: string } }
        throw new Error(errorData.error?.message || 'Failed to generate image')
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            images?: Array<{
              image_url?: { url?: string }
            }>
          }
        }>
      }

      const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url

      if (!imageDataUrl) {
        throw new Error('No image returned from API')
      }

      const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

      const blob = new Blob([imageBuffer], { type: 'image/png' })
      const uploadUrl = await ctx.storage.generateUploadUrl()

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: blob,
      })

      const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> }
      const storedUrl = await ctx.storage.getUrl(storageId)

      if (!storedUrl) {
        throw new Error('Failed to get storage URL')
      }

      await ctx.runMutation(internal.imageGeneration.completeGeneration, {
        generationId: args.generationId,
        resultImageUrl: storedUrl,
        resultStorageId: storageId,
      })
    } catch (error) {
      await ctx.runMutation(internal.imageGeneration.failGeneration, {
        generationId: args.generationId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },
})
