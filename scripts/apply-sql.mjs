// 用 Neon HTTP API（443 端口）执行 SQL 文件
// 不走 5432、不撞 iOA
// 用法：node scripts/apply-sql.mjs prisma/migrations/2026-07-13-fresh-v4.sql

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('用法: node scripts/apply-sql.mjs <sql-file>')
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('.env 里缺少 DATABASE_URL')
  process.exit(1)
}

const raw = readFileSync(sqlFile, 'utf8')

// 拆语句：按分号结尾切；剔注释和空语句；跳过 BEGIN/COMMIT（HTTP 客户端自动 auto-commit）
const statements = raw
  .split(/;\s*$/m)
  .map((s) =>
    s
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim()
  )
  .filter((s) => s.length > 0 && !/^(BEGIN|COMMIT)$/i.test(s.trim()))

console.log(`\n共 ${statements.length} 条语句待执行\n`)

const q = neon(url)

let lastResult = null
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  const preview = stmt.slice(0, 90).replace(/\s+/g, ' ')
  try {
    lastResult = await q.query(stmt)
    console.log(`[${String(i + 1).padStart(3)}/${statements.length}] ✓  ${preview}`)
  } catch (e) {
    console.error(`\n❌ 第 ${i + 1} 条失败：`)
    console.error(`   语句：${preview}...`)
    console.error(`   错误：${e.message}`)
    process.exit(1)
  }
}

console.log(`\n✅ 全部 ${statements.length} 条语句执行成功`)
if (lastResult && Array.isArray(lastResult) && lastResult.length > 0) {
  console.log('\n验证结果：')
  console.table(lastResult)
}
