import { useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'
import { cn } from '@/lib/cn'

interface AppShellProps {
  title: string
  children: ReactNode
}

export function AppShell({ title, children }: AppShellProps) {
  const { user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [, setSidebarCollapsed] = useState(false)

  const handleCollapsedChange = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }, [])

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-neutral-25">
      <Sidebar role={user.role} onCollapsedChange={handleCollapsedChange} />
      <MobileNav role={user.role} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out',
        )}
      >
        <Topbar title={title} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
