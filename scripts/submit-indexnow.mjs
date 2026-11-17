import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const config = JSON.parse(await readFile(new URL('./indexnow-config.json', import.meta.url), 'utf8'))

export function sitemapUrls(xml, siteUrl) {
  if (!/<urlset[\s>]/.test(xml)) throw new Error('Expected a sitemap URL set')
  const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => match[1].trim().replaceAll('&amp;', '&'))
  if (!urls.length || urls.length > 10000) throw new Error('Expected 1–10,000 sitemap URLs')
  for (const value of urls) {
    const url = new URL(value)
    if (url.origin !== siteUrl || url.hash || url.username || url.password) throw new Error(`Invalid sitemap URL: ${value}`)
  }
  return [...new Set(urls)]
}

export function pageFingerprint(html) {
  // Ignore deployment IDs and hydration scripts; compare searchable content and metadata.
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  const main = clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]
  if (!main) throw new Error('Public page is missing its main content')
  const text = main.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const linksAndImages = (main.match(/<(?:a|img)\b[^>]*>/gi) ?? []).map(tag => tag.match(/\b(?:href|src|alt)="[^"]*"/gi) ?? [])
  const metadata = clean.match(/<title[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*>|<link\b[^>]*rel="canonical"[^>]*>/gi) ?? []
  return createHash('sha256').update(JSON.stringify({ text, linksAndImages, metadata })).digest('hex')
}

async function request(url, options = {}) {
  return fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error', ...options })
}

export async function submitIndexNow({ dryRun = false, statePath = '.cache/indexnow.json' } = {}) {
  const { siteUrl, key } = config
  const keyLocation = `${siteUrl}/${key}.txt`
  const keyResponse = await request(keyLocation)
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== key) throw new Error('IndexNow key is not deployed at the canonical host')
  const sitemap = await request(`${siteUrl}/sitemap.xml`)
  if (!sitemap.ok) throw new Error(`Sitemap returned HTTP ${sitemap.status}`)
  const urls = sitemapUrls(await sitemap.text(), siteUrl)
  let previous = {}
  try { previous = JSON.parse(await readFile(statePath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const next = {}
  const changed = []
  for (const url of urls) {
    const response = await request(url, { headers: { 'User-Agent': 'Rein-IndexNow/1.0' } })
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
    const html = await response.text()
    if (/noindex/i.test(response.headers.get('x-robots-tag') ?? '') || /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) throw new Error(`Sitemap includes a noindex page: ${url}`)
    next[url] = pageFingerprint(html)
    if (previous[url] !== next[url]) changed.push(url)
  }
  for (const url of Object.keys(previous)) {
    if (url in next) continue
    if (new URL(url).origin !== siteUrl) throw new Error('State contains an unexpected host')
    const response = await request(url, { redirect: 'manual' })
    if ([404, 410, 301, 302, 307, 308].includes(response.status)) changed.push(url)
    else if (!response.ok) throw new Error(`Removed URL check failed: HTTP ${response.status}`)
  }
  console.log(JSON.stringify({ dryRun, checked: urls.length, changed: changed.length, urls: changed }, null, 2))
  if (dryRun) return
  if (changed.length) {
    const response = await request('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(siteUrl).host, key, keyLocation, urlList: changed }),
    })
    if (![200, 202].includes(response.status)) throw new Error(`IndexNow returned HTTP ${response.status}: ${(await response.text()).slice(0,300)}`)
    console.log(`IndexNow HTTP ${response.status}: received; indexing is not guaranteed.`)
  }
  await mkdir(dirname(statePath), { recursive: true })
  await writeFile(statePath, `${JSON.stringify(next, null, 2)}\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await submitIndexNow({ dryRun: process.argv.includes('--dry-run') })
}
