import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        username: { label: '用户名或邮箱' },
        password: { label: '密码', type: 'password' }
      },
      authorize: async (creds) => {
        const raw = String((creds as { username?: string; email?: string })?.username ?? (creds as { email?: string })?.email ?? '').toLowerCase().trim()
        const password = String((creds as { password?: string })?.password ?? '')
        if (!raw || !password) return null
        const user = await db.user.findFirst({
          where: raw.includes('@') ? { email: raw } : { username: raw }
        })
        if (!user) return null
        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name }
      }
    })
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.uid = (user as { id: string }).id
      return token
    },
    session: ({ session, token }) => {
      if (token.uid) (session.user as { id?: string }).id = token.uid as string
      return session
    }
  }
})
