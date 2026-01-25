'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import { Chat } from '@/convex/chat'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getErrorMessage } from '@/lib/convex-error'
import { useMutation } from 'convex/react'
import { Check, Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type ShareChatDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  chat: Chat
}

export function ShareChatDialog({ open, onOpenChange, chat }: ShareChatDialogProps) {
  const toggleShareStatus = useMutation(api.chat.toggleChatShareStatus)
  const [isToggling, setIsToggling] = useState(false)
  const { isCopied, copyToClipboard } = useCopyToClipboard()

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${chat.id}` : ''

  const handleToggleShare = async () => {
    setIsToggling(true)
    try {
      const result = await toggleShareStatus({ chatId: chat.id })
      if (result.isShared) {
        toast.success('Chat is now shared')
      } else {
        toast.success('Chat is no longer shared')
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle></DialogTitle>
      <DialogContent>
        {chat.isShared ? (
          <>
            <DialogHeader>
              <DialogTitle>Share chat</DialogTitle>
              <DialogDescription>Anyone with this link can view and fork this chat.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="flex-1" />
                <Button onClick={() => copyToClipboard(shareUrl)} size="icon" variant="outline">
                  {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <DialogFooter className="flex w-full items-center justify-between sm:justify-between">
              <Button onClick={handleToggleShare} disabled={isToggling} variant="destructive">
                {isToggling ? <Loader2 className="size-4 animate-spin" /> : 'Unshare'}
              </Button>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Share this chat?</DialogTitle>
              <DialogDescription>
                Anyone with the link will be able to view and fork their own version of this chat.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} variant="outline" disabled={isToggling}>
                Cancel
              </Button>
              <Button onClick={handleToggleShare} disabled={isToggling}>
                {isToggling ? <Loader2 className="size-4 animate-spin" /> : 'Share'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
