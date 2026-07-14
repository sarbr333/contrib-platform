import { NextResponse, type NextRequest } from 'next/server'
import { checkLimit, getClientIp } from '@/lib/rate-limit'

// 登录接口的路径（NextAuth Credentials）
const LOGIN_PATHS = ['/api/auth/callback/credentials']

// 同 IP 每 15 分钟最多 10 次登录尝试
const LIMIT = 10
const WINDOW_SEC = 900

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!LOGIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }
  if (req.method !== 'POST') return NextResponse.next()

  const ip = getClientIp(req)
  const rl = checkLimit('login-ip', ip, LIMIT, WINDOW_SEC)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `登录请求过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/auth/callback/:path*']
}
