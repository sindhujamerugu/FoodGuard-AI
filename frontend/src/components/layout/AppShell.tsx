import { useState, type ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'

interface AppShellProps {
  title: string
  children: ReactNode
}

export function AppShell({ title, children }: AppShellProps) {
  const { user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-neutral-25">
      <Sidebar role={user.role} />
      <MobileNav role={user.role} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
