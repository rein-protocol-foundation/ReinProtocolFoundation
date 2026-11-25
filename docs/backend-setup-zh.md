# 本地后端配置与测试

所有公开表单默认开启，不需要 feature flag。页面可以在没有后端凭据时正常浏览；实际提交时，如果对应服务不可用，表单会显示错误弹窗。

## 1. 创建本地环境文件

```bash
cp .env.example .env.local
```

填写 `.env.local`：

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_ENVIRONMENT=dev

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

ADMIN_EMAILS=your-email@example.com

RESEND_API_KEY=
RESEND_FROM_EMAIL="Rein Community <community@your-verified-domain.org>"

OPENAI_API_KEY=
```

这些变量按功能分组：

- `NEXT_PUBLIC_SITE_URL`：生成 Contributor 邮箱验证链接时使用的网站地址。
- `DATABASE_ENVIRONMENT`：最高优先级的数据表环境选择，只接受 `dev` 或 `prod`；本地默认使用 `dev`。生产部署应明确设置为 `prod`。未配置时继续使用现有的 Next.js/Vercel 环境判断，非法值会安全回退到 `dev`。
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目地址，可公开给浏览器。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：当前的 `sb_publishable_...` 浏览器端公开密钥，受 RLS 限制。
- `SUPABASE_SECRET_KEY`：当前的 `sb_secret_...` 服务端高权限密钥，会绕过 RLS，只能保存在服务器环境中。
- `ADMIN_EMAILS`：允许登录 `/admin` 的管理员邮箱，多个邮箱用英文逗号分隔。
- `RESEND_API_KEY`：发送验证、确认和邀请邮件。
- `RESEND_FROM_EMAIL`：已在 Resend 验证的发送身份。
- `OPENAI_API_KEY`：管理员主动运行 Agent 审核时使用。

不再使用表单开关、上线批准、GitHub、Scheduling、OpenAI Model、IP Hash 或 Cron 相关环境变量。

## 2. 配置 Supabase

使用项目统一的 Supabase project，然后按文件名顺序执行 [`supabase/migrations`](../supabase/migrations) 中的 SQL 文件。最简单的方式是逐个复制到 Supabase SQL Editor 执行。

迁移会创建数据库表、RLS、Storage bucket、服务端事务函数和 retention maintenance。同一个 Supabase project 内，本地开发和测试统一使用 `dev_*` 表，生产部署统一使用 `prod_*` 表；以后每个 migration 都必须在同一事务中维护两套表。公开表单提交时，系统会保存原始 IP 地址用于限流，并在七天内由 Supabase Cron 删除。Privacy Policy 已说明这项收集和保留规则。

在 Supabase Authentication 的 URL 配置中加入：

```text
http://localhost:3000/auth/callback
```

本地测试只会写入 `dev_*` 表，不会影响 `prod_*` 的 all-time member count。Supabase Auth 和图片 Storage 仍由两个环境共享。

# 配置域名

生产站点使用 Vercel 项目域名。自定义域名需先核实注册和商标情况，再购买、配置 DNS 并更新 `NEXT_PUBLIC_SITE_URL` 与 Supabase Auth 回调地址。

## 3. 在 Dashboard 配置运营链接

启动网站并以 `ADMIN_EMAILS` 中的邮箱登录 `/admin`，然后打开 `/admin/settings` 配置：

- Default scheduling URL
- GitHub repository URL
- Event proposal Issue Form URL
- Campus volunteer Issue Form URL
- Technical contribution Issue Form URL
- Monitored public contact email
- OpenAI Agent model
- OpenAI reasoning effort

这些配置保存在 Supabase `site_settings` 表中，不放在环境变量里。Agent 模型可选择 GPT-5.6 Sol、Terra 或 Luna；reasoning effort 可选择 none、low、medium、high、xhigh 或 max。未保存配置时默认使用 Sol + low。

## 4. 配置 Resend 与 OpenAI

Resend 需要 API Key 和已验证的发送域名。没有 Resend 时，注册数据仍可写入数据库，但验证邮件、邀请邮件等无法送达，管理员可在完成配置后补发。

OpenAI 只在管理员主动点击 Agent review 时使用。没有 OpenAI API Key 不影响公开注册、申请、资源提交或人工审核。

## 5. 建议测试顺序

1. 打开 `/community`，提交 Community Participant 注册。
2. 刷新页面，确认 all-time member count 增加。
3. 用同一个邮箱再次注册，确认总数不再增加。
4. 提交 Contributor application，并确认总数立即增加。
5. 检查邮箱，点击 24 小时验证链接。
6. 登录 `/admin`，在 Applications 中检查状态、手动 Agent review 和邀请功能。
7. 提交公开资源，在 Resource Review 中审核并转成 Learn draft。
8. 在 Learn 中发布资源，在 Gather 中创建带外部注册链接的活动。
9. 在 People 中测试 Director、Core Contributor 和单独发布同意。

## 6. 自动化检查

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

## 表单变更的发布验证

2026-11-24 排障确认：网站已将 Participant 的行业改为可选，但
`20261120185152_optional_participant_profile.sql` 未应用到线上，导致空行业提交违反
`NOT NULL`。现已执行该迁移，并用原版本号登记到远程迁移历史；开发、生产两套表均已验证。

涉及数据库的表单变更，不能以 Vercel 部署成功或模拟后端测试通过作为完成标准：

1. 发布前对比本地和远程迁移，先应用向后兼容的数据库迁移，再发布依赖它的页面。
   如历史版本不一致，先核对来源；不要将已执行的远程迁移标为 reverted 来绕过检查。
2. 运行 `npm run test:e2e:data`，覆盖真实数据库首次写入及重复提交，包括可选字段留空。
3. 在已授权的线上验证中，可运行
   `supabase db query --linked --file scripts/check-participant-optional-profile.sql`。
   该检查会对 dev/prod 注册函数执行写入断言，最终回滚，不保留测试成员。
4. 从线上页面提交明确标记的测试邮箱，验证成功提示及实际入库。

现有迁移历史另有三处文件时间戳差异（远程 `20261028210057`、`20261105082250`、
`20261112100630`）；本次没有重写这些历史，通用 `db push` 仍需先核对并整理它们。

本次后续审计还发现贡献者行业下拉框的空字符串未被服务端接受，以及错误 URL 在校验阶段
抛异常的问题。这两项和贡献者／资源表单失败时保留输入的修复通过 PR 交付；数据库热修复
不代表这些应用代码已上线。今后生产操作遵循 `AGENTS.md` 中的明确授权和 PR 规则。

`check-participant-optional-profile.sql` 还覆盖两套环境中的国际地区、Other 说明、贡献者
可选链接和三种资料公开意愿、五种资源格式的实际存储值。所有检查都在事务内回滚。
PR 的数据库 CI 使用隔离的本地 Supabase，不访问线上项目，不发送邮件。
