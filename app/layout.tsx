import { AppSidebar } from '@/components/app-sidebar'
import { Providers } from '@/components/providers'
import { SidebarInset } from '@/components/ui/sidebar'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
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
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <Providers>
            <AppSidebar />
            <SidebarInset>{children}</SidebarInset>
            <Toaster position="top-center" reverseOrder={false} />
          </Providers>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
