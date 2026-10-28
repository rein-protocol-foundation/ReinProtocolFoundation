import { readFileSync, writeFileSync } from 'node:fs'
import ts from 'typescript'

// Render the same source used by the application; no separately maintained HTML.
for (const [file, exportName] of [
  ['participant-welcome', 'participantWelcomeHtml'],
  ['contributor-welcome', 'contributorWelcomeHtml'],
]) {
  const source = readFileSync(new URL(`../lib/${file}.ts`, import.meta.url), 'utf8')
    .replace('./community-invites.json', new URL('../lib/community-invites.json', import.meta.url).href)
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const module = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
  const html = module[exportName]
  const preview = html.replaceAll('https://rein-protocol.org/images/', '../../public/images/')
    .replaceAll('https://rein-protocol.org/brand/', '../../public/brand/')
  writeFileSync(new URL(`../docs/outreach/${file}-preview.html`, import.meta.url), preview)
  writeFileSync(new URL(`../docs/outreach/${file}-resend.html`, import.meta.url), html)
}
console.log('Generated participant and Contributor welcome previews and Resend imports, preserving template variables.')
