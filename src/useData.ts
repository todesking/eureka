import { useState, useEffect } from 'react'

export interface Entry {
  title: string
  feature: string
  url: string
  source: 'ユリイカ' | '現代思想'
}

function parseCsv(text: string, source: Entry['source']): Entry[] {
  const lines = text.split('\n')
  return lines
    .slice(1) // skip header
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [title, feature, url] = line.split(',')
      return { title: title ?? '', feature: feature ?? '', url: url?.trim() ?? '', source }
    })
}

export function useData() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void Promise.all([
      fetch('/eureka.csv').then((r) => r.text()),
      fetch('/gendai_shiso.csv').then((r) => r.text()),
    ]).then(([eurekaText, gendaiText]) => {
      setEntries([
        ...parseCsv(eurekaText, 'ユリイカ'),
        ...parseCsv(gendaiText, '現代思想'),
      ])
      setLoading(false)
    })
  }, [])

  return { entries, loading }
}
