import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const modules = new Map()

// Load only the repository's pure renderers, without importing senders or credentials.
function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href)
  const source = readFileSync(url, 'utf8')
  if (url.pathname.endsWith('.json')) return `data:application/json;base64,${Buffer.from(source).toString('base64')}`
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  for (const match of [...js.matchAll(/from\s+(['"])(\.\.?\/[^'"]+)\1/g)]) {
    const specifier = match[2]
    const dependency = new URL(extname(specifier) ? specifier : `${specifier}.ts`, url)
    js = js.replace(`${match[1]}${specifier}${match[1]}`, JSON.stringify(moduleUrl(dependency)))
  }
  const result = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  modules.set(url.href, result)
  return result
}

const templates = await import(moduleUrl(new URL('lib/email-templates.ts', root)))
const { supabaseAuthEmailPreviews } = await import(moduleUrl(new URL('lib/supabase-auth-email.ts', root)))

// Read subjects from the actual senders without executing their server-side imports.
function senderSubject(path, functionName, values = {}) {
  const source = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true)
  const declaration = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === functionName)
  let subject
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'subject') {
      const value = node.initializer
      if (ts.isStringLiteral(value)) subject = value.text
      else if (ts.isTemplateExpression(value)) {
        subject = value.head.text + value.templateSpans.map((span) => {
          const key = span.expression.getText(source)
          if (!(key in values)) throw new Error(`Missing subject sample: ${key}`)
          return values[key] + span.literal.text
        }).join('')
      }
    }
    ts.forEachChild(node, visit)
  }
  if (declaration) visit(declaration)
  if (!subject) throw new Error(`Cannot read subject for ${functionName}`)
  return subject
}

const name = 'Alex Chen'
const sampleTitle = 'A practical guide to AI agents'
const catalog = []
function applicationEmail(id, title, group, renderer, args, sender, description, variables, options = {}) {
  catalog.push({
    id, title, group, description, variables,
    status: '应用邮件', source: `lib/email-templates.ts · ${renderer}`,
    subject: sender ? senderSubject('lib/email.ts', sender, { title: sampleTitle }) : '',
    html: templates[renderer](...args), ...options,
  })
}
applicationEmail('participant-welcome', 'Community Welcome', 'welcome', 'participantConfirmationTemplate', [name], 'sendParticipantConfirmation',
  '社区用户登记后发送。包含 Discord 邀请、二维码，以及学习和参与入口。', { USER_NAME: name })
applicationEmail('contributor-welcome', 'Contributor Welcome', 'welcome', 'contributorWelcomeTemplate', [name, 'https://join.slack.com/t/rein/shared_invite/preview-not-valid'], null,
  '仅供正式成为 Contributor 后使用。Slack 邀请由 API 生成；当前已备好模板，自动发送尚未接入。',
  { USER_NAME: name, SLACK_INVITE_URL: '演示邀请，不可使用' }, { status: '待 Slack API 接入', subject: 'Welcome as a Rein Contributor' })
applicationEmail('contributor-verification', 'Contributor 邮箱验证', 'transactional', 'contributorVerificationTemplate', [name, 'https://example.invalid/contributor/verify?token=preview-not-valid'], 'sendContributorVerification',
  '提交 Contributor 申请后，邀请申请人在 24 小时内验证邮箱。', { name, verificationUrl: '演示验证链接' })
applicationEmail('application-received', 'Contributor 申请确认', 'transactional', 'applicationReceivedTemplate', [name], 'sendApplicationReceived',
  '邮箱验证完成后确认申请已进入审核，并说明可能的一对一交流。', { name })
applicationEmail('conversation-invitation', '一对一交流邀请', 'transactional', 'conversationInvitationTemplate', [name, 'https://example.invalid/schedule'], 'sendConversationInvitation',
  '管理员邀请已验证的申请人选择交流时间；这不是传统面试，最长 30 分钟。', { name, schedulingUrl: '演示预约链接' })
applicationEmail('application-rejection', '申请审核结果', 'transactional', 'automaticRejectionTemplate', [name, 'admin@rein-protocol.org'], 'sendAutomaticRejection',
  '申请内容触及沟通与安全标准时通知申请人，并提供人工复核入口。', { name, monitoredEmail: 'admin@rein-protocol.org（示例）' })
applicationEmail('resource-update', '学习资源审核通知', 'transactional', 'resourceUpdateTemplate', [sampleTitle, 'approved'], 'sendResourceUpdate',
  '通知资源提交人审核结果。此处展示 approved 样例，实际结果由发送端传入。', { title: sampleTitle, outcome: 'approved' })
applicationEmail('identity-link', '社区身份关联确认', 'transactional', 'identityLinkReceiptTemplate', ['https://example.invalid/community/link/confirm?receipt=preview-not-valid&session=preview-not-valid'], null,
  '关联聊天账号时确认邮箱归属。一次性绑定码在网站确认后显示，不在邮件内发送。', { receiptUrl: '演示确认链接' },
  { subject: senderSubject('lib/identity/link-actions.ts', 'requestLinkEmail') })

const outreachMetadata = {
  'professor.eml': ['教授 / Academic', '邀请教授审阅研究议程、建议优先方向，或引荐研究与活动伙伴。'],
  'investor.eml': ['投资人 / 捐赠者', '征询对 $10M 筹款目标的捐赠意向或公益引荐；数字和活动信息仍需发送前核实。'],
  'researcher.eml': ['AI 研究者', '邀请研究者审阅试点提纲，建议评估方法或开放基准。'],
  'ai_startup_founder.eml': ['AI 创业者', '邀请创业者提供技术讲者、非保密演示或其他活动支持。'],
  'friend-zh.eml': ['朋友 / 中文', '请朋友引荐合适的研究、活动或公益支持伙伴。'],
}
const emlFiles = readdirSync(new URL('docs/outreach/', root)).filter((file) => file.endsWith('.eml'))
const parsed = spawnSync('python3', ['-c', `
import json, sys
from email import policy
from email.parser import BytesParser
from pathlib import Path
result = []
for filename in sys.argv[1:]:
    message = BytesParser(policy=policy.default).parsebytes(Path(filename).read_bytes())
    body = message.get_body(preferencelist=('html',))
    if body is None:
        raise ValueError('HTML body missing: ' + filename)
    result.append({'file': Path(filename).name, 'subject': str(message['Subject']), 'html': body.get_content()})
print(json.dumps(result))
`, ...emlFiles.map((file) => fileURLToPath(new URL(`docs/outreach/${file}`, root)))], { encoding: 'utf8' })
if (parsed.status !== 0) throw new Error(parsed.stderr || 'python3 is required to decode outreach .eml files.')
for (const email of JSON.parse(parsed.stdout)) {
  const [title, description] = outreachMetadata[email.file] ?? [email.file, '手动发送前填写收件人信息并核对所有占位内容。']
  catalog.push({ id: `outreach-${email.file.replace('.eml', '')}`, title, group: 'outreach', status: '手动发送', description,
    subject: email.subject, html: email.html, source: `docs/outreach/${email.file}`,
    variables: { 个性化内容: '保留 [Name] 和其他方括号占位符，发送前按收件人填写。' } })
}
const authMetadata = {
  'confirmation-link': ['注册邮箱确认 · 链接', '新账号确认邮箱。展示 Rein 确认页链接，以及手动打开链接的说明。'],
  'confirmation-code': ['注册回调 · 验证码', 'confirmation 模板路由到验证码流程时的实际变体。'],
  'magic_link-link': ['登录 · 链接', '用户申请邮件链接登录时发送。'],
  'magic_link-code': ['登录 · 验证码', '用户选择邮件验证码登录时发送。'],
  invite: ['账号邀请', '邀请收件人创建 Rein 账号；不代表 Contributor 资格。'],
  recovery: ['密码重置', '用户申请恢复账号或重置密码时发送。'],
  email_change: ['邮箱变更', '用户请求更换账号邮箱时发送。'],
  reauthentication: ['敏感操作再次验证', '敏感账号操作需要再次验证身份时发送。'],
}
for (const email of supabaseAuthEmailPreviews) {
  const [title, description] = authMetadata[email.name] ?? [email.name, '账号安全邮件。']
  const html = email.html.replaceAll('{{ .SiteURL }}', 'https://rein-protocol.org')
    .replaceAll('{{ .TokenHash }}', 'preview-token-not-valid').replaceAll('{{ .Token }}', '12345678')
    .replaceAll('{{ .ConfirmationURL }}', 'https://example.invalid/auth/verify')
    .replaceAll('{{ .NewEmail }}', 'alex@example.invalid')
  catalog.push({ id: `auth-${email.name}`, title, group: 'auth', status: '账号安全', description,
    subject: email.subject.replaceAll('{{ .Token }}', '12345678'), html,
    source: `lib/supabase-auth-email.ts · ${email.name}`,
    variables: { Token: '12345678（演示，无效）', 链接凭据: 'preview-token-not-valid', NewEmail: 'alex@example.invalid' } })
}

// Embed each image once so the generated HTML is portable and works offline.
const assets = {}
for (const email of catalog) {
  for (const match of email.html.matchAll(/https:\/\/rein-protocol\.org\/(?:brand|images)\/[^\s'"<>;)]+/g)) {
    const url = match[0]
    if (assets[url]) continue
    const path = new URL(url).pathname.slice(1)
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[extname(path)]
    if (!mime) throw new Error(`Unsupported image: ${path}`)
    assets[url] = `data:${mime};base64,${readFileSync(new URL(`public/${path}`, root)).toString('base64')}`
  }
}
const payload = JSON.stringify({ catalog, assets }).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029')
const html = read('scripts/email-review-shell.html').replace('__EMAIL_REVIEW_DATA__', () => payload)
const output = new URL('docs/outreach/email-templates.html', root)
if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== html) throw new Error('Email review is stale. Run npm run preview:emails.')
} else writeFileSync(output, html)
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Generated'} ${catalog.length} email previews in docs/outreach/email-templates.html.`)
