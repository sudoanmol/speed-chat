import { SettingsPage } from '@/components/settings-page'
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server'
import { redirect } from 'next/navigation'

export default async function SettingsRoutePage() {
  const token = await convexAuthNextjsToken()

  if (!token) {
    redirect('/')
  }

  return <SettingsPage />
}
