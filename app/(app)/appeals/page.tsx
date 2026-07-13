import { requireUser, isAdmin } from '@/lib/guard'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Card } from '@/components/ui/Card'

async function createAppeal(formData: FormData) {
  'use server'
  const user = await requireUser()
  const contributionId = String(formData.get('contributionId'))
  const reason = String(formData.get('reason') || '').trim()
  if (!contributionId || !reason) return
  const contrib = await db.contribution.findUnique({ where: { id: contributionId } })
  if (!contrib || contrib.userId !== user.id) return
  await db.appeal.create({ data: { contributionId, userId: user.id, reason } })
  revalidatePath('/appeals')
}

async function handleAppeal(formData: FormData) {
  'use server'
  const admin = await requireUser()
  if (!isAdmin(admin)) return
  const id = String(formData.get('id'))
  const decision = String(formData.get('decision')) as 'ACCEPTED' | 'DECLINED'
  const handleNote = String(formData.get('handleNote') || '')
  const before = await db.appeal.findUnique({ where: { id }, include: { contribution: true } })
  if (!before) return

  await db.$transaction(async (tx) => {
    await tx.appeal.update({
      where: { id },
      data: { status: decision, handleNote, reviewedById: admin.id, reviewedAt: new Date() }
    })
    // 采纳申诉 → 把原 Contribution 状态改回 APPROVED（假定申诉针对 REJECTED 记录）
    if (decision === 'ACCEPTED') {
      await tx.contribution.update({
        where: { id: before.contributionId },
        data: { status: 'APPROVED', reviewedById: admin.id, reviewedAt: new Date() }
      })
    }
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: decision === 'ACCEPTED' ? 'ACCEPT_APPEAL' : 'DECLINE_APPEAL',
        target: `Appeal:${id}`,
        beforeJson: JSON.stringify({ status: before.status }),
        afterJson: JSON.stringify({ status: decision, note: handleNote })
      }
    })
  })
  revalidatePath('/appeals')
  revalidatePath('/leaderboard')
  revalidatePath('/dashboard')
}

export default async function AppealsPage() {
  const user = await requireUser()
  const admin = isAdmin(user)

  const [myAppeals, myRejected, pendingAppeals] = await Promise.all([
    db.appeal.findMany({
      where: { userId: user.id },
      include: { contribution: true, reviewedBy: true },
      orderBy: { createdAt: 'desc' },
      take: 30
    }),
    // 我被驳回、还没申诉过的 Contribution
    db.contribution.findMany({
      where: { userId: user.id, status: 'REJECTED', appeals: { none: {} } },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    admin
      ? db.appeal.findMany({
          where: { status: 'OPEN' },
          include: { contribution: true, user: true },
          orderBy: { createdAt: 'asc' }
        })
      : Promise.resolve([])
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          申诉处理
          {admin && pendingAppeals.length > 0 && (
            <span className="ml-2 text-base text-amber-600 font-normal">
              待处理 {pendingAppeals.length}
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {admin ? '处理成员对贡献审核结果的申诉' : '对被驳回的贡献发起申诉，等待管理员复核'}
        </p>
      </div>

      {admin && pendingAppeals.length > 0 && (
        <Card title="待处理申诉">
          <div className="space-y-4">
            {pendingAppeals.map((a) => (
              <div key={a.id} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-gray-800">
                    {a.user.name} 对「{a.contribution.title}」申诉
                  </div>
                  <div className="text-xs text-gray-500">{a.createdAt.toLocaleString('zh-CN')}</div>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  原贡献分：{a.contribution.score} · 原状态：{statusLabel(a.contribution.status)}
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="text-gray-500">申诉理由：</span>{a.reason}
                </p>
                {a.contribution.reviewNote && (
                  <p className="text-xs text-gray-500 mb-3">原审核备注：{a.contribution.reviewNote}</p>
                )}
                <form action={handleAppeal} className="flex gap-2 items-center">
                  <input type="hidden" name="id" value={a.id} />
                  <input name="handleNote" className="input flex-1" placeholder="处理备注（可选）" />
                  <button name="decision" value="ACCEPTED" className="btn-primary">采纳</button>
                  <button name="decision" value="DECLINED" className="btn-danger">拒绝</button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      {myRejected.length > 0 && (
        <Card title="可以发起申诉">
          <p className="text-xs text-gray-500 mb-3">以下是你的被驳回记录，如果你有异议，可以在这里发起申诉</p>
          <div className="space-y-4">
            {myRejected.map((c) => (
              <div key={c.id} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="mb-1">
                  <span className="font-medium text-gray-800">{c.title}</span>
                  <span className="ml-2 text-xs text-red-600">已驳回</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{c.description}</p>
                {c.reviewNote && <p className="text-xs text-gray-500 mb-2">审核备注：{c.reviewNote}</p>}
                <form action={createAppeal} className="mt-2 flex gap-2 items-center">
                  <input type="hidden" name="contributionId" value={c.id} />
                  <input name="reason" required className="input flex-1" placeholder="请说明申诉理由" />
                  <button className="btn-secondary">发起申诉</button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="我发起的申诉">
        {myAppeals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">还没有申诉记录</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>贡献</th>
                  <th>理由</th>
                  <th>状态</th>
                  <th>处理备注</th>
                </tr>
              </thead>
              <tbody>
                {myAppeals.map((a) => (
                  <tr key={a.id}>
                    <td className="text-gray-600 whitespace-nowrap">{a.createdAt.toLocaleDateString('zh-CN')}</td>
                    <td className="max-w-xs truncate">{a.contribution.title}</td>
                    <td className="max-w-xs truncate text-gray-600">{a.reason}</td>
                    <td><AppealStatusBadge status={a.status} /></td>
                    <td className="text-gray-500 text-xs">{a.handleNote ?? '—'}</td>
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

function statusLabel(s: string) {
  return { APPROVED: '已确认', REJECTED: '已驳回', PENDING: '待审核' }[s] ?? s
}

function AppealStatusBadge({ status }: { status: string }) {
  if (status === 'ACCEPTED') return <span className="badge-approved">已采纳</span>
  if (status === 'DECLINED') return <span className="badge-rejected">已拒绝</span>
  return <span className="badge-pending">待处理</span>
}
