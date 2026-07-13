-- ============================================================
-- 北极星 · v3 幂等版（可重复运行）
-- 不管数据库当前是什么状态，都可以跑成功
-- 策略：先删所有可能冲突的对象，再全新建
-- ============================================================

BEGIN;

-- ---------- 第一步：把新老所有相关对象都清空 ----------
-- （新表：如果 v2 有部分建成功，也一起删掉重建）
DROP TABLE IF EXISTS "Appeal"        CASCADE;
DROP TABLE IF EXISTS "Contribution"  CASCADE;
DROP TABLE IF EXISTS "Report"        CASCADE;
DROP TABLE IF EXISTS "Identity"      CASCADE;
DROP TABLE IF EXISTS "Group"         CASCADE;

-- 旧业务表
DROP TABLE IF EXISTS "EconomicEntry" CASCADE;
DROP TABLE IF EXISTS "Membership"    CASCADE;
DROP TABLE IF EXISTS "Project"       CASCADE;
DROP TABLE IF EXISTS "Organization"  CASCADE;

-- 所有相关枚举（新老一起）
-- 注意：Invitation.role 可能引用 "Role" 或 "GlobalRole"，先把 Invitation 的 role 列扒下来
ALTER TABLE "Invitation" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "Invitation" ALTER COLUMN "role" TYPE TEXT;

-- 现在没人引用枚举了，可以随便删
DROP TYPE IF EXISTS "AppealStatus";
DROP TYPE IF EXISTS "ContribStatus";
DROP TYPE IF EXISTS "ContribCategory";
DROP TYPE IF EXISTS "ReportKind";
DROP TYPE IF EXISTS "GlobalRole";
DROP TYPE IF EXISTS "ContribKind";
DROP TYPE IF EXISTS "EconKind";
DROP TYPE IF EXISTS "Status";
DROP TYPE IF EXISTS "Source";
DROP TYPE IF EXISTS "Role";

-- ---------- 第二步：新建所有枚举 ----------
CREATE TYPE "GlobalRole"     AS ENUM ('OWNER','ADMIN','MEMBER');
CREATE TYPE "ReportKind"     AS ENUM ('DAILY','WEEKLY','MONTHLY','PROJECT','OTHER');
CREATE TYPE "ContribCategory" AS ENUM ('DELIVERY','COLLAB','INNOVATION','LEARNING','MENTORING','OTHER');
CREATE TYPE "ContribStatus"  AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE "AppealStatus"   AS ENUM ('OPEN','ACCEPTED','DECLINED');

-- ---------- 第三步：Invitation.role 转到 GlobalRole ----------
UPDATE "Invitation" SET "role" = 'MEMBER' WHERE "role" NOT IN ('OWNER','ADMIN','MEMBER');
ALTER TABLE "Invitation"
  ALTER COLUMN "role" TYPE "GlobalRole" USING ("role"::"GlobalRole");
ALTER TABLE "Invitation" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- ---------- 第四步：User 升级 ----------
UPDATE "User"
   SET "username" = split_part("email", '@', 1)
 WHERE "username" IS NULL;
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" DROP COLUMN IF EXISTS "identityId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "groupId";
ALTER TABLE "User" ADD COLUMN "role"       "GlobalRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "User" ADD COLUMN "identityId" TEXT;
ALTER TABLE "User" ADD COLUMN "groupId"    TEXT;

-- ---------- 第五步：新建表 Identity ----------
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

-- ---------- 第六步：新建表 Group ----------
CREATE TABLE "Group" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "desc"      TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- ---------- 第七步：User 补外键 ----------
ALTER TABLE "User"
  ADD CONSTRAINT "User_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "Identity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------- 第八步：新建表 Report ----------
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

-- ---------- 第九步：新建表 Contribution ----------
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
  CONSTRAINT "Contribution_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "Contribution_userId_fkey"       FOREIGN KEY ("userId")       REFERENCES "User"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "Contribution_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Contribution_userId_idx"   ON "Contribution"("userId");
CREATE INDEX "Contribution_status_idx"   ON "Contribution"("status");
CREATE INDEX "Contribution_category_idx" ON "Contribution"("category");

-- ---------- 第十步：新建表 Appeal ----------
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

-- ---------- 第十一步：Invitation 结构升级 ----------
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_orgId_fkey";
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_groupId_fkey";
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_inviterId_fkey";
ALTER TABLE "Invitation" DROP CONSTRAINT IF EXISTS "Invitation_usedById_fkey";
ALTER TABLE "Invitation" DROP COLUMN IF EXISTS "orgId";
ALTER TABLE "Invitation" DROP COLUMN IF EXISTS "shareBps";
ALTER TABLE "Invitation" ADD  COLUMN IF NOT EXISTS "groupId" TEXT;

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

DROP INDEX IF EXISTS "Invitation_groupId_idx";
CREATE INDEX "Invitation_groupId_idx" ON "Invitation"("groupId");

-- ---------- 第十二步：提升 OWNER ----------
UPDATE "User" SET "role" = 'OWNER' WHERE "email" = 'sylvia3337@163.com';

COMMIT;

-- ---------- 验证 ----------
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Identity')      AS identity_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Group')         AS group_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Report')        AS report_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Contribution')  AS contrib_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Appeal')        AS appeal_ok,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'Organization')  AS org_removed,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role')     AS user_role_ok,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Invitation' AND column_name = 'groupId') AS inv_group_ok;
