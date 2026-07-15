import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { checkLimit, getClientIp } from '@/lib/rate-limit'

const Body = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, '用户名只能包含字母、数字、下划线、点或连字符'),
  name: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(6),
  invitationToken: z.string().optional()
})

// 匿名接口 → 保守限速：同 IP 每 10 分钟最多 5 次注册尝试
const LIMIT = 5
const WINDOW_SEC = 600

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rl = checkLimit('register-ip', ip, LIMIT, WINDOW_SEC)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '参数错误' },
      { status: 400 }
    )
  }
  const email = parsed.data.email.toLowerCase().trim()
  const username = parsed.data.username.toLowerCase().trim()
  const token = parsed.data.invitationToken?.trim() || null

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] }
  })
  // 统一错误消息，避免用户枚举
  if (existing) {
    return NextResponse.json(
      { error: '注册失败：邮箱或用户名已被占用' },
      { status: 409 }
    )
  }

  let invitation = null as Awaited<ReturnType<typeof db.invitation.findUnique>>
  if (token) {
    invitation = await db.invitation.findUnique({ where: { token } })
    const invalid =
      !invitation ||
      !!invitation.usedAt ||
      (invitation.expiresAt !== null && invitation.expiresAt < new Date())
    if (invalid) {
      return NextResponse.json({ error: '邀请码无效或已失效' }, { status: 400 })
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const isFirst = (await db.user.count()) === 0
  const isOwnerEmail =
    process.env.OWNER_EMAIL &&
    process.env.OWNER_EMAIL.toLowerCase().trim() === email

  if (!isFirst && !isOwnerEmail && !invitation) {
    return NextResponse.json(
      { error: '本站为邀请制注册，请先获取邀请码' },
      { status: 403 }
    )
  }

  const role = (isFirst || isOwnerEmail) ? 'OWNER' : (invitation?.role ?? 'MEMBER')
  const groupId = invitation?.groupId ?? null

  const user = await db.user.create({
    data: {
      email,
      username,
      name: parsed.data.name,
      passwordHash,
      role,
      groupId
    }
  })

  if (invitation) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date(), usedById: user.id }
    })
  }

  return NextResponse.json({ ok: true })
}
