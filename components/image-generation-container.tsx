'use client'

import { api } from '@/convex/_generated/api'
import { useQueryWithStatus } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useDocumentTitle } from 'usehooks-ts'
import { Header } from './header'
import { ImageGenerationForm } from './image-generation-form'
import { ImageGenerationGallery } from './image-generation-gallery'
import { SearchDialog } from './search-dialog'

export function ImageGenerationContainer() {
  useDocumentTitle('Speed Chat - Generate Images')
  const router = useRouter()
  const [openSearchDialog, setOpenSearchDialog] = useState(false)

  const { data: generations, isPending } = useQueryWithStatus(api.imageGeneration.getUserGenerations, {
    limit: 50,
  })

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
          <ImageGenerationGallery generations={generations ?? []} isLoading={isPending} />
        </div>
      </div>
      <SearchDialog open={openSearchDialog} onOpenChange={setOpenSearchDialog} />
    </div>
  )
}
