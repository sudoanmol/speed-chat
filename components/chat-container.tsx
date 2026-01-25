'use client'

import { ChatProvider, useChatContext } from '@/lib/stores/chat-store'
import { useConvexAuth } from 'convex/react'
import { ArrowDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useHotkeys } from 'react-hotkeys-hook'
import { toast } from 'sonner'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { ChatInput } from './chat-input'
import { Header } from './header'
import { Messages } from './messages'
import { SearchDialog } from './search-dialog'
import { Button } from './ui/button'

export function ChatContainerParent({ paramsChatId }: { paramsChatId: string }) {
  return (
    <ChatProvider paramsChatId={paramsChatId}>
      <ChatContainer paramsChatId={paramsChatId} />
    </ChatProvider>
  )
}

function ChatContainer({ paramsChatId }: { paramsChatId: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { messages, isLoadingMessages } = useChatContext()
  const noActiveChat = !paramsChatId && messages.length === 0
  const [droppedFiles, setDroppedFiles] = useState<File[]>([])
  const router = useRouter()
  const [openSearchDialog, setOpenSearchDialog] = useState(false)

  useHotkeys('meta+k, ctrl+k', () => setOpenSearchDialog(true), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    enableOnContentEditable: true,
  })
  useHotkeys('meta+shift+o, ctrl+shift+o', () => router.push('/'), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    enableOnContentEditable: true,
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to attach files')
        return
      }
      setDroppedFiles((prev) => [...prev, ...acceptedFiles])
    },
    accept: {
      'image/*': [],
      'application/pdf': ['.pdf'],
    },
    noClick: true,
    noKeyboard: true,
    onDropRejected: () => {
      toast.error('Only image and PDF files are allowed')
    },
  })

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  return (
    <div {...getRootProps()} className="relative flex h-screen flex-col overflow-hidden">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="border-border bg-primary/10 absolute inset-0 z-50 flex items-center justify-center border border-dashed backdrop-blur-sm">
          <p className="text-primary text-xl font-medium">Drop files here. Only image and PDF files are allowed.</p>
        </div>
      )}
      <Header />
      {noActiveChat ? (
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 md:px-0">
          <h1 className="text-2xl md:text-3xl">How can I help you today?</h1>
          <ChatInput
            isDragActive={isDragActive}
            droppedFiles={droppedFiles}
            setDroppedFiles={setDroppedFiles}
            noActiveChat={noActiveChat}
          />
        </div>
      ) : (
        <StickToBottom className="relative min-h-0 flex-1" resize="instant" initial="instant">
          <StickToBottom.Content className="flex w-full flex-col px-4 pb-32 md:px-0">
            {isLoadingMessages ? null : <Messages />}
          </StickToBottom.Content>
          <ScrollToBottom />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2">
            <div className="pointer-events-auto">
              <ChatInput
                isDragActive={isDragActive}
                droppedFiles={droppedFiles}
                setDroppedFiles={setDroppedFiles}
                noActiveChat={noActiveChat}
              />
            </div>
          </div>
        </StickToBottom>
      )}
      <SearchDialog open={openSearchDialog} onOpenChange={setOpenSearchDialog} />
    </div>
  )
}

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  return (
    !isAtBottom && (
      <div className="absolute bottom-34 left-1/2 -translate-x-1/2">
        <Button
          size="icon-sm"
          variant="outline"
          onClick={() => scrollToBottom()}
          className="bg-background! rounded-full shadow-md"
        >
          <ArrowDown className="size-4" />
        </Button>
      </div>
    )
  )
}
