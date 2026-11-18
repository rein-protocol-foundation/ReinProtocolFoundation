import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sitemapUrls, pageFingerprint, submitIndexNow } from './submit-indexnow.mjs'

test('only submit canonical-host sitemap URLs', () => {
  const xml = '<urlset><url><loc>https://www.rein-protocol.org/mission</loc></url></urlset>'
  assert.deepEqual(sitemapUrls(xml, 'https://www.rein-protocol.org'), ['https://www.rein-protocol.org/mission'])
  assert.throws(() => sitemapUrls(xml, 'https://preview.vercel.app'), /Invalid sitemap/)
  assert.throws(() => sitemapUrls('<html>Error</html>', 'https://www.rein-protocol.org'), /Expected/)
})

test('ignore hydration and markup churn but detect content and metadata changes', () => {
  const page = '<title>Rein</title><main><h1>Agent safety</h1><p>Research.</p></main><script>build=1</script>'
  assert.equal(pageFingerprint(page), pageFingerprint(page.replace('build=1', 'build=2').replace('<p>', '<p class="new">')))
  assert.notEqual(pageFingerprint(page), pageFingerprint(page.replace('Research.', 'Open research.')))
  assert.notEqual(pageFingerprint(page), pageFingerprint(page.replace('<title>Rein', '<title>Rein Foundation')))
  assert.throws(() => pageFingerprint('<html>Challenge page</html>'), /main content/)
})

test('detect JSON-LD updates while ignoring JSON formatting and hydration changes', () => {
  const page = '<main>Rein</main><script type="application/ld+json">{"@type":"Organization","name":"Rein"}</script><script>build=1</script>'
  assert.equal(pageFingerprint(page), pageFingerprint(page.replace('{"@type"', '{ "@type"').replace('build=1', 'build=2')))
  assert.notEqual(pageFingerprint(page), pageFingerprint(page.replace('"name":"Rein"', '"name":"Rein Protocol Foundation"')))
  assert.notEqual(pageFingerprint(page), pageFingerprint('<main>Rein</main>'))
  assert.throws(() => pageFingerprint(page.replace('{"@type"', '{invalid "@type"')), SyntaxError)
})

test('submit changes once, retain state on API failure, and report confirmed removal', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'rein-indexnow-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const statePath = join(directory, 'state.json')
  const { siteUrl, key } = JSON.parse(await readFile(new URL('./indexnow-config.json', import.meta.url), 'utf8'))
  const url = `${siteUrl}/mission`
  let html = '<title>Mission</title><main>Agent safety</main>'
  let apiStatus = 200
  const submissions = []
  t.mock.method(globalThis, 'fetch', async (target, options) => {
    if (target.endsWith(`/${key}.txt`)) return new Response(key)
    if (target.endsWith('/sitemap.xml')) return new Response(`<urlset><url><loc>${url}</loc></url></urlset>`)
    if (target === url) return new Response(html)
    if (target === `${siteUrl}/removed`) return new Response('', { status: 404 })
    assert.equal(target, 'https://api.indexnow.org/indexnow')
    submissions.push(JSON.parse(options.body).urlList)
    return new Response('', { status: apiStatus })
  })
  await submitIndexNow({ statePath })
  assert.deepEqual(submissions, [[url]])
  await submitIndexNow({ statePath })
  assert.equal(submissions.length, 1, 'unchanged page must not be resubmitted')
  const before = await readFile(statePath, 'utf8')
  html = '<title>Mission</title><main>Updated research</main>'
  apiStatus = 429
  await assert.rejects(submitIndexNow({ statePath }), /HTTP 429/)
  assert.equal(await readFile(statePath, 'utf8'), before, 'failed submission must not advance state')
  apiStatus = 200
  await writeFile(statePath, JSON.stringify({ ...JSON.parse(before), [`${siteUrl}/removed`]: 'old' }))
  await submitIndexNow({ statePath })
  assert.deepEqual(submissions.at(-1), [url, `${siteUrl}/removed`])
})
