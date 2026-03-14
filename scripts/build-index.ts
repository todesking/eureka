import { readFileSync, writeFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';

type Source = 'ユリイカ' | '現代思想';

interface Entry {
  title: string;
  feature: string;
  url: string;
  source: Source;
  embedding: number[];
}

type RawEntry = { title: string; feature: string; url: string };

const rawEntries = [
  ...(JSON.parse(readFileSync('data/eureka.json', 'utf-8')) as RawEntry[]).map((e) => ({
    ...e,
    source: 'ユリイカ' as const,
  })),
  ...(JSON.parse(readFileSync('data/gendai_shiso.json', 'utf-8')) as RawEntry[]).map((e) => ({
    ...e,
    source: '現代思想' as const,
  })),
];

console.log(`Loaded ${rawEntries.length} entries, computing embeddings...`);

const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
  dtype: 'fp32',
});

const entries: Entry[] = [];
for (let i = 0; i < rawEntries.length; i++) {
  const raw = rawEntries[i];
  if (i % 100 === 0) console.log(`  ${i}/${rawEntries.length}`);
  const text = 'query: ' + raw.feature.replace(/^.*?＝/, '');
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  entries.push({ ...raw, embedding: Array.from(out.data as Float32Array) });
}

writeFileSync('public/data.json', JSON.stringify(entries));
console.log(`Generated public/data.json (${entries.length} entries)`);
