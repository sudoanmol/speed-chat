import { ImageGenerationContainer } from '@/components/image-generation-container'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { redirect } from 'next/navigation'

export default async function GenerateImagesPage() {
  const token = await convexAuthNextjsToken()

  if (!token) {
    redirect('/')
  }

  return <ImageGenerationContainer />
}
