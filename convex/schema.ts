import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const schema = defineSchema({
  ...authTables,

  chats: defineTable({
    id: v.string(),
    title: v.string(),
    userId: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
    isBranch: v.boolean(),
    isPinned: v.boolean(),
    isShared: v.boolean(),
    parentChatId: v.optional(v.string()),
    activeStreamId: v.optional(v.string()),
  })
    .index('by_chat_id', ['id'])
    .index('by_chat_id_and_user_id', ['id', 'userId'])
    .index('by_user_id', ['userId'])
    .index('by_parent_chat_id', ['parentChatId'])
    .searchIndex('by_title', {
      searchField: 'title',
      filterFields: ['userId'],
    }),

  messages: defineTable({
    id: v.string(),
    chatId: v.id('chats'),
    metadata: v.optional(
      v.object({
        modelId: v.string(),
      })
    ),
    role: v.union(v.literal('system'), v.literal('user'), v.literal('assistant')),
    text_part: v.string(), // separate text part for search
    parts: v.array(v.any()), // full parts array object typed as any for simplicity
  })
    .index('by_chat_id', ['chatId'])
    .index('by_message_id', ['id'])
    .searchIndex('by_text_part', {
      searchField: 'text_part',
      filterFields: ['chatId'],
    }),

  attachments: defineTable({
    userId: v.id('users'),
    id: v.id('_storage'),
    url: v.string(),
  })
    .index('by_url', ['url'])
    .index('by_user_id', ['userId']),
})

export default schema
