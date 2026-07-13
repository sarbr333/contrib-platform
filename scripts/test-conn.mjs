import 'dotenv/config'
import pg from 'pg'

const url = process.env.DIRECT_URL
if (!url) {
  console.error('DIRECT_URL 未设置')
  process.exit(1)
}
console.log('尝试连接 host:', new URL(url).host)
const client = new pg.Client({ connectionString: url })
try {
  await client.connect()
  const r = await client.query('SELECT current_database(), version()')
  console.log('✓ 连接成功')
  console.log('database:', r.rows[0].current_database)
  console.log('version:', r.rows[0].version.slice(0, 60))
  await client.end()
} catch (e) {
  console.error('✗ 连接失败:', e.message)
  process.exit(1)
}
