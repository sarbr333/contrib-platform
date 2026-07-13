import { requireUser } from '@/lib/guard'
import { db } from '@/lib/db'
import { Card } from '@/components/ui/Card'

export default async function LeaderboardPage({
  searchParams
}: { searchParams: Promise<{ range?: string; groupId?: string }> }) {
  const user = await requireUser()
  const params = await searchParams
  const range = params.range === 'month' ? 'month' : params.range === 'year' ? 'year' : 'all'
  const groupId = params.groupId || null

  const now = new Date()
  const from =
    range === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : range === 'year'
        ? new Date(now.getFullYear(), 0, 1)
        : null

  const rows = await db.contribution.groupBy({
    by: ['userId'],
    where: {
      status: 'APPROVED',
      ...(from ? { occurredAt: { gte: from } } : {}),
      ...(groupId ? { user: { groupId } } : {})
    },
    _sum: { score: true },
    _count: { _all: true },
    orderBy: { _sum: { score: 'desc' } },
    take: 100
  })

  const users = rows.length
    ? await db.user.findMany({
        where: { id: { in: rows.map((r) => r.userId) } },
        include: { group: true, identity: true }
      })
    : []
  const uMap = new Map(users.map((u) => [u.id, u]))

  const groups = await db.group.findMany({ orderBy: { sortOrder: 'asc' } })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">团队榜单</h1>
          <p className="text-sm text-gray-500 mt-1">按已确认贡献分排序</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <RangeTab current={range} value="month" label="本月" />
          <RangeTab current={range} value="year"  label="本年" />
          <RangeTab current={range} value="all"   label="全部" />
          {groups.length > 0 && (
            <form className="inline-flex">
              <input type="hidden" name="range" value={range} />
              <select
                name="groupId"
                defaultValue={groupId ?? ''}
                className="input h-9 w-40"
              >
                <option value="">全部小组</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <noscript>
                <button className="btn-secondary ml-2">筛选</button>
              </noscript>
              <script dangerouslySetInnerHTML={{ __html: `
                document.currentScript.previousElementSibling.addEventListener('change', function(e) {
                  var url = new URL(location.href);
                  url.searchParams.set('range', '${range}');
                  if (e.target.value) url.searchParams.set('groupId', e.target.value);
                  else url.searchParams.delete('groupId');
                  location.href = url.toString();
                });
              ` }} />
            </form>
          )}
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">暂无已确认的贡献记录</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-16">排名</th>
                  <th>姓名</th>
                  <th>身份</th>
                  <th>小组</th>
                  <th>贡献分</th>
                  <th>记录数</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const u = uMap.get(r.userId)
                  const isMe = r.userId === user.id
                  return (
                    <tr key={r.userId} className={isMe ? 'bg-primary-50/40' : ''}>
                      <td>
                        <RankBadge rank={i + 1} />
                      </td>
                      <td className="font-medium">
                        {u?.name ?? '（已注销）'}
                        {isMe && <span className="ml-1.5 text-xs text-primary-700">（我）</span>}
                      </td>
                      <td className="text-gray-600">{u?.identity?.name ?? '—'}</td>
                      <td className="text-gray-600">{u?.group?.name ?? '—'}</td>
                      <td className="font-semibold text-primary-700">{(r._sum.score ?? 0).toFixed(1)}</td>
                      <td className="text-gray-500">{r._count._all}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function RangeTab({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value
  return (
    <a
      href={`?range=${value}`}
      className={
        'inline-flex items-center h-9 px-3 rounded text-sm transition-colors ' +
        (active
          ? 'bg-primary-700 text-white'
          : 'bg-white text-gray-600 border border-gray-300 hover:border-primary-500')
      }
    >
      {label}
    </a>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const cls = rank === 1
    ? 'bg-amber-100 text-amber-700'
    : rank === 2
      ? 'bg-gray-200 text-gray-700'
      : rank === 3
        ? 'bg-orange-100 text-orange-700'
        : 'bg-gray-50 text-gray-500'
  return (
    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-semibold ${cls}`}>
      {rank}
    </span>
  )
}
