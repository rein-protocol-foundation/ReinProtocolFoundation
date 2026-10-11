import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync('lib/supabase-auth-email.ts', 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { supabaseAuthEmailTemplates } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const config = readFileSync('supabase/config.toml', 'utf8')
const localSite = config.match(/^site_url = "([^"]+)"/m)[1]
const callbacks = [...config.match(/^additional_redirect_urls = \[([\s\S]*?)^\]/m)[1].matchAll(/"([^"\n]+)"/g)].map(match => match[1])
const fixture = { Token: '12345678', TokenHash: 'pkce_preview_hash', ConfirmationURL: 'https://example.invalid/verify', NewEmail: 'preview@example.invalid' }
const cases = []
for (const name of ['confirmation', 'magic_link']) {
  const section = config.split(`[auth.email.template.${name}]\n`)[1].split('\n[')[0]
  const local = { subject: section.match(/^subject = '(.*)'$/m)[1], html: readFileSync(section.match(/^content_path = "\.\/([^"]+)"/m)[1], 'utf8') }
  const hosted = supabaseAuthEmailTemplates.find(email => email.name === name)
  for (const callback of callbacks.filter(value => /\/auth\/(code|confirm)$/.test(value))) {
    cases.push({ email: local, site: localSite, callback, method: callback.endsWith('/code') ? 'code' : 'link' })
  }
  for (const path of ['/auth/code', '/auth/confirm']) {
    cases.push({ email: hosted, site: 'https://rein-protocol.org', callback: `https://rein-protocol.org${path}`, method: path.endsWith('/code') ? 'code' : 'link' })
  }
  // Similar paths, query/fragment additions and unlisted origins must not select
  // an administrator variant or receive a verification credential.
  for (const callback of ['http://127.0.0.1:3108/auth/code-extra', 'http://127.0.0.1:3108/auth/code?next=/admin', 'http://127.0.0.1:3108/auth/confirm#extra', 'https://unlisted.invalid/auth/confirm', '']) {
    cases.push({ email: local, site: localSite, callback, method: 'fallback', name })
  }
  // Local callbacks must never appear in or select the hosted-only template.
  cases.push({ email: hosted, site: 'https://rein-protocol.org', callback: 'http://127.0.0.1:3108/auth/code', method: 'fallback', name })
}
const inputs = cases.map(({ email, site, callback }) => ({ Subject: email.subject, HTML: email.html, Data: { ...fixture, SiteURL: site, RedirectTo: callback } }))
const rendered = JSON.parse(execFileSync('go', ['run', 'tests/fixtures/render-auth-email.go'], { input: JSON.stringify(inputs), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }))
for (const [index, entry] of cases.entries()) {
  const { HTML: html, Subject: subject } = rendered[index]
  const context = `${entry.method}: ${entry.callback}`
  assert(!html.includes('#ZgotmplZ'), context)
  if (entry.method === 'code') {
    assert.equal(subject, 'Your sign-in code — Rein Protocol Foundation', context)
    assert(html.includes(fixture.Token), context)
    assert(html.includes(`href="${entry.callback}"`), context)
    assert(!html.includes(fixture.TokenHash), context)
    assert(!html.includes('Sign in to Rein →'), context)
  } else if (entry.method === 'link') {
    assert.equal(subject, 'Your sign-in link — Rein Protocol Foundation', context)
    assert(html.includes(`href="${entry.callback}#token_hash=${fixture.TokenHash}&amp;flow=admin-signin"`), context)
    assert(!html.includes(fixture.Token), context)
    assert(!html.includes('/auth/code'), context)
  } else {
    assert.equal(subject, entry.name === 'confirmation' ? 'Confirm your email — Rein Protocol Foundation' : 'Your sign-in link — Rein Protocol Foundation', context)
    assert(!html.includes(fixture.Token), context)
    assert(html.includes(`${entry.site}/auth/confirm#token_hash=`), context)
    if (entry.callback && !entry.callback.startsWith(entry.site)) assert(!html.includes(entry.callback), context)
  }
}
console.log(`Passed ${cases.length} real Go template rendering cases (local alternate origins, hosted callbacks, and rejected callback variants).`)
