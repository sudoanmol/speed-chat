import { useConvexAuth } from 'convex/react'
import { LoginButton } from './app-sidebar'
import { ThemeToggle } from './theme-toggle'
import { SidebarTrigger } from './ui/sidebar'

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth()

  return (
    <header className="absolute top-0 left-0 z-10 flex h-12 w-full items-center justify-between px-3">
      <SidebarTrigger className="bg-transparent backdrop-blur-sm" />
      <div className="flex items-center justify-center gap-1.5">
        <ThemeToggle />
        {!isAuthenticated && !isLoading && <LoginButton className="flex md:hidden" variant="default" size="sm" />}
      </div>
    </header>
  )
}
