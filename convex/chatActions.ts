import { getManyFrom, getOneFrom } from 'convex-helpers/server/relationships'
import { ConvexError, v } from 'convex/values'
import { authedMutation } from './utils'

export const branchOffFromMessage = authedMutation({
  args: {
    parentChatId: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const branchChatId = crypto.randomUUID()

    const parentChat = await getOneFrom(ctx.db, 'chats', 'by_chat_id', args.parentChatId, 'id')

    if (!parentChat) {
      throw new ConvexError(`Chat ${args.parentChatId} not found`)
    }

    const parentMessages = await getManyFrom(ctx.db, 'messages', 'by_chat_id', parentChat._id, 'chatId')

    const messagesUntilMessageToBranch = parentMessages.slice(
      0,
      parentMessages.findIndex((m) => m.id === args.messageId) + 1
    )

    const branchChatConvexId = await ctx.db.insert('chats', {
      id: branchChatId,
      title: parentChat.title,
      userId: parentChat.userId,
      isBranch: true,
      isPinned: false,
      isShared: false,
      parentChatId: parentChat.id,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    })

    for (const message of messagesUntilMessageToBranch) {
      await ctx.db.insert('messages', {
        id: `${message.id}-branch-${branchChatId}`,
        chatId: branchChatConvexId,
        text_part: message.text_part,
        role: message.role,
        parts: message.parts,
        metadata: message.metadata,
      })
    }

    return branchChatId
  },
})

export const renameChatTitle = authedMutation({
  args: {
    chatId: v.string(),
    newTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await getOneFrom(ctx.db, 'chats', 'by_chat_id', args.chatId, 'id')

    if (!chat) {
      throw new ConvexError(`Chat ${args.chatId} not found`)
    }

    await ctx.db.patch(chat._id, {
      title: args.newTitle,
    })
  },
})

export const pinChat = authedMutation({
  args: {
    chatId: v.string(),
    isPinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const chat = await getOneFrom(ctx.db, 'chats', 'by_chat_id', args.chatId, 'id')

    if (!chat) {
      throw new ConvexError(`Chat ${args.chatId} not found`)
    }

    await ctx.db.patch(chat._id, {
      isPinned: args.isPinned,
    })
  },
})

// Basically same as branch but copies the whole chat into a new one
export const forkChat = authedMutation({
  args: {
    chatId: v.string(),
    newChatId: v.string(),
  },
  handler: async (ctx, args) => {
    const originalChat = await getOneFrom(ctx.db, 'chats', 'by_chat_id', args.chatId, 'id')

    if (!originalChat || !originalChat.isShared) {
      throw new ConvexError('Chat not found or not shared')
    }

    // Create new chat for the current user
    const newChatConvexId = await ctx.db.insert('chats', {
      id: args.newChatId,
      userId: ctx.userId,
      title: originalChat.title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBranch: false,
      isPinned: false,
      isShared: false,
    })

    // Copy all messages from original chat and save to new chat
    const originalMessages = await getManyFrom(ctx.db, 'messages', 'by_chat_id', originalChat._id, 'chatId')

    for (const message of originalMessages) {
      await ctx.db.insert('messages', {
        id: `${message.id}-fork-${args.newChatId}`,
        chatId: newChatConvexId,
        metadata: message.metadata,
        role: message.role,
        text_part: message.text_part,
        parts: message.parts,
      })
    }
  },
})
