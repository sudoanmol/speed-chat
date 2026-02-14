import { getOneFrom } from 'convex-helpers/server/relationships'
import { ConvexError, v } from 'convex/values'
import { CustomInstructionsSchema, type CustomInstructions } from '../lib/types'
import { authedMutation, authedQuery } from './utils'

const normalizeInstructionField = (value?: string): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeCustomInstructions = (input: CustomInstructions): CustomInstructions => {
  const name = normalizeInstructionField(input.name)
  const profession = normalizeInstructionField(input.profession)
  const aboutUser = normalizeInstructionField(input.aboutUser)
  const responseInstructions = normalizeInstructionField(input.responseInstructions)

  return {
    ...(name ? { name } : {}),
    ...(profession ? { profession } : {}),
    ...(aboutUser ? { aboutUser } : {}),
    ...(responseInstructions ? { responseInstructions } : {}),
  }
}

const hasAnyCustomInstructions = (customInstructions: CustomInstructions) =>
  Boolean(
    customInstructions.name ||
    customInstructions.profession ||
    customInstructions.aboutUser ||
    customInstructions.responseInstructions
  )

export const getCurrentUserCustomInstructions = authedQuery({
  args: {},
  handler: async (ctx) => {
    const instructions = await getOneFrom(ctx.db, 'customInstructions', 'by_user_id', ctx.userId, 'userId')

    if (!instructions) {
      return null
    }

    return {
      name: instructions.name,
      profession: instructions.profession,
      aboutUser: instructions.aboutUser,
      responseInstructions: instructions.responseInstructions,
    }
  },
})

export const upsertCustomInstructions = authedMutation({
  args: {
    name: v.optional(v.string()),
    profession: v.optional(v.string()),
    aboutUser: v.optional(v.string()),
    responseInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parsed = CustomInstructionsSchema.safeParse(args)
    if (!parsed.success) {
      throw new ConvexError(parsed.error.issues[0]?.message ?? 'Invalid custom instructions')
    }

    const normalizedCustomInstructions = normalizeCustomInstructions(parsed.data)
    const existing = await getOneFrom(ctx.db, 'customInstructions', 'by_user_id', ctx.userId, 'userId')

    if (!hasAnyCustomInstructions(normalizedCustomInstructions)) {
      if (existing) {
        await ctx.db.delete(existing._id)
      }
      return null
    }

    const now = Date.now()

    if (existing) {
      await ctx.db.replace(existing._id, {
        userId: ctx.userId,
        ...normalizedCustomInstructions,
        createdAt: existing.createdAt,
        updatedAt: now,
      })
      return normalizedCustomInstructions
    }

    await ctx.db.insert('customInstructions', {
      userId: ctx.userId,
      ...normalizedCustomInstructions,
      createdAt: now,
      updatedAt: now,
    })

    return normalizedCustomInstructions
  },
})
