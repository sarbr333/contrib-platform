import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'

export async function requireUser() {
  const session = await auth()
  const uid = (session?.user as { id?: string } | undefined)?.id
  if (!uid) redirect('/login')
  const user = await db.user.findUnique({
    where: { id: uid },
    include: { identity: true, group: true }
  })
  if (!user) redirect('/login')
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') redirect('/dashboard')
  return user
}

export function isAdmin(user: { role: string }) {
  return user.role === 'OWNER' || user.role === 'ADMIN'
}
