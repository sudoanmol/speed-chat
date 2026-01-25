import { ConvexError } from 'convex/values'

export const getErrorMessage = (error: unknown) => {
  return error instanceof ConvexError
    ? error.data
    : error instanceof Error
      ? error.message
      : 'Unexpected error occurred'
}
