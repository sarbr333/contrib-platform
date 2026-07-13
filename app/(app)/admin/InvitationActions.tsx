'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Invitation = {
  id: string
  token: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  groupName: string | null
  note: string | null
  createdAt: string
  expiresAt: string | null
  usedAt: string | null
}

type Group = { id: string; name: string }

export function InvitationActions({
  groups,
  invitations
}: {
  groups: Group[]
  invitations: Invitation[]
}) {
  const router = useRouter()
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [groupId, setGroupId] = useState<string>('')
  const [note, setNote] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number | ''>(14)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const create = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        groupId: groupId || null,
        note: note || undefined,
        expiresInDays: typeof expiresInDays === 'number' ? expiresInDays : undefined
      })
    })
    setLoading(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? '创建失败')
      return
    }
    setNote('')
    router.refresh()
  }

  const remove = async (id: string) => {
    if (!confirm('删除这条邀请？')) return
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(j.error ?? '删除失败')
      return
    }
    router.refresh()
  }

  const linkOf = (token: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/register?invitationToken=${token}`

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(linkOf(token))
      setCopied(token)
      setTimeout(() => setCopied((v) => (v === token ? null : v)), 1600)
    } catch {
      alert('复制失败，请手动复制')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}>
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">— 不指定小组 —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input
          type="number" min={1} max={90} className="input"
          placeholder="有效期（天）"
          value={expiresInDays}
          onChange={(e) => {
            const v = e.target.value
            setExpiresInDays(v === '' ? '' : Number(v))
          }}
        />
        <input
          className="input"
          placeholder="备注（可选）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn-primary" onClick={create} disabled={loading}>
          {loading ? '生成中…' : '生成邀请链接'}
        </button>
      </div>

      {invitations.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">还没有邀请</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>角色</th>
                <th>小组</th>
                <th>备注</th>
                <th>状态</th>
                <th>过期</th>
                <th className="text-right pr-5">操作</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((i) => {
                const expired = !!i.expiresAt && new Date(i.expiresAt) < new Date()
                const status = i.usedAt ? '已使用' : expired ? '已过期' : '有效'
                const statusClass = i.usedAt
                  ? 'text-gray-400'
                  : expired
                    ? 'text-red-600'
                    : 'text-primary-700'
                return (
                  <tr key={i.id}>
                    <td className="font-mono text-xs text-gray-600 max-w-[180px] truncate">{i.token}</td>
                    <td>{i.role}</td>
                    <td className="text-gray-600">{i.groupName ?? '—'}</td>
                    <td className="text-gray-600">{i.note ?? '—'}</td>
                    <td className={statusClass}>{status}</td>
                    <td className="text-xs text-gray-500">
                      {i.expiresAt ? new Date(i.expiresAt).toLocaleDateString('zh-CN') : '永久'}
                    </td>
                    <td className="text-right pr-5">
                      <div className="inline-flex gap-1">
                        {!i.usedAt && !expired && (
                          <button className="text-xs text-primary-700 hover:underline" onClick={() => copy(i.token)}>
                            {copied === i.token ? '已复制' : '复制链接'}
                          </button>
                        )}
                        {!i.usedAt && (
                          <button className="text-xs text-red-600 hover:underline ml-3" onClick={() => remove(i.id)}>
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
