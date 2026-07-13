import { requireUser, isAdmin } from '@/lib/guard'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'

async function submitContrib(formData: FormData) {
  'use server'
  const user = await requireUser()
  const category = String(formData.get('category')) as
    'DELIVERY' | 'COLLAB' | 'INNOVATION' | 'LEARNING' | 'MENTORING' | 'OTHER'
  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const score = Math.max(0, Number(formData.get('score') || 0))
  const evidenceUrl = String(formData.get('evidenceUrl') || '').trim() || null
  if (!title || !description || score <= 0) return
  await db.contribution.create({
    data: { userId: user.id, category, title, description, score, evidenceUrl }
  })
  revalidatePath('/contributions')
  revalidatePath('/dashboard')
}

async function reviewContrib(formData: FormData) {
  'use server'
  const admin = await requireUser()
  if (!isAdmin(admin)) return
  const id = String(formData.get('id'))
  const decision = String(formData.get('decision')) as 'APPROVED' | 'REJECTED'
  const note = String(formData.get('note') || '')
  const before = await db.contribution.findUnique({ where: { id } })
  if (!before) return
  await db.$transaction([
    db.contribution.update({
      where: { id },
      data: { status: decision, reviewNote: note, reviewedById: admin.id, reviewedAt: new Date() }
    }),
    db.auditLog.create({
      data: {
        actorId: admin.id,
        action: decision === 'APPROVED' ? 'APPROVE_CONTRIB' : 'REJECT_CONTRIB',
        target: `Contribution:${id}`,
        beforeJson: JSON.stringify({ status: before.status }),
        afterJson: JSON.stringify({ status: decision, note })
      }
    })
  ])
  revalidatePath('/contributions')
  revalidatePath('/leaderboard')
  revalidatePath('/dashboard')
}

export default async function ContributionsPage() {
  const user = await requireUser()
  const admin = isAdmin(user)

  const [myRows, pendingRows] = await Promise.all([
    db.contribution.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    }),
    admin
      ? db.contribution.findMany({
          where: { status: 'PENDING' },
          include: { user: true },
          orderBy: { createdAt: 'asc' }
        })
      : Promise.resolve([])
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">贡献记录</h1>
        <p className="text-sm text-gray-500 mt-1">
          记录你的具体贡献，管理员审核通过后计入榜单
        </p>
      </div>

      <Card title="记录一笔新贡献">
        <form action={submitContrib} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">类别</label>
              <select name="category" className="input">
                <option value="DELIVERY">交付产出</option>
                <option value="COLLAB">协作支持</option>
                <option value="INNOVATION">创新突破</option>
                <option value="LEARNING">学习成长</option>
                <option value="MENTORING">带教辅导</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <div>
              <label className="label">建议贡献分</label>
              <input name="score" type="number" min="0.5" step="0.5" defaultValue="1"
                     className="input" required />
            </div>
            <div>
              <label className="label">证据链接（可选）</label>
              <input name="evidenceUrl" className="input" placeholder="PR / 文档链接" />
            </div>
          </div>
          <div>
            <label className="label">标题</label>
            <input name="title" className="input" required
                   placeholder="一句话说清做了什么" />
          </div>
          <div>
            <label className="label">详细描述</label>
            <textarea name="description" rows={4} className="input" required
                      placeholder="产出、影响、耗时、协作方等" />
          </div>
          <button className="btn-primary">提交（等待审核）</button>
        </form>
      </Card>

      {admin && pendingRows.length > 0 && (
        <Card title={`待审核 · ${pendingRows.length}`} extra={<span className="text-xs text-amber-600">管理员视图</span>}>
          <div className="space-y-4">
            {pendingRows.map((c) => (
              <div key={c.id} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 mr-2">
                      {categoryLabel(c.category)}
                    </span>
                    <span className="font-medium text-gray-800">{c.title}</span>
                    <span className="ml-2 text-sm text-primary-700">{c.score} 分</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.user.name} · {c.createdAt.toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{c.description}</p>
                {c.evidenceUrl && (
                  <a href={c.evidenceUrl} target="_blank" rel="noreferrer" className="link text-sm">证据 ↗</a>
                )}
                <form action={reviewContrib} className="mt-3 flex gap-2 items-center">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="note" className="input flex-1" placeholder="审核备注（可选）" />
                  <button name="decision" value="APPROVED" className="btn-primary">确认</button>
                  <button name="decision" value="REJECTED" className="btn-danger">驳回</button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={`我的贡献记录 · ${myRows.length}`}>
        {myRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">还没有记录</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>类别</th>
                  <th>标题</th>
                  <th>分数</th>
                  <th>状态</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {myRows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-gray-600 whitespace-nowrap">{r.createdAt.toLocaleDateString('zh-CN')}</td>
                    <td>{categoryLabel(r.category)}</td>
                    <td className="max-w-xs truncate">{r.title}</td>
                    <td className="font-medium text-primary-700">{r.score}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-gray-500 text-xs">{r.reviewNote ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function categoryLabel(c: string) {
  return {
    DELIVERY: '交付',
    COLLAB: '协作',
    INNOVATION: '创新',
    LEARNING: '学习',
    MENTORING: '带教',
    OTHER: '其他'
  }[c] ?? c
}
