'use client'

import { generateId, useChatConfigStore } from '@/lib/stores/chat-config-store'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export function useChatIdSync() {
  const pathname = usePathname()
  const urlChatId = pathname.startsWith('/chat/') ? pathname.split('/chat/')[1] : ''
  const setChatId = useChatConfigStore((s) => s.setChatId)

  const [currentChatId, setCurrentChatId] = useState<string>(urlChatId || generateId())

  useEffect(() => {
    if (urlChatId) {
      // Navigating to an existing chat
      setCurrentChatId(urlChatId)
    } else {
      // Navigating to home
      setCurrentChatId(generateId())
    }
  }, [urlChatId])

  // The effective chatId: use paramsChatId if available, otherwise use generated ID
  const chatId = urlChatId || currentChatId

  // Sync to store
  useEffect(() => {
    setChatId(chatId)
  }, [chatId, setChatId])

  return chatId
}
