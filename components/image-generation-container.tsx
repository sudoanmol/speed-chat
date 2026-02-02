'use client'

import { api } from '@/convex/_generated/api'
import { usePaginatedQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useDocumentTitle } from 'usehooks-ts'
import { Header } from './header'
import { ImageGenerationForm } from './image-generation-form'
import { ImageGenerationGallery } from './image-generation-gallery'
import { SearchDialog } from './search-dialog'

const PAGE_SIZE = 20

export function ImageGenerationContainer() {
  useDocumentTitle('Speed Chat - Generate Images')
  const router = useRouter()
  const [openSearchDialog, setOpenSearchDialog] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { results, status, loadMore } = usePaginatedQuery(
    api.imageGeneration.getUserGenerations,
    {},
    { initialNumItems: PAGE_SIZE }
  )
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

  useHotkeys('meta+k, ctrl+k', () => setOpenSearchDialog(true), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    enableOnContentEditable: true,
  })
  useHotkeys('meta+shift+o, ctrl+shift+o', () => router.push('/'), {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    enableOnContentEditable: true,
  })

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-4 pt-16 pb-8 md:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="mb-6 text-2xl font-semibold">Generate Images</h1>
          <ImageGenerationForm />
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <h2 className="mb-4 text-lg font-medium">Your Generations</h2>
          <ImageGenerationGallery generations={results} isLoading={isPending} />

          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isLoadingMore && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </div>
      </div>
      <SearchDialog open={openSearchDialog} onOpenChange={setOpenSearchDialog} />
    </div>
  )
}
