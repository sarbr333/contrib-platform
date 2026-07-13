-- ============================================================
-- 北极星 · 2026-07-13 全量重构迁移
-- 用途：在 Neon 网页 SQL Editor 粘贴执行
-- 影响：
--   * 保留 User（结构升级）、Invitation（结构升级）、AuditLog
--   * 删除 Organization / Membership / Project / Contribution(旧) / EconomicEntry
--   * 新建 Identity / Group / Report / Contribution(新) / Appeal
-- ⚠️ 旧的业务测试数据会全部清空。User 和 Invitation 表的行会保留
-- ============================================================

BEGIN;

-- ---------- 1) 删掉旧的业务表 ----------
DROP TABLE IF EXISTS "EconomicEntry" CASCADE;
DROP TABLE IF EXISTS "Contribution"  CASCADE;
DROP TABLE IF EXISTS "Membership"    CASCADE;
DROP TABLE IF EXISTS "Project"       CASCADE;
DROP TABLE IF EXISTS "Organization"  CASCADE;

-- 旧枚举（老 schema 里的）
DROP TYPE IF EXISTS "ContribKind";
DROP TYPE IF EXISTS "EconKind";
DROP TYPE IF EXISTS "Status";
DROP TYPE IF EXISTS "Source";
DROP TYPE IF EXISTS "Role";   -- 旧 Role 枚举

-- ---------- 2) 新枚举 ----------
CREATE TYPE "GlobalRole"     AS ENUM ('OWNER','ADMIN','MEMBER');
CREATE TYPE "ReportKind"     AS ENUM ('DAILY','WEEKLY','MONTHLY','PROJECT','OTHER');
CREATE TYPE "ContribCategory" AS ENUM ('DELIVERY','COLLAB','INNOVATION','LEARNING','MENTORING','OTHER');
CREATE TYPE "ContribStatus"  AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE "AppealStatus"   AS ENUM ('OPEN','ACCEPTED','DECLINED');

-- ---------- 3) User 结构升级 ----------
-- 上一步已加过 username（可空），现在补齐字段并设为 NOT NULL

-- 3.1 补 username 值：给尚未设置的老用户用 email 前缀兜底
UPDATE "User"
   SET "username" = split_part("email", '@', 1)
 WHERE "username" IS NULL;

-- 3.2 把 username 设为 NOT NULL
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- 3.3 添加 role / identityId / groupId
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "GlobalRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "identityId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "groupId"    TEXT;

-- ---------- 4) 新表：Identity ----------
CREATE TABLE "Identity" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "baseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weight"    DOUBLE PRECISION NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Identity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Identity_name_key" ON "Identity"("name");

-- ---------- 5) 新表：Group ----------
CREATE TABLE "Group" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "desc"      TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- ---------- 6) User 补外键 ----------
ALTER TABLE "User"
  ADD CONSTRAINT "User_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "Identity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------- 7) 新表：Report（工作汇报）----------
CREATE TABLE "Report" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "kind"        "ReportKind" NOT NULL DEFAULT 'WEEKLY',
  "title"       TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "evidenceUrl" TEXT,
  "periodFrom"  TIMESTAMP(3),
  "periodTo"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Report_userId_idx"    ON "Report"("userId");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- ---------- 8) 新表：Contribution（贡献记录）----------
CREATE TABLE "Contribution" (
  "id"           TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "category"     "ContribCategory" NOT NULL DEFAULT 'DELIVERY',
  "title"        TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "score"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "evidenceUrl"  TEXT,
  "occurredAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"       "ContribStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNote"   TEXT,
  "reviewedById" TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contribution_pkey"         PRIMARY KEY ("id"),
  CONSTRAINT "Contribution_userId_fkey"       FOREIGN KEY ("userId")       REFERENCES "User"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "Contribution_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Contribution_userId_idx"   ON "Contribution"("userId");
CREATE INDEX "Contribution_status_idx"   ON "Contribution"("status");
CREATE INDEX "Contribution_category_idx" ON "Contribution"("category");

-- ---------- 9) 新表：Appeal（申诉）----------
CREATE TABLE "Appeal" (
  "id"             TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "reason"         TEXT NOT NULL,
  "status"         "AppealStatus" NOT NULL DEFAULT 'OPEN',
  "handleNote"     TEXT,
  "reviewedById"   TEXT,
  "reviewedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Appeal_pkey"                 PRIMARY KEY ("id"),
  CONSTRAINT "Appeal_contributionId_fkey"  FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "Appeal_userId_fkey"          FOREIGN KEY ("userId")         REFERENCES "User"("id")         ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "Appeal_reviewedById_fkey"    FOREIGN KEY ("reviewedById")   REFERENCES "User"("id")         ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Appeal_contributionId_idx" ON "Appeal"("contributionId");
CREATE INDEX "Appeal_userId_idx"         ON "Appeal"("userId");
CREATE INDEX "Appeal_status_idx"         ON "Appeal"("status");

-- ---------- 10) Invitation 结构升级 ----------
-- 上一步已建过 Invitation（旧结构：token/orgId/role/shareBps/inviterId/note/expiresAt/usedAt/usedById）
-- 现在把 orgId 换成 groupId、role 换成 GlobalRole、去掉 shareBps

ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_orgId_fkey";
ALTER TABLE "Invitation" DROP COLUMN IF EXISTS "orgId";
ALTER TABLE "Invitation" DROP COLUMN IF EXISTS "shareBps";
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- role 列类型从旧 Role → GlobalRole（如果类型不同的话）
ALTER TABLE "Invitation"
  ALTER COLUMN "role" TYPE "GlobalRole" USING ("role"::text::"GlobalRole"),
  ALTER COLUMN "role" SET DEFAULT 'MEMBER';

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_usedById_fkey"
  FOREIGN KEY ("usedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Invitation_groupId_idx" ON "Invitation"("groupId");
-- 旧的 orgId 索引若存在，已随 DROP COLUMN 一并删除

-- ---------- 11) OWNER_EMAIL 自动升级 ----------
-- 如果 User 表里有那位 owner，把 role 提到 OWNER
DO $$
DECLARE
  owner_email TEXT;
BEGIN
  -- 从环境无法读取，需要你手动执行下面这条 UPDATE 一次（把 email 替换成 .env 里的 OWNER_EMAIL）
  -- UPDATE "User" SET "role" = 'OWNER' WHERE "email" = 'you@example.com';
  NULL;
END $$;

COMMIT;

-- ---------- 12) 验证 ----------
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Identity')      AS identity_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Group')         AS group_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Report')        AS report_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Contribution')  AS contrib_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Appeal')        AS appeal_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Organization')  AS org_removed,   -- 期望 0
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role')     AS user_role_ok,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Invitation' AND column_name = 'groupId') AS inv_group_ok;
-- 期望：Identity/Group/Report/Contribution/Appeal 都是 1，org_removed = 0，user_role_ok / inv_group_ok 都是 1
