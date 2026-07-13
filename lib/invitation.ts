import { randomBytes } from 'crypto'

/** 生成 URL-safe 邀请 token，格式对齐参考站（27 字符 base64url）。 */
export function generateInvitationToken(byteLen = 20): string {
  return randomBytes(byteLen).toString('base64url')
}
