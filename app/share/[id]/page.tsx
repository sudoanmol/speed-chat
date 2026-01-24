import { SharedChatContainer } from '@/components/shared-chat-container'
import { api } from '@/convex/_generated/api'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { preloadQuery } from 'convex/nextjs'
import { redirect } from 'next/navigation'

export default async function SharedChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = await convexAuthNextjsToken()

  let preloadedChat

  try {
    preloadedChat = await preloadQuery(api.chat.getSharedChat, { chatId: id }, { token })
  } catch {
    redirect('/')
  }

  return <SharedChatContainer preloadedChat={preloadedChat} />
}
