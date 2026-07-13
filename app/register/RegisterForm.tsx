'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { BrandMark } from '@/components/ui/BrandMark'
import { Button } from '@/components/ui/Button'
import { Input, FormField } from '@/components/ui/Form'
import { BRAND } from '@/lib/branding'

export default function RegisterForm() {
  const params = useSearchParams()
  const presetToken = params.get('invitationToken') ?? ''

  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [invitationToken, setInvitationToken] = useState(presetToken)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setErr('两次输入的密码不一致')
      return
    }
    setLoading(true)
    setErr('')
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        name,
        email,
        password,
        invitationToken: invitationToken || undefined
      })
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? '注册失败')
      setLoading(false)
      return
    }
    await signIn('credentials', { username, password, redirect: false })
    window.location.href = '/dashboard'
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
            <h1 className="text-xl font-semibold text-gray-800">注册账号</h1>
            <p className="text-sm text-gray-500 mt-1">加入 {BRAND.fullName}</p>
          </div>

          <FormField label="用户名">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="登录用，3-32 位字母数字"
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
            />
          </FormField>

          <FormField label="姓名">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="显示用，如实填写"
              required
              autoComplete="name"
            />
          </FormField>

          <FormField label="邮箱">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </FormField>

          <FormField label="密码" hint="至少 6 位">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="确认密码">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </FormField>

          <FormField
            label="邀请码"
            hint={presetToken ? '已通过邀请链接自动填入' : '若无邀请码，请联系管理员'}
          >
            <Input
              value={invitationToken}
              onChange={(e) => setInvitationToken(e.target.value)}
              placeholder="邀请码"
              disabled={!!presetToken}
              className={presetToken ? 'font-mono text-xs' : ''}
            />
          </FormField>

          {err && (
            <div className="rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
              {err}
            </div>
          )}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? '注册中…' : '注册'}
          </Button>

          <p className="text-sm text-center text-gray-500">
            已有账号？
            <Link href="/login" className="ml-1 text-primary-700 hover:underline">
              去登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
