'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/dashboard',     label: '工作台',   icon: DashboardIcon },
  { href: '/reports',       label: '工作汇报', icon: ReportIcon },
  { href: '/contributions', label: '贡献记录', icon: ContribIcon },
  { href: '/leaderboard',   label: '团队榜单', icon: LeaderIcon },
  { href: '/appeals',       label: '申诉处理', icon: AppealIcon },
  { href: '/admin',         label: '系统管理', icon: AdminIcon, adminOnly: true }
]

export function SideNav({ admin }: { admin: boolean }) {
  const pathname = usePathname()
  const visible = items.filter((it) => admin || !it.adminOnly)
  return (
    <nav className="py-4 px-2 space-y-0.5">
      {visible.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + '/')
        const Icon = it.icon
        return (
          <Link
            key={it.href}
            href={it.href}
            className={
              'flex items-center gap-2.5 px-3 h-9 rounded-md text-sm transition-colors ' +
              (active
                ? 'bg-primary-50 text-primary-800 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
            }
          >
            <Icon active={active} />
            <span>{it.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function iconProps(active: boolean) {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: active ? 2 : 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}
function ReportIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M4 4h12l4 4v12H4z" />
      <path d="M14 4v6h6" />
      <path d="M8 14h8M8 18h5" />
    </svg>
  )
}
function ContribIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 2l2.4 6.9H22l-6 4.6 2.3 7L12 16l-6.3 4.5 2.3-7-6-4.6h7.6z" />
    </svg>
  )
}
function LeaderIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <rect x="4"  y="12" width="4" height="8" rx="0.5" />
      <rect x="10" y="7"  width="4" height="13" rx="0.5" />
      <rect x="16" y="10" width="4" height="10" rx="0.5" />
    </svg>
  )
}
function AppealIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <path d="M12 3l9 4v5c0 5-3.5 8.5-9 10-5.5-1.5-9-5-9-10V7l9-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
function AdminIcon({ active }: { active: boolean }) {
  return (
    <svg {...iconProps(active)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1c.5.5 1.2.6 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1c0 .7.4 1.3 1 1.5.6.3 1.3.1 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1c-.7 0-1.3.4-1.5 1z" />
    </svg>
  )
}
