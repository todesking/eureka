import { readFileSync, writeFileSync } from 'node:fs'

type Source = 'ユリイカ' | '現代思想'

interface Entry {
  title: string
  feature: string
  url: string
  source: Source
}

function parseCsv(text: string, source: Source): Entry[] {
  return text
    .split('\n')
    .slice(1)
    .filter((l) => l.trim() !== '')
    .map((line) => {
      const [title, feature, url] = line.split(',')
      return { title: title ?? '', feature: feature ?? '', url: url?.trim() ?? '', source }
    })
}

const entries: Entry[] = [
  ...parseCsv(readFileSync('eureka.csv', 'utf-8'), 'ユリイカ'),
  ...parseCsv(readFileSync('gendai_shiso.csv', 'utf-8'), '現代思想'),
]

writeFileSync('public/data.json', JSON.stringify(entries))
console.log(`Generated public/data.json (${entries.length} entries)`)
