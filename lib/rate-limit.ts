// 内存限速：按 (bucket, key) 记录最近 N 次失败时间戳，超过阈值就拒绝
// 适合小团队。Vercel serverless 实例热复用大概率生效；实例冷启动会清零，正常用户不会触发到那里
//
// bucket = 'login' | 'register'（同类接口共用一个池）
// key = IP + 附加维度（如登录用户名），可以让"同 IP 多用户"和"同用户多 IP"都限住

type Bucket = Map<string, number[]>
const stores = new Map<string, Bucket>()

const now = () => Date.now()

function getBucket(name: string): Bucket {
  let b = stores.get(name)
  if (!b) { b = new Map(); stores.set(name, b) }
  return b
}

/**
 * 检查是否允许通过。返回 { allowed, retryAfterSec }。
 * @param bucket   分组，如 'login-ip'、'register-ip'
 * @param key      同分组下的键，如 IP 地址
 * @param limit    窗口内允许的次数
 * @param windowSec 窗口秒数
 */
export function checkLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; retryAfterSec: number } {
  const b = getBucket(bucket)
  const t = now()
  const cutoff = t - windowSec * 1000
  const recent = (b.get(key) ?? []).filter((ts) => ts > cutoff)
  if (recent.length >= limit) {
    const retryAfterSec = Math.ceil((recent[0] + windowSec * 1000 - t) / 1000)
    b.set(key, recent) // 顺手清掉过期条目
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) }
  }
  recent.push(t)
  b.set(key, recent)
  return { allowed: true, retryAfterSec: 0 }
}

/** 只清空某 key 的记录（登录成功后清失败次数用） */
export function resetLimit(bucket: string, key: string) {
  getBucket(bucket).delete(key)
}

/** 从请求里拿客户端 IP（Vercel 会填 x-forwarded-for） */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}
