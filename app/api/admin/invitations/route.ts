import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/guard'
import { db } from '@/lib/db'
import { generateInvitationToken } from '@/lib/invitation'

const Body = z.object({
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
  groupId: z.string().optional().nullable(),
  note: z.string().max(200).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional()
})

export async function POST(req: Request) {
  const admin = await requireAdmin()
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 })
  }
  const { role, groupId, note, expiresInDays } = parsed.data

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const invitation = await db.invitation.create({
    data: {
      token: generateInvitationToken(),
      role,
      groupId: groupId || null,
      note,
      expiresAt,
      inviterId: admin.id
    }
  })
  return NextResponse.json({ token: invitation.token, id: invitation.id })
}

export async function DELETE(req: Request) {
  await requireAdmin()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const inv = await db.invitation.findUnique({ where: { id } })
  if (!inv) return NextResponse.json({ error: '邀请不存在' }, { status: 404 })
  if (inv.usedAt) return NextResponse.json({ error: '邀请已被使用，无法删除' }, { status: 400 })

  await db.invitation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
