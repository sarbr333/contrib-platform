import { requireAdmin } from '@/lib/guard'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Card } from '@/components/ui/Card'
import { InvitationActions } from './InvitationActions'
import { UserRow } from './UserRow'

// ------------ 分组 ------------
async function createGroup(formData: FormData) {
  'use server'
  await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  const desc = String(formData.get('desc') || '').trim() || null
  if (!name) return
  await db.group.create({ data: { name, desc } })
  revalidatePath('/admin')
}
async function deleteGroup(formData: FormData) {
  'use server'
  await requireAdmin()
  const id = String(formData.get('id'))
  await db.group.delete({ where: { id } })
  revalidatePath('/admin')
}

// ------------ 身份 ------------
async function createIdentity(formData: FormData) {
  'use server'
  await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  const baseScore = Number(formData.get('baseScore') || 0)
  const weight = Number(formData.get('weight') || 1)
  if (!name) return
  await db.identity.create({ data: { name, baseScore, weight } })
  revalidatePath('/admin')
}
async function deleteIdentity(formData: FormData) {
  'use server'
  await requireAdmin()
  const id = String(formData.get('id'))
  await db.identity.delete({ where: { id } })
  revalidatePath('/admin')
}

// ------------ 用户 ------------
async function updateUser(formData: FormData) {
  'use server'
  await requireAdmin()
  const id = String(formData.get('id'))
  const role = String(formData.get('role')) as 'OWNER' | 'ADMIN' | 'MEMBER'
  const identityId = String(formData.get('identityId') || '') || null
  const groupId = String(formData.get('groupId') || '') || null
  await db.user.update({ where: { id }, data: { role, identityId, groupId } })
  revalidatePath('/admin')
  revalidatePath('/leaderboard')
}

export default async function AdminPage() {
  await requireAdmin()
  const [groups, identities, users] = await Promise.all([
    db.group.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { users: true } } } }),
    db.identity.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { users: true } } } }),
    db.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: { group: true, identity: true }
    })
  ])
  const invitations = await db.invitation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { group: true }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">系统管理</h1>
        <p className="text-sm text-gray-500 mt-1">管理小组、身份、用户和邀请</p>
      </div>

      {/* 分组 */}
      <Card title={`小组 · ${groups.length}`}>
        <form action={createGroup} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <input name="name" required className="input" placeholder="小组名（如：算法组）" />
          <input name="desc" className="input md:col-span-2" placeholder="备注（可选）" />
          <button className="btn-primary">添加</button>
        </form>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">还没有小组</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名称</th><th>备注</th><th>成员数</th><th className="text-right pr-5">操作</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium">{g.name}</td>
                    <td className="text-gray-500">{g.desc ?? '—'}</td>
                    <td>{g._count.users}</td>
                    <td className="text-right pr-5">
                      <form action={deleteGroup} className="inline">
                        <input type="hidden" name="id" value={g.id} />
                        <button className="text-xs text-red-600 hover:underline">删除</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 身份 */}
      <Card title={`身份 · ${identities.length}`}>
        <p className="text-xs text-gray-500 mb-3">身份用于标记成员职级，可为不同身份设置基础分与贡献分权重</p>
        <form action={createIdentity} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
          <input name="name" required className="input" placeholder="身份名（如：高级）" />
          <input name="baseScore" type="number" step="0.5" min="0" defaultValue="0" className="input" placeholder="基础分" />
          <input name="weight"    type="number" step="0.1" min="0" defaultValue="1" className="input" placeholder="权重" />
          <button className="btn-primary">添加</button>
        </form>
        {identities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">还没有身份</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>名称</th><th>基础分</th><th>权重</th><th>成员数</th><th className="text-right pr-5">操作</th>
                </tr>
              </thead>
              <tbody>
                {identities.map((i) => (
                  <tr key={i.id}>
                    <td className="font-medium">{i.name}</td>
                    <td>{i.baseScore}</td>
                    <td>{i.weight}</td>
                    <td>{i._count.users}</td>
                    <td className="text-right pr-5">
                      <form action={deleteIdentity} className="inline">
                        <input type="hidden" name="id" value={i.id} />
                        <button className="text-xs text-red-600 hover:underline">删除</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 用户 */}
      <Card title={`用户 · ${users.length}`}>
        <div className="-mx-5 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>姓名</th><th>用户名</th><th>邮箱</th><th>角色</th><th>身份</th><th>小组</th>
                <th className="text-right pr-5">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={{
                    id: u.id, name: u.name, username: u.username, email: u.email,
                    role: u.role, identityId: u.identityId, groupId: u.groupId
                  }}
                  identities={identities.map((i) => ({ id: i.id, name: i.name }))}
                  groups={groups.map((g) => ({ id: g.id, name: g.name }))}
                  action={updateUser}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 邀请码 */}
      <Card title={`邀请码 · ${invitations.length}`}>
        <InvitationActions
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          invitations={invitations.map((i) => ({
            id: i.id,
            token: i.token,
            role: i.role,
            groupName: i.group?.name ?? null,
            note: i.note,
            createdAt: i.createdAt.toISOString(),
            expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
            usedAt: i.usedAt ? i.usedAt.toISOString() : null
          }))}
        />
      </Card>
    </div>
  )
}
