import { requireUser } from '@/lib/guard'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Card } from '@/components/ui/Card'

async function submitReport(formData: FormData) {
  'use server'
  const user = await requireUser()
  const kind = String(formData.get('kind')) as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT' | 'OTHER'
  const title = String(formData.get('title') || '').trim()
  const content = String(formData.get('content') || '').trim()
  const evidenceUrl = String(formData.get('evidenceUrl') || '').trim() || null
  const periodFrom = String(formData.get('periodFrom') || '').trim()
  const periodTo = String(formData.get('periodTo') || '').trim()
  if (!title || !content) return
  await db.report.create({
    data: {
      userId: user.id,
      kind,
      title,
      content,
      evidenceUrl,
      periodFrom: periodFrom ? new Date(periodFrom) : null,
      periodTo: periodTo ? new Date(periodTo) : null
    }
  })
  revalidatePath('/reports')
  revalidatePath('/dashboard')
}

async function deleteReport(formData: FormData) {
  'use server'
  const user = await requireUser()
  const id = String(formData.get('id'))
  const report = await db.report.findUnique({ where: { id } })
  if (!report || report.userId !== user.id) return
  await db.report.delete({ where: { id } })
  revalidatePath('/reports')
}

export default async function ReportsPage() {
  const user = await requireUser()
  const reports = await db.report.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">工作汇报</h1>
        <p className="text-sm text-gray-500 mt-1">提交你的日报、周报、月报或项目汇报</p>
      </div>

      <Card title="新建汇报">
        <form action={submitReport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">类型</label>
              <select name="kind" className="input" defaultValue="WEEKLY">
                <option value="DAILY">日报</option>
                <option value="WEEKLY">周报</option>
                <option value="MONTHLY">月报</option>
                <option value="PROJECT">项目汇报</option>
                <option value="OTHER">其他</option>
              </select>
            </div>
            <div>
              <label className="label">周期起始（可选）</label>
              <input type="date" name="periodFrom" className="input" />
            </div>
            <div>
              <label className="label">周期截止（可选）</label>
              <input type="date" name="periodTo" className="input" />
            </div>
          </div>

          <div>
            <label className="label">标题</label>
            <input name="title" className="input" required
                   placeholder="如：2026-W28 周报 / XX 项目二期上线" />
          </div>

          <div>
            <label className="label">内容</label>
            <textarea name="content" rows={6} className="input" required
                      placeholder="本期完成了什么、遇到什么问题、下期计划" />
          </div>

          <div>
            <label className="label">附件链接（可选）</label>
            <input name="evidenceUrl" className="input"
                   placeholder="PR / 文档 / 幻灯片 / 截图链接" />
          </div>

          <button className="btn-primary">提交汇报</button>
        </form>
      </Card>

      <Card title={`我的汇报（${reports.length}）`}>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">还没有汇报</p>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 mr-2">
                      {kindLabel(r.kind)}
                    </span>
                    <span className="font-medium text-gray-800">{r.title}</span>
                  </div>
                  <form action={deleteReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs text-gray-400 hover:text-red-600">删除</button>
                  </form>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {r.createdAt.toLocaleDateString('zh-CN')}
                  {r.periodFrom && r.periodTo && (
                    <> · 周期 {r.periodFrom.toLocaleDateString('zh-CN')} → {r.periodTo.toLocaleDateString('zh-CN')}</>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
                {r.evidenceUrl && (
                  <a href={r.evidenceUrl} target="_blank" rel="noreferrer" className="link text-sm mt-2 inline-block">
                    附件 ↗
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function kindLabel(k: string) {
  return { DAILY: '日报', WEEKLY: '周报', MONTHLY: '月报', PROJECT: '项目', OTHER: '其他' }[k] ?? k
}
