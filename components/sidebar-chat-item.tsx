import { ConfirmationDialog } from '@/components/confirmation-dialog'
import { ShareChatDialog } from '@/components/share-chat-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/convex/_generated/api'
import type { Chat } from '@/convex/chat'
import { useIsMobile } from '@/hooks/use-mobile'
import { getErrorMessage } from '@/lib/convex-error'
import { useMutation } from 'convex/react'
import { GitBranch, Link2, Link2Off, Loader2, MoreHorizontal, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useChatConfigStore } from '@/lib/stores/chat-config-store'

export function SidebarChatItem({ chat }: { chat: Chat }) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const currentChatId = useChatConfigStore((s) => s.chatId)
  const [isRenamingChat, setIsRenamingChat] = useState(false)
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null)
  const [newChatTitle, setNewChatTitle] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)

  const deleteChat = useMutation(api.delete.deleteChat)
  const pinChat = useMutation(api.chatActions.pinChat)
  const renameChatTitle = useMutation(api.chatActions.renameChatTitle)

  const clearInput = () => {
    setIsRenamingChat(false)
    setRenamingChatId(null)
    setNewChatTitle('')
  }

  const handleDeleteChat = async () => {
    if (chat.id === currentChatId) {
      router.push('/')
    }
    setIsDeleting(true)
    try {
      await deleteChat({ chatId: chat.id })
      toast.success('Chat deleted')
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SidebarMenuItem key={chat.id}>
      <SidebarMenuButton asChild={!(isRenamingChat && chat.id === renamingChatId)} isActive={currentChatId === chat.id}>
        {isRenamingChat && chat.id === renamingChatId ? (
          <Input
            className="w-full border-none bg-transparent! px-0 shadow-none focus-visible:ring-0"
            onBlur={clearInput}
            onChange={(e) => setNewChatTitle(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                if (!newChatTitle.trim()) {
                  toast.error('Chat title cannot be empty')
                  return
                }

                try {
                  await renameChatTitle({
                    chatId: chat.id,
                    newTitle: newChatTitle,
                  })
                } catch (error) {
                  toast.error(getErrorMessage(error))
                }
                clearInput()
              } else if (e.key === 'Escape') {
                clearInput()
              }
            }}
            ref={renameInputRef}
            value={newChatTitle}
          />
        ) : (
          <Link className="flex w-full items-center gap-2" href={`/chat/${chat.id}`}>
            {chat.isBranch && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <GitBranch className="size-4" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Branched from {chat.parentChatId}</TooltipContent>
              </Tooltip>
            )}
            <span className="truncate">{chat.title}</span>
          </Link>
        )}
      </SidebarMenuButton>
      {false ? (
        <SidebarMenuAction className="top-2!">
          <Loader2 className="size-4 animate-spin" />
          <span className="sr-only">Loading</span>
        </SidebarMenuAction>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="top-2! cursor-pointer" showOnHover>
              <MoreHorizontal />
              <span className="sr-only">Chat Actions</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isMobile ? 'end' : 'start'}
            className="w-fit rounded-lg"
            onCloseAutoFocus={(e) => {
              if (isRenamingChat) {
                e.preventDefault()
              }
            }}
            side={isMobile ? 'bottom' : 'right'}
          >
            <DropdownMenuItem
              onClick={async () => {
                {
                  try {
                    await pinChat({
                      chatId: chat.id,
                      isPinned: !chat.isPinned,
                    })
                  } catch (error) {
                    toast.error(getErrorMessage(error))
                  }
                }
              }}
            >
              {chat.isPinned ? <PinOff /> : <Pin />}
              <span>{chat.isPinned ? 'Unpin' : 'Pin'}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsRenamingChat(true)
                setRenamingChatId(chat.id)
                setNewChatTitle(chat.title)
                setTimeout(() => {
                  renameInputRef.current?.focus()
                  renameInputRef.current?.select()
                }, 100)
              }}
            >
              <Pencil />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
              {chat.isShared ? <Link2Off /> : <Link2 />}
              <span>{chat.isShared ? 'Unshare' : 'Share'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                // If Shift key is pressed, delete immediately without confirmation
                if (e.shiftKey) {
                  handleDeleteChat()
                } else {
                  setShowDeleteDialog(true)
                }
              }}
              variant="destructive"
            >
              <Trash2 />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDeleteChat}
        title="Delete chat"
        description="Are you sure you want to delete this chat? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
      <ShareChatDialog open={showShareDialog} onOpenChange={setShowShareDialog} chat={chat} />
    </SidebarMenuItem>
  )
}
