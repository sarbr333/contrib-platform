import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email = process.env.OWNER_EMAIL
  if (!email) {
    console.log('跳过 seed：未设置 OWNER_EMAIL')
    return
  }
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    // 已存在 → 提升为 OWNER
    if (existing.role !== 'OWNER') {
      await db.user.update({ where: { id: existing.id }, data: { role: 'OWNER' } })
      console.log('已把', email, '提升为 OWNER')
    } else {
      console.log('OWNER 已存在:', email)
    }
    return
  }
  const password = 'change-me-now'
  const usernameFromEmail = email.split('@')[0].toLowerCase()
  await db.user.create({
    data: {
      email,
      username: usernameFromEmail,
      name: 'Owner',
      passwordHash: await bcrypt.hash(password, 10),
      role: 'OWNER'
    }
  })
  console.log('OWNER 已创建:', email, ' 用户名:', usernameFromEmail, ' 初始密码:', password)
}

main().finally(() => db.$disconnect())
