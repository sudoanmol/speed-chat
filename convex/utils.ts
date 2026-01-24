import { getAuthUserId } from '@convex-dev/auth/server'
import { customAction, customCtx, customMutation, customQuery } from 'convex-helpers/server/customFunctions'
import { ConvexError } from 'convex/values'
import { action, mutation, query } from './_generated/server'

export const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError('Not authenticated')
    }
    return { userId }
  })
)

export const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError('Not authenticated')
    }
    return { userId }
  })
)

export const authedAction = customAction(
  action,
  customCtx(async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      throw new ConvexError('Not authenticated')
    }
    return { userId }
  })
)
