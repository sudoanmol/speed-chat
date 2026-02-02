import { ChatContainerParent } from '@/components/chat-container'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const token = await convexAuthNextjsToken()

  if (!token) {
    redirect('/')
  }

  const { id } = await params

  return <ChatContainerParent paramsChatId={id} />
}
