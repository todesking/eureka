import { readFileSync, writeFileSync } from 'node:fs'
import { pipeline } from '@huggingface/transformers'

type Source = 'ユリイカ' | '現代思想'

interface Entry {
  title: string
  feature: string
  url: string
  source: Source
  embedding: number[]
}

function parseCsv(text: string, source: Source): Omit<Entry, 'embedding'>[] {
  return text
    .split('\n')
    .slice(1)
    .filter((l) => l.trim() !== '')
    .map((line) => {
      const [title, feature, url] = line.split(',')
      return { title: title ?? '', feature: feature ?? '', url: url?.trim() ?? '', source }
    })
}

const rawEntries = [
  ...parseCsv(readFileSync('eureka.csv', 'utf-8'), 'ユリイカ'),
  ...parseCsv(readFileSync('gendai_shiso.csv', 'utf-8'), '現代思想'),
]

console.log(`Loaded ${rawEntries.length} entries, computing embeddings...`)

const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small')

const entries: Entry[] = []
for (let i = 0; i < rawEntries.length; i++) {
  const raw = rawEntries[i]!
  if (i % 100 === 0) console.log(`  ${i}/${rawEntries.length}`)
  const text = 'passage: ' + raw.feature.replace(/^.*?＝/, '')
  const out = await extractor(text, { pooling: 'mean', normalize: true })
  entries.push({ ...raw, embedding: Array.from(out.data as Float32Array) })
}

writeFileSync('public/data.json', JSON.stringify(entries))
console.log(`Generated public/data.json (${entries.length} entries)`)
