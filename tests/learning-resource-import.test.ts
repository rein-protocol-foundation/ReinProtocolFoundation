import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import reviewedCatalog from '@/data/learning-resources/ai-agents-2026-10-15.json'

const script = resolve('scripts/prepare-learning-resource-import.mjs')

function prepareImport(catalog: typeof reviewedCatalog, environment = 'prod') {
  const directory = mkdtempSync(join(tmpdir(), 'rein-learning-import-'))
  try {
    const filename = join(directory, 'catalog.json')
    writeFileSync(filename, JSON.stringify(catalog))
    return spawnSync(process.execPath, [script, filename, environment], { encoding: 'utf8' })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('learning resource import preparation', () => {
  it.each(['dev', 'prod'])('accepts the reviewed catalog for %s', (environment) => {
    const result = prepareImport(reviewedCatalog, environment)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain(`insert into public.${environment}_resources`)
    expect(result.stdout).toMatch(/^begin;[\s\S]*commit;\s*$/)
  })

  it.each([
    ['identical', 'https://example.org/Learn/Agents?lang=EN#Intro'],
    ['case variant', 'HTTPS://EXAMPLE.ORG/LEARN/AGENTS?LANG=EN#INTRO'],
    ['surrounding spaces', '  https://example.org/Learn/Agents?lang=EN#Intro  '],
    ['case and spaces', '  HTTPS://EXAMPLE.ORG/LEARN/AGENTS?LANG=EN#INTRO  '],
  ])('rejects incoming URL duplicates with %s before emitting SQL', (_variant, duplicateUrl) => {
    const catalog = structuredClone(reviewedCatalog)
    catalog.resources = catalog.resources.slice(0, 2)
    catalog.resources[0].public_url = 'https://example.org/Learn/Agents?lang=EN#Intro'
    catalog.resources[1].public_url = duplicateUrl

    const result = prepareImport(catalog)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(`Invalid/duplicate URL: ${catalog.resources[1].slug}`)
    expect(result.stdout).toBe('')
  })

  it('retains the original URL spelling in valid SQL payloads', () => {
    const catalog = structuredClone(reviewedCatalog)
    catalog.resources = catalog.resources.slice(0, 1)
    catalog.resources[0].public_url = 'https://example.org/Learn/Agents?lang=EN#Intro'

    const result = prepareImport(catalog)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(catalog.resources[0].public_url)
  })

  it('documents every access scope used by the reviewed catalog', () => {
    const documentation = readFileSync(resolve('docs/learning-resource-catalog.md'), 'utf8')
    const scopesParagraph = documentation.split('\n').find((line) => line.startsWith('Scope values currently include '))

    for (const scope of new Set(reviewedCatalog.resources.map((resource) => resource.learning_metadata.access.scope))) {
      expect(scopesParagraph).toContain(`\`${scope}\``)
    }
  })
})
