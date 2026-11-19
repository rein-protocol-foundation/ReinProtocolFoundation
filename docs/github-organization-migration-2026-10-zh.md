# GitHub 组织创建与项目迁移记录（2026-10）

记录日期：2026-10-29。日期按 America/Los_Angeles；日志中的 `Z` 为 UTC。
本文记录本次操作中已经确认的事实及故障处理，供以后迁移、部署和 CI 排障使用。
“已确认”仅表示当时的检查结果；后续排障应重新检查线上状态。

## 组织与仓库对应关系

使用组织管理邮箱 `admin@rein-protocol.org` 创建并配置 GitHub 组织
[rein-protocol-foundation](https://github.com/rein-protocol-foundation)，统一承载基金会官网、Agent、论文模板及研究项目。
该邮箱是组织管理联系地址，不应据此推断当前登录的 GitHub 用户或权限。

| 用途 | 迁移前 | 迁移后 |
| --- | --- | --- |
| 基金会官网与社区后端 | `tempest2023/ReinProtocolFoundation` | `rein-protocol-foundation/ReinProtocolFoundation` |
| Nori Agent | `tempest2023/rein-agent` | `rein-protocol-foundation/nori-agent` |
| 论文模板 | 本次在组织内配置 | `rein-protocol-foundation/rein-paper-template` |
| 组织主页 | 本次在组织内配置 | `rein-protocol-foundation/.github`，内容位于 `profile/` |

官网和 Agent 的 Transfer 操作由用户在 GitHub 设置页完成；Agent 同时改名为 `nori-agent`。
随后更新了本地 remote、组织中英文 README 项目入口，以及部署相关配置。
组织主页默认英文，并提供中文切换；顶部区分定位徽章和官网／Discord 入口，论文模板放在 Start here。

## 迁移没有改变的运行位置

| 项目 | 位置／标识 |
| --- | --- |
| 官网 | `https://rein-protocol.org` |
| Vercel 项目 | `rein-protocol-foundation`，team/scope `agi-studio`，生产分支 `main` |
| Nori 管理入口 | `https://nori.rein-protocol.org/login` |
| OCI SSH | `ssh -F ~/.ssh/oci-rein-agent.conf rein-agent` |
| OCI 应用目录 | `/home/ubuntu/rein-agent` |
| OCI 发布目录 | `/home/ubuntu/nori-releases` |
| 已安装部署控制器 | `/opt/nori-updater` |
| Slack 部署通知 | `#nori-deployment`，workspace `T0C4GRL55HB`，channel `C0CD2DMUZL1` |

GitHub 仓库改名不要求一起改 SSH 别名、应用目录或运行时目录。
安装文档使用显式目标目录，保证后续 `cd rein-agent` 仍然成立：

```sh
git clone --recurse-submodules https://github.com/rein-protocol-foundation/nori-agent.git rein-agent
cd rein-agent
```

## 故障一：GitHub 重定向掩盖了旧仓库配置

**现象：** 旧仓库 URL 仍能访问或拉取，但新仓库的合并事件可能被 webhook 判为 `ignored_target`。

**原因：** GitHub URL 重定向不等于业务配置迁移。接收器对 webhook payload 的
`repository.full_name` 做精确匹配，新 payload 是 `rein-protocol-foundation/nori-agent`，
旧配置仍是 `tempest2023/rein-agent`。

**已执行修复：** 备份服务器原配置后，分别更新：

- `/etc/nori-webhook.json` 的 `repository` → `rein-protocol-foundation/nori-agent`。
- `/etc/nori-updater.json` 的 `repository` → `https://github.com/rein-protocol-foundation/nori-agent.git`。
- `/home/ubuntu/rein-agent` 的 Git `origin` → 同一新 clone URL。
- 重启 webhook 接收服务，使配置生效；隔离临时队列验证新仓库签名事件可被接受。
- [Nori PR #24](https://github.com/rein-protocol-foundation/nori-agent/pull/24) 同步更新部署示例，避免以后按旧示例重新安装。

**实际验证：** PR #24 合并后的 webhook 返回 `queued`，服务器最终运行
`8f5a76d3ab0f9967d0400b636ea477f708249de2`；四个应用服务均 active，事件队列为空。
这是当次实际部署的证据，不是仅凭 ping 或 URL 重定向推断。

## 故障二：Vercel 无法关联组织下的新仓库

**现象：** `vercel git connect` 返回无法连接新仓库／需要检查访问权限。

**原因与修复：** 本次需要为新组织安装／授权 Vercel GitHub App。
经用户授权，仅选择 `rein-protocol-foundation/ReinProtocolFoundation`，随后重新连接成功。
核对项目 Git link 的 `org`、`repo`、`productionBranch`，确认组织、仓库和 `main` 都正确。

Git 关联成功、已有生产版本 READY、官网 HTTP 200 是三种不同证据；它们都不能单独证明
迁移后的新提交已部署。应继续核对部署对应的 commit SHA。

## 故障三：Nori 已部署，但记录和 Slack 通知仍失败

**当时现象：** 官网 `/api/agent/deployments` 返回 404，reporter 持续重试；
两条报告已准备好 payload，但没有保存 Slack 回执。

**原因：** 部署记录接口位于尚未合并的
[Foundation PR #33](https://github.com/rein-protocol-foundation/ReinProtocolFoundation/pull/33)，
当时生产版本不包含它。该 PR 原先还只允许 `tempest2023/rein-agent`，即使直接上线也会拒绝新地址。
PR 描述曾记录早前部署成功的观察，不能用来替代当前生产检查；后来已更新描述，明确当前验证缺口。

**已提交修复（`ebdf982`）：** 同时接受规范地址 `rein-protocol-foundation/nori-agent`
和历史地址 `tempest2023/rein-agent`，拒绝无关仓库；保留原始 repository 字段，
不对旧报告做自动归一化。新报告使用新地址，旧报告按原 payload 重试。

部署 UUID 和 payload hash 是幂等边界。不要批量改写已排队／已入库的旧 payload，
不要为了绕过 409 换 UUID。相同报告补写 `slackTs` 时必须保持不可变内容一致。
已保存回执时只补写后端回执，不能重新发送 Slack 消息。

报告顺序：健康部署 → 持久队列 → Foundation 记录 → 英文 Slack 通知 → 后端回执 → 本地归档。
应用部署成功不代表后面几个阶段成功。

**验证范围：** Foundation 的 20 项部署／鉴权测试、类型检查、lint 和 Vercel PR 检查通过；
Nori 的 36 项 updater／reporter 测试通过，包括回执失败重试不重复发送。
截至本记录采用的最后一次线上检查，接口仍为 404、两条报告待处理，**尚未确认真实记录和 Slack 通知恢复**。
用户随后确认合并的是 Nori PR #25；不能据此认定 Foundation PR #33 也已合并或上线。

后续应先检查 PR #33 和实际生产 SHA，再核对接口、队列、记录与 Slack 回执。
接口未上线时重复重启 reporter 不能解决 404。

## 故障四：批量修改旧链接导致 CI 的来源哈希失败

[Nori PR #25](https://github.com/rein-protocol-foundation/nori-agent/pull/25)
更新 README、安装说明和跨仓库链接时，也改到了 `docs/foundation-implementation-snapshot.md`。

`node scripts/check.mjs` 通过 `docs/source-hashes.json` 对原始来源快照做 SHA-256 校验；
其中 `README.md` 键实际映射到上述快照文件。只修改一条 URL 也会出现：

```text
AssertionError: Source snapshot changed: docs/foundation-implementation-snapshot.md
```

**修复（`cba5ae6`）：** 恢复快照的原始字节内容，不修改预期哈希、不关闭检查；
在 `docs/provenance.md` 记录旧身份及新仓库入口，解释历史快照为何保留旧 URL。
普通运行说明和历史证据应区别处理，不能全仓库机械替换。

本地以 Node 22 运行同一 scaffold 检查通过，远程 `check`、`changes`、`integration` 通过；
不受文档修改影响的集成任务按规则跳过。当时未发现 reviewer 的实质意见，仅有请求 review 的留言。
PR #25 于 2026-10-29 合并，随后清理本地及远程分支 `tempest/fix-migrated-repository-links`。

## 以后遇到同类问题的排查顺序

以下命令用于只读核对，在对应仓库执行。读取配置、日志时只输出必要字段，避免暴露密钥。

```sh
# GitHub 真实身份与 PR 状态
gh api repos/rein-protocol-foundation/nori-agent --jq '{full_name,html_url}'
gh pr view 25 --repo rein-protocol-foundation/nori-agent --json state,mergeCommit,statusCheckRollup
gh pr view 33 --repo rein-protocol-foundation/ReinProtocolFoundation --json state,mergeCommit,statusCheckRollup
git remote -v

# 官网当前是否包含路由：未认证的 GET 不能验证报告写入。
# 404 表示未找到路由；仅实现 POST 的路由通常对 GET 返回 405。
curl -sS -o /dev/null -w '%{http_code}\n' https://rein-protocol.org/api/agent/deployments

# Nori 检查（通过既有 SSH 配置）
ssh -F ~/.ssh/oci-rein-agent.conf rein-agent \
  'git -C /home/ubuntu/rein-agent remote -v; git -C /home/ubuntu/rein-agent rev-parse HEAD; systemctl is-active nori-router nori-web nori-slack nori-discord'

# CI 失败时，在 Nori 开发检出目录复现相同检查
node scripts/check.mjs
```

1. 先核对实际 owner/name、Git remote、配置和部署 SHA，不以旧链接可访问作为迁移完成依据。
2. 核对 GitHub App 授权、Vercel 项目关联、webhook 精确仓库过滤和 updater clone URL。
3. 检查合并事件是否收到、是否进入 pending、构建和健康检查是否完成。
4. 独立检查报告队列、后端接口和 Slack 回执，区分应用故障与报告故障。
5. 搜索剩余旧 owner/name，先识别历史快照、兼容测试、不可变报告，再修改活动配置和使用说明。
6. 修复后运行实际失败的 CI 检查，核对最新提交的远程结果；单独的报告测试无法覆盖来源哈希检查。
7. 仅在已经授权的范围内部署、重试报告或发送通知；不删除队列、回执、私有运行状态来掩盖错误。

凭据值不写入本记录。服务凭据定位见本地未跟踪的 `SECRETs.md`；
不要上传组织注册联系人文件、运行时账号、会话或完整服务器配置。
