-- ============================================================
-- 北极星 · 2026-07-13 增量迁移
-- 用途：在 Neon 网页 SQL Editor 粘贴执行
-- 内容：
--   1) User 表新增 username（唯一，可空）
--   2) 新建 Invitation 表 + 索引
-- 幂等：全部用 IF NOT EXISTS，重复跑不会出错
-- ============================================================

-- 1) User.username
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- 2) Invitation 表
CREATE TABLE IF NOT EXISTS "Invitation" (
  "id"         TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "orgId"      TEXT NOT NULL,
  "role"       "Role" NOT NULL DEFAULT 'MEMBER',
  "shareBps"   INTEGER NOT NULL DEFAULT 0,
  "inviterId"  TEXT NOT NULL,
  "note"       TEXT,
  "expiresAt"  TIMESTAMP(3),
  "usedAt"     TIMESTAMP(3),
  "usedById"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX IF NOT EXISTS "Invitation_orgId_idx" ON "Invitation"("orgId");
CREATE INDEX IF NOT EXISTS "Invitation_token_idx" ON "Invitation"("token");

-- 外键：Invitation.orgId -> Organization.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invitation_orgId_fkey'
  ) THEN
    ALTER TABLE "Invitation"
      ADD CONSTRAINT "Invitation_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 验证
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'User' AND column_name = 'username') AS username_exists,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'Invitation') AS invitation_exists;
-- 期望结果：username_exists = 1, invitation_exists = 1
