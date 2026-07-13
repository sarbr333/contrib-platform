# 贡献平台 (Contrib Platform)

一个多人多项目的**工作贡献 + 经济贡献账本**：成员自报，管理员审核，看板汇总。

## 核心功能

- **成员端**（`/my`）：提交工作贡献（工时、类型、描述、证据链接）和经济贡献（出资 / 垫付 / 带来收入 / 工资折算）
- **管理端**（`/review`）：一屏审核所有 pending 记录，支持备注和驳回，带审计日志
- **看板**（`/board`）：成员 × 项目交叉表，只统计已确认记录，管理员看全组织，成员看自己
- **组织管理**（`/admin`）：新建组织、新建项目、邀请成员、设置角色和预设分成基点

## 技术栈

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma 5 + PostgreSQL (Neon)
- NextAuth 5 (Credentials)
- Tailwind CSS

## 本地开发

```bash
cd ~/Desktop/contrib-platform

# 1. 安装依赖
npm install

# 2. 复制环境变量
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL、AUTH_SECRET、OWNER_EMAIL

# 3. 推 schema 到数据库
npm run db:push

# 4. 启动
npm run dev
# 打开 http://localhost:3000
```

## 部署到 Vercel（最快 5 分钟拿到公网链接）

**准备工作**：先注册 [Neon](https://neon.tech)（免费 Postgres）和 [Vercel](https://vercel.com)。中国网络访问尚可，如果卡建议开代理。

**步骤**：

1. **创建 Neon 数据库**
   - Neon → New Project → 选一个区域（推荐 ap-southeast-1 新加坡，中国访问快）
   - 创建后复制 **Connection string**（形如 `postgresql://user:pass@host/db?sslmode=require`）

2. **推送代码到 GitHub**
   ```bash
   cd ~/Desktop/contrib-platform
   git init && git add -A && git commit -m "init"
   # 在 GitHub 创建一个新 repo，然后：
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Vercel 一键部署**
   - Vercel → Add New → Project → Import 你刚才的 GitHub repo
   - 展开 **Environment Variables**，填三个：
     - `DATABASE_URL` = Neon 的连接串
     - `AUTH_SECRET` = 随机长字符串（终端跑 `openssl rand -base64 32`）
     - `OWNER_EMAIL` = 你自己的邮箱
   - Deploy

4. **首次初始化 schema**（部署完成后）
   - 本地终端执行：
     ```bash
     DATABASE_URL='<Neon 连接串>' npm run db:push
     ```
   - 这会把 Prisma schema 建到 Neon 数据库里

5. **注册 owner 账号**
   - 打开 Vercel 给你的域名（形如 `contrib-platform-xxx.vercel.app`）
   - 用你在 `OWNER_EMAIL` 里填的邮箱注册 → 自动获得 OWNER 角色
   - 之后可去 `/admin` 建项目、邀请成员

## 数据模型速览

- **User** 用户
- **Organization** 组织（一个用户可属多组织，你是 OWNER）
- **Project** 项目
- **Membership** 成员在组织里的角色（OWNER/ADMIN/MEMBER）+ 预设分成基点
- **Contribution** 工作贡献：kind（交付/协作/决策/BD/其他）、hours、描述、证据、状态
- **EconomicEntry** 经济贡献：kind（出资/垫付/收入/工资值）、amount、币种、状态
- **AuditLog** 审核操作留痕（谁在什么时候把什么从什么改成什么）

## 邀请成员流程

1. 让成员自己注册（`/register`）
2. 你去 `/admin`，找到你的组织，用他们的邮箱邀请（选择角色和预设分成）
3. 他们下次登录后能在 `/my` 看到你的组织的项目

## 后续扩展方向（当前 MVP 未做）

- 企微/飞书 SSO 与消息抓取（需要企微自建应用审批 1-2 周）
- 分成计算器（基于工时 + 出资 + 收入 + 权重给出分配建议）
- 导出 CSV/Excel
- 邮件通知（成员提交、你审核结果）
- Webhook：新增 pending 记录时推给你的企微/飞书

## 安全提示

- 这是一个**记账平台不是决策系统**，看板是参考，具体分成/股权仍需线下决议
- 审核记录写入 AuditLog，可追溯
- 所有金额存 Decimal(14, 2)，不会有浮点误差
