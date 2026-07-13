'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'
import { BrandMark } from '@/components/ui/BrandMark'
import { Button } from '@/components/ui/Button'
import { Input, FormField } from '@/components/ui/Form'
import { BRAND } from '@/lib/branding'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const res = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (res?.error) setErr('用户名或密码错误')
    else window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary-50 via-white to-white">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><BrandMark size="lg" /></div>
        <form
          onSubmit={submit}
          className="bg-white rounded-lg border border-gray-200 shadow-card p-7 space-y-4"
        >
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-800">登录</h1>
            <p className="text-sm text-gray-500 mt-1">欢迎回到 {BRAND.name}</p>
          </div>

          <FormField label="用户名或邮箱">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </FormField>

          <FormField label="密码">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </FormField>

          {err && (
            <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {err}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </Button>

          <p className="text-sm text-center text-gray-500">
            没有账号？
            <Link href="/register" className="ml-1 text-primary-700 hover:underline">
              去注册
            </Link>
          </p>
        </form>
        <p className="text-xs text-center text-gray-400 mt-6">{BRAND.fullName}</p>
      </div>
    </div>
  )
}
