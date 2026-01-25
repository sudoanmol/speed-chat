import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, generateText } from 'ai'
import { getManyFrom, getOneFrom } from 'convex-helpers/server/relationships'
import { FunctionReturnType } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import type { UIMessageWithMetadata } from '../lib/types'
import { api, internal } from './_generated/api'
import { internalAction, internalMutation, query } from './_generated/server'
import { titleGenPrompt } from './prompts'
import { authedMutation, authedQuery } from './utils'

export const getAllChats = authedQuery({
  handler: async (ctx) => {
    const chats = await getManyFrom(ctx.db, 'chats', 'by_user_id', ctx.userId, 'userId')
    return chats.sort((a, b) => b.updatedAt - a.updatedAt)
  },
})

export type Chat = FunctionReturnType<typeof api.chat.getAllChats>[number]

export const getChatMessages = authedQuery({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id_and_user_id', (q) => q.eq('id', args.chatId).eq('userId', ctx.userId))
      .first()

    if (!chat) {
      throw new ConvexError('Chat not found')
    }

    const messages = await getManyFrom(ctx.db, 'messages', 'by_chat_id', chat._id, 'chatId')

    const uiMessages = messages.map((message) => ({
      id: message.id,
      role: message.role,
      metadata: message.metadata,
      parts: message.parts,
    })) as UIMessageWithMetadata[]

    return uiMessages
  },
})

export const createChat = internalMutation({
  args: {
    chatId: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('chats', {
      id: args.chatId,
      userId: args.userId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBranch: false,
      isPinned: false,
      isShared: false,
    })
  },
})

export const generateChatTitle = internalAction({
  args: {
    chatId: v.string(),
    apiKey: v.string(),
    userMessage: v.any(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const openrouter = createOpenRouter({
      apiKey: args.apiKey,
    })

    const response = await generateText({
      model: openrouter('google/gemini-2.5-flash'),
      system: titleGenPrompt,
      messages: await convertToModelMessages([args.userMessage as UIMessageWithMetadata]),
    })

    if (response.text) {
      await ctx.runMutation(internal.chat.updateChatTitle, {
        userId: args.userId,
        chatId: args.chatId,
        title: response.text,
      })
    }
  },
})

export const updateChatTitle = internalMutation({
  args: {
    chatId: v.string(),
    userId: v.id('users'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id_and_user_id', (q) => q.eq('id', args.chatId).eq('userId', args.userId))
      .first()

    if (!chat) {
      throw new ConvexError('Chat not found')
    }

    await ctx.db.patch(chat._id, { title: args.title })
  },
})

export const upsertMessage = internalMutation({
  args: {
    chatId: v.string(),
    message: v.any(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const message = args.message as UIMessageWithMetadata

    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id_and_user_id', (q) => q.eq('id', args.chatId).eq('userId', args.userId))
      .first()

    if (!chat) {
      throw new ConvexError('Chat not found')
    }

    const existingMessage = await getOneFrom(ctx.db, 'messages', 'by_message_id', message.id, 'id')

    if (existingMessage) {
      await ctx.db.patch(existingMessage._id, {
        ...message,
        text_part: message.parts.map((part) => (part.type === 'text' ? part.text : '')).join(' '),
      })
    } else {
      await ctx.db.insert('messages', {
        ...message,
        text_part: message.parts.map((part) => (part.type === 'text' ? part.text : '')).join(' '),
        chatId: chat._id,
      })
    }

    await ctx.db.patch(chat._id, {
      updatedAt: Date.now(),
    })
  },
})

export const toggleChatShareStatus = authedMutation({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query('chats')
      .withIndex('by_chat_id_and_user_id', (q) => q.eq('id', args.chatId).eq('userId', ctx.userId))
      .first()

    if (!chat) {
      throw new ConvexError('Chat not found')
    }

    await ctx.db.patch(chat._id, { isShared: !chat.isShared })

    return { isShared: !chat.isShared }
  },
})

export const getSharedChat = query({
  args: {
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await getOneFrom(ctx.db, 'chats', 'by_chat_id', args.chatId, 'id')

    if (!chat || !chat.isShared) {
      throw new ConvexError('Chat not found or not shared')
    }

    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.tokenIdentifier

    const chatData = {
      id: chat.id,
      title: chat.title,
      isOwner: userId !== null && chat.userId === userId,
    }

    const messages = await getManyFrom(ctx.db, 'messages', 'by_chat_id', chat._id, 'chatId')

    const uiMessages = messages.map((message) => ({
      id: message.id,
      role: message.role,
      metadata: message.metadata,
      parts: message.parts,
    })) as UIMessageWithMetadata[]

    return { chatData, messages: uiMessages }
  },
})
