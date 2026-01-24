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
import { getErrorMessage } from '@/lib/error'
import { useQueryWithStatus } from '@/lib/utils'
import { useAuthActions } from '@convex-dev/auth/react'
import { VariantProps } from 'class-variance-authority'
import { useMutation, useQuery } from 'convex/react'
import { Key, LogIn, LogOut, MessageSquare, Monitor, Moon, PenBox, Search, Sun, Trash, UserX } from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { ConfirmationDialog } from './confirmation-dialog'
import { useChatConfig } from './providers/chat-config-provider'
import { useDialogs } from './providers/dialogs-provider'
import { SidebarChatItem } from './sidebar-chat-item'
import { Button, buttonVariants } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Kbd, KbdGroup } from './ui/kbd'

export function AppSidebar() {
  const user = useQuery(api.users.getCurrentUser)
  const isUserLoading = user === undefined
  const { signOut } = useAuthActions()
  const router = useRouter()
  const { chatId } = useChatConfig()
  const { setOpenSearchDialog, setOpenApiKeyDialog } = useDialogs()
  const { theme, setTheme } = useTheme()
  const [openDeleteAllChatsDialog, setOpenDeleteAllChatsDialog] = useState(false)
  const [isDeleteAllChatsLoading, setIsDeleteAllChatsLoading] = useState(false)
  const [openDeleteAccountDialog, setOpenDeleteAccountDialog] = useState(false)
  const [isDeleteAccountLoading, setIsDeleteAccountLoading] = useState(false)

  const {
    data: chats,
    error,
    isSuccess,
    isPending,
    isError,
  } = useQueryWithStatus(api.chat.getAllChats, user ? {} : 'skip')

  const deleteAllChats = useMutation(api.delete.deleteAllChats)
  const deleteAccount = useMutation(api.delete.deleteAccount)

  useEffect(() => {
    if (isError) {
      toast.error(error.message)
    }
  }, [isError, error])

  const pinnedChats = useMemo(() => {
    return chats?.filter((chat) => chat.isPinned)
  }, [chats])

  const unpinnedChats = useMemo(() => {
    return chats?.filter((chat) => !chat.isPinned)
  }, [chats])

  const currentChat = useMemo(() => {
    return chats?.find((chat) => chat.id === chatId)
  }, [chats, chatId])

  useEffect(() => {
    if (currentChat) {
      document.title = `${currentChat.title} | Speed Chat`
    }
  }, [currentChat])

  return (
    <>
      <Sidebar variant="inset">
        <SidebarHeader className="flex flex-col items-center">
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
            </SidebarMenu>
          </SidebarGroup>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="flex flex-1 flex-col">
            {!user && !isUserLoading ? (
              <div className="text-muted-foreground mx-auto my-auto flex text-sm">
                Please sign in to view your chats.
              </div>
            ) : isPending || (isSuccess && chats?.length === 0) ? null : (
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
              </>
            )}
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {isUserLoading ? (
            <SidebarMenuSkeleton showIcon={true} />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex h-12 w-full items-center justify-start gap-3 rounded-lg px-2 pb-0"
                  variant="ghost"
                >
                  <Image src={user.image ?? ''} alt={user.name ?? ''} width={30} height={30} className="rounded-full" />
                  <span className="truncate text-sm font-normal">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm leading-none font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="absolute size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span className="ml-6">Toggle theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                      <DropdownMenuRadioItem value="light">
                        <Sun />
                        Light
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <Moon />
                        Dark
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="system">
                        <Monitor />
                        System
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => setOpenApiKeyDialog(true)}>
                  <Key />
                  Configure API Key
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await signOut()
                      router.push('/')
                    } catch (error) {
                      toast.error(getErrorMessage(error))
                    }
                  }}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setOpenDeleteAllChatsDialog(true)}>
                  <Trash />
                  Delete all chats
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setOpenDeleteAccountDialog(true)}>
                  <UserX />
                  Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginButton className="flex w-full" variant="outline" size="lg" />
          )}
        </SidebarFooter>
      </Sidebar>

      <ConfirmationDialog
        open={openDeleteAllChatsDialog}
        onOpenChange={(open) => {
          setOpenDeleteAllChatsDialog(open)
        }}
        onConfirm={async () => {
          try {
            setIsDeleteAllChatsLoading(true)
            await deleteAllChats()
            toast.success('All chats deleted successfully')
            setOpenDeleteAllChatsDialog(false)
            router.push('/')
          } catch (error) {
            toast.error(getErrorMessage(error))
          } finally {
            setIsDeleteAllChatsLoading(false)
          }
        }}
        title="Delete All Chats"
        description="Are you sure you want to delete all your chats? This action cannot be undone."
        confirmText="Delete All Chats"
        isLoading={isDeleteAllChatsLoading}
      />

      <ConfirmationDialog
        open={openDeleteAccountDialog}
        onOpenChange={(open) => {
          setOpenDeleteAccountDialog(open)
        }}
        onConfirm={async () => {
          try {
            setIsDeleteAccountLoading(true)
            await deleteAccount()
            toast.success('Account deleted successfully')
            setOpenDeleteAccountDialog(false)
            router.push('/')
            router.refresh()
          } catch (error) {
            toast.error(getErrorMessage(error))
          } finally {
            setIsDeleteAccountLoading(false)
          }
        }}
        title="Delete Account"
        description="Are you sure you want to delete your account? This will permanently delete all your chats and data. This action cannot be undone."
        confirmText="Delete Account"
        isLoading={isDeleteAccountLoading}
      />
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
