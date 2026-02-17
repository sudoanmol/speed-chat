'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import { api } from '@/convex/_generated/api'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'
import { useQueryWithStatus } from '@/lib/utils'
import { useAuthActions } from '@convex-dev/auth/react'
import { VariantProps } from 'class-variance-authority'
import { usePaginatedQuery } from 'convex/react'
import { ImageIcon, Loader2, LogIn, MessageSquare, PenBox, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDocumentTitle } from 'usehooks-ts'
import { SearchDialog } from './search-dialog'
import { SidebarChatItem } from './sidebar-chat-item'
import { Button, buttonVariants } from './ui/button'
import { Kbd, KbdGroup } from './ui/kbd'

const PAGE_SIZE = 20

export function AppSidebar() {
  const { data: user, isPending: isUserLoading } = useQueryWithStatus(api.users.getCurrentUser, {})
  const chatId = useChatConfigStore((s) => s.chatId)
  const [openSearchDialog, setOpenSearchDialog] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const {
    results: chats,
    status,
    loadMore,
  } = usePaginatedQuery(api.chat.getAllChats, user ? {} : 'skip', { initialNumItems: PAGE_SIZE })
  const isPending = status === 'LoadingFirstPage'
  const isLoadingMore = status === 'LoadingMore'
  const canLoadMore = status === 'CanLoadMore'

  const handleLoadMore = useCallback(() => {
    if (canLoadMore && !isLoadingMore) {
      loadMore(PAGE_SIZE)
    }
  }, [canLoadMore, isLoadingMore, loadMore])

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleLoadMore])

  const pinnedChats = useMemo(() => {
    return chats?.filter((chat) => chat.isPinned)
  }, [chats])

  const unpinnedChats = useMemo(() => {
    return chats?.filter((chat) => !chat.isPinned)
  }, [chats])

  const currentChat = useMemo(() => {
    return chats?.find((chat) => chat.id === chatId)
  }, [chats, chatId])
  const profileLabel = user?.name?.trim() || user?.email?.trim() || 'Profile'
  const profileInitial = profileLabel.charAt(0).toUpperCase()

  useDocumentTitle(currentChat ? `${currentChat.title} | Speed Chat` : 'Speed Chat')

  return (
    <>
      <Sidebar>
        <SidebarHeader className="flex flex-col items-center pt-4">
          <Link className="flex items-center gap-2" href="/">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-400">
              <MessageSquare className="size-4.5 text-white" />
            </div>
            <span className="text-lg font-medium">SpeedChat</span>
          </Link>
          <SidebarGroup className="px-0 pb-0">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" className="group/button">
                    <PenBox />
                    <div className="flex w-full items-center justify-between gap-2">
                      New chat
                      <KbdGroup className="opacity-0 group-hover/button:opacity-100">
                        <Kbd>⌘</Kbd>
                        <Kbd>⇧</Kbd>
                        <Kbd>O</Kbd>
                      </KbdGroup>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={() => setOpenSearchDialog(true)} className="group/button">
                    <Search />
                    <div className="flex w-full items-center justify-between gap-2">
                      Search chats
                      <KbdGroup className="opacity-0 group-hover/button:opacity-100">
                        <Kbd>⌘</Kbd>
                        <Kbd>K</Kbd>
                      </KbdGroup>
                    </div>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/generate-images">
                    <ImageIcon />
                    Generate images
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="flex flex-1 flex-col">
            {!user && !isUserLoading ? (
              <div className="text-muted-foreground mx-auto my-auto flex text-sm">
                Please sign in to view your chats.
              </div>
            ) : isPending || chats?.length === 0 ? null : (
              <>
                {pinnedChats && pinnedChats.length > 0 && (
                  <>
                    <SidebarGroupLabel>Pinned</SidebarGroupLabel>
                    <SidebarMenu>
                      {pinnedChats.map((chat) => (
                        <SidebarChatItem chat={chat} key={chat.id} />
                      ))}
                    </SidebarMenu>
                  </>
                )}
                {unpinnedChats && unpinnedChats.length > 0 && (
                  <>
                    <SidebarGroupLabel>Chats</SidebarGroupLabel>
                    <SidebarMenu>
                      {unpinnedChats.map((chat) => (
                        <SidebarChatItem chat={chat} key={chat.id} />
                      ))}
                    </SidebarMenu>
                  </>
                )}
                <div ref={loadMoreRef} className="flex justify-center py-2">
                  {isLoadingMore && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
                </div>
              </>
            )}
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="pb-4">
          {isUserLoading ? (
            <SidebarMenuSkeleton showIcon={true} />
          ) : user ? (
            <Button
              asChild
              className="flex h-12 w-full items-center justify-start gap-3 rounded-lg px-2"
              variant="ghost"
            >
              <Link href="/settings">
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={`${profileLabel} profile photo`}
                      width={32}
                      height={32}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold">{profileInitial}</span>
                  )}
                </div>
                <span className="truncate text-sm font-normal">{profileLabel}</span>
              </Link>
            </Button>
          ) : (
            <LoginButton className="flex w-full" variant="outline" size="lg" />
          )}
        </SidebarFooter>
      </Sidebar>

      <SearchDialog open={openSearchDialog} onOpenChange={setOpenSearchDialog} />
    </>
  )
}

export function LoginButton({
  className,
  variant,
  size,
}: {
  className: string
  variant: VariantProps<typeof buttonVariants>['variant']
  size: VariantProps<typeof buttonVariants>['size']
}) {
  const { signIn } = useAuthActions()

  return (
    <Button
      className={className}
      onClick={() => void signIn('google', { redirectTo: window.location.href })}
      size={size}
      variant={variant}
    >
      <LogIn className="size-5" />
      Sign in
    </Button>
  )
}
