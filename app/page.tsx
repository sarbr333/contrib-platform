import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/ui/BrandMark'
import { BRAND } from '@/lib/branding'

// 根页依赖 session，动态渲染
export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')
  return (
    <div className="min-h-screen flex items-center justify-center px-4
                    bg-gradient-to-br from-primary-50 via-white to-white">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6"><BrandMark size="lg" /></div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-card p-8">
          <h1 className="text-lg font-semibold text-gray-800">{BRAND.fullName}</h1>
          <p className="text-sm text-gray-500 mt-2">
            用于工作汇报提交、贡献记录、团队榜单、申诉与管理审批。
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Link href="/login" className="btn-primary">登录</Link>
            <Link href="/register" className="btn-secondary">注册</Link>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-6">邀请制注册，请联系管理员获取邀请链接</p>
      </div>
    </div>
  )
}
