'use client'
import { useState } from 'react'

type U = {
  id: string
  name: string
  username: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  identityId: string | null
  groupId: string | null
}
type Opt = { id: string; name: string }

export function UserRow({
  user,
  identities,
  groups,
  action
}: {
  user: U
  identities: Opt[]
  groups: Opt[]
  action: (formData: FormData) => void | Promise<void>
}) {
  const [edit, setEdit] = useState(false)

  if (!edit) {
    return (
      <tr>
        <td className="font-medium">{user.name}</td>
        <td className="text-gray-500 font-mono text-xs">{user.username}</td>
        <td className="text-gray-500">{user.email}</td>
        <td>
          <RoleBadge role={user.role} />
        </td>
        <td className="text-gray-600">
          {identities.find((i) => i.id === user.identityId)?.name ?? '—'}
        </td>
        <td className="text-gray-600">
          {groups.find((g) => g.id === user.groupId)?.name ?? '—'}
        </td>
        <td className="text-right pr-5">
          <button onClick={() => setEdit(true)} className="text-xs text-primary-700 hover:underline">
            编辑
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="font-medium">{user.name}</td>
      <td className="text-gray-500 font-mono text-xs">{user.username}</td>
      <td className="text-gray-500 text-xs">{user.email}</td>
      <td colSpan={4}>
        <form action={action as (fd: FormData) => void} className="flex gap-2 items-center flex-wrap">
          <input type="hidden" name="id" value={user.id} />
          <select name="role" defaultValue={user.role} className="input w-28 h-8 text-xs">
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="OWNER">OWNER</option>
          </select>
          <select name="identityId" defaultValue={user.identityId ?? ''} className="input w-32 h-8 text-xs">
            <option value="">— 身份 —</option>
            {identities.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select name="groupId" defaultValue={user.groupId ?? ''} className="input w-32 h-8 text-xs">
            <option value="">— 小组 —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className="btn-primary h-8 px-3 text-xs">保存</button>
          <button
            type="button"
            onClick={() => setEdit(false)}
            className="btn-ghost h-8 px-3 text-xs"
          >
            取消
          </button>
        </form>
      </td>
    </tr>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map = {
    OWNER: 'bg-amber-50 text-amber-700 border-amber-200',
    ADMIN: 'bg-primary-50 text-primary-700 border-primary-200',
    MEMBER: 'bg-gray-50 text-gray-600 border-gray-200'
  } as Record<string, string>
  return (
    <span className={`inline-flex items-center px-2 h-5 rounded text-xs font-medium border ${map[role] ?? map.MEMBER}`}>
      {role}
    </span>
  )
}
