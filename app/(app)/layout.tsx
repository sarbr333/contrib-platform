import Link from 'next/link'
import { requireUser, isAdmin } from '@/lib/guard'
import { signOut } from '@/lib/auth'
import { BrandMark } from '@/components/ui/BrandMark'
import { SideNav } from './SideNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const admin = isAdmin(user)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="h-14 bg-primary-900 text-white flex items-center justify-between px-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-white">
            <BrandMarkInverted />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-primary-100">
            <span className="opacity-80">{user.name}</span>
            <span className="opacity-50 mx-1.5">·</span>
            <span className="opacity-60 text-xs">{user.email}</span>
          </div>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
            <button className="px-3 h-8 rounded text-sm text-white/90 hover:bg-white/10 transition-colors">
              退出登录
            </button>
          </form>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-56 bg-white border-r border-gray-200 shrink-0">
          <SideNav admin={admin} />
        </aside>
        <main className="flex-1 min-w-0 p-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}

function BrandMarkInverted() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-md bg-white/15 backdrop-blur flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2.2}
             strokeLinecap="round" strokeLinejoin="round" className="text-white">
          <path d="M12 3v18M3 12h18M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7" />
        </svg>
      </div>
      <span className="text-base font-semibold whitespace-nowrap">北极星团队贡献度管理平台</span>
    </div>
  )
}
