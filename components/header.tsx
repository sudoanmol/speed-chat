import { useConvexAuth } from 'convex/react'
import { usePathname } from 'next/navigation'
import { LoginButton } from './app-sidebar'
import { ThemeToggle } from './theme-toggle'
import { SidebarTrigger } from './ui/sidebar'

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const pathname = usePathname()
  const shouldShowSidebarTrigger = !pathname.startsWith('/settings')

  return (
    <header className="absolute top-0 left-0 z-10 flex h-12 w-full items-center justify-between px-3.5">
      {shouldShowSidebarTrigger ? (
        <SidebarTrigger className="bg-transparent backdrop-blur-sm" />
      ) : (
        <div className="size-9" aria-hidden="true" />
      )}
      <div className="flex items-center justify-center gap-1.5">
        <ThemeToggle />
        {!isAuthenticated && !isLoading && <LoginButton className="flex md:hidden" variant="default" size="sm" />}
      </div>
    </header>
  )
}
