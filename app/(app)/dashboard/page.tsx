import { requireUser, isAdmin } from '@/lib/guard'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default async function DashboardPage() {
  const user = await requireUser()
  const admin = isAdmin(user)

  // 本月起始
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [myScore, myMonthScore, myReports, topThisMonth, pendingCount] = await Promise.all([
    db.contribution.aggregate({
      where: { userId: user.id, status: 'APPROVED' },
      _sum: { score: true }
    }),
    db.contribution.aggregate({
      where: { userId: user.id, status: 'APPROVED', occurredAt: { gte: monthStart } },
      _sum: { score: true }
    }),
    db.report.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    admin
      ? db.contribution.groupBy({
          by: ['userId'],
          where: { status: 'APPROVED', occurredAt: { gte: monthStart } },
          _sum: { score: true },
          orderBy: { _sum: { score: 'desc' } },
          take: 5
        })
      : Promise.resolve([]),
    admin
      ? db.contribution.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0)
  ])

  const topUserIds = (topThisMonth as { userId: string; _sum: { score: number | null } }[]).map((t) => t.userId)
  const topUsers = topUserIds.length
    ? await db.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true }
      })
    : []
  const topRows = (topThisMonth as { userId: string; _sum: { score: number | null } }[]).map((t) => ({
    user: topUsers.find((u) => u.id === t.userId)?.name ?? '未知',
    score: t._sum.score ?? 0
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">工作台</h1>
        <p className="text-sm text-gray-500 mt-1">你好，{user.name} · {user.role === 'OWNER' ? '所有者' : user.role === 'ADMIN' ? '管理员' : '成员'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="我的累计贡献分" value={(myScore._sum.score ?? 0).toFixed(1)} />
        <Stat label="本月贡献分" value={(myMonthScore._sum.score ?? 0).toFixed(1)} highlight />
        <Stat label="所在小组" value={user.group?.name ?? '未分组'} />
        <Stat label="我的身份" value={user.identity?.name ?? '未设置'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="我的最近汇报" extra={<Link href="/reports" className="text-sm text-primary-700 hover:underline">全部 →</Link>}>
          {myReports.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              还没有工作汇报，去 <Link href="/reports" className="link">提交一份</Link>
            </p>
          ) : (
            <ul className="space-y-2.5">
              {myReports.map((r) => (
                <li key={r.id} className="flex justify-between items-start pb-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{r.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {kindLabel(r.kind)} · {r.createdAt.toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {admin ? (
          <Card
            title="本月贡献榜 Top 5"
            extra={<Link href="/leaderboard" className="text-sm text-primary-700 hover:underline">完整榜单 →</Link>}
          >
            {topRows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">本月还没有确认的贡献</p>
            ) : (
              <ol className="space-y-2">
                {topRows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                        ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-800">{r.user}</span>
                    </div>
                    <span className="text-sm font-medium text-primary-700">{r.score.toFixed(1)} 分</span>
                  </li>
                ))}
              </ol>
            )}
            {pendingCount > 0 && (
              <div className="mt-4 p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700">
                有 <span className="font-semibold">{pendingCount}</span> 条贡献待审核，
                <Link href="/contributions" className="underline ml-1">去审核</Link>
              </div>
            )}
          </Card>
        ) : (
          <Card title="快捷入口">
            <div className="grid grid-cols-2 gap-3">
              <QuickLink href="/reports" title="提交汇报" desc="记录本周产出" />
              <QuickLink href="/contributions" title="记录贡献" desc="自报贡献分" />
              <QuickLink href="/leaderboard" title="团队榜单" desc="查看排名" />
              <QuickLink href="/appeals" title="发起申诉" desc="对审核有异议" />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-md border border-gray-200 shadow-card p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-semibold ${highlight ? 'text-primary-700' : 'text-gray-800'}`}>
        {value}
      </div>
    </div>
  )
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="p-3 rounded border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors">
      <div className="text-sm font-medium text-gray-800">{title}</div>
      <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
    </Link>
  )
}

function kindLabel(k: string) {
  return { DAILY: '日报', WEEKLY: '周报', MONTHLY: '月报', PROJECT: '项目', OTHER: '其他' }[k] ?? k
}
