import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { peopleSchema } from '../lib/people/schema.ts'
const root = fileURLToPath(new URL('../', import.meta.url))
const result = peopleSchema.safeParse(JSON.parse(fs.readFileSync(path.join(root,'data/people.json'),'utf8')))
if (!result.success) { console.error(result.error.message); process.exit(1) }
for (const person of result.data) {
  if (person.photo_url && !fs.existsSync(path.join(root,'public',person.photo_url))) throw new Error(`Missing portrait: ${person.slug}`)
}
console.log(`Validated ${result.data.length} public profiles`)
