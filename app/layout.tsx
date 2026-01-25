import { AppSidebar } from '@/components/app-sidebar'
import { ConvexProvider } from '@/components/convex-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Speed Chat',
  description: 'An AI chatbot like ChatGPT',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ConvexProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <AppSidebar />
                <SidebarInset>{children}</SidebarInset>
                <Toaster richColors />
              </ThemeProvider>
            </SidebarProvider>
          </ConvexProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
