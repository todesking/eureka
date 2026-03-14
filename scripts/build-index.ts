import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

let existingEntries: Entry[] = [];
if (existsSync('public/data.json')) {
  existingEntries = JSON.parse(readFileSync('public/data.json', 'utf-8')) as Entry[];
}
const existingUrls = new Set(existingEntries.map((e) => e.url));
const newRawEntries = rawEntries.filter((e) => !existingUrls.has(e.url));

console.log(
  `Existing index found, ${existingEntries.length} entries cached, ${newRawEntries.length} new entries to embed`,
);

const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
  dtype: 'fp32',
});

const newEntries: Entry[] = [];
for (let i = 0; i < newRawEntries.length; i++) {
  const raw = newRawEntries[i];
  if (i % 100 === 0) console.log(`  ${i}/${newRawEntries.length}`);
  const text = 'query: ' + raw.feature.replace(/^.*?＝/, '');
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  newEntries.push({ ...raw, embedding: Array.from(out.data as Float32Array) });
}

writeFileSync('public/data.json', JSON.stringify([...existingEntries, ...newEntries]));
console.log(`Generated public/data.json (${existingEntries.length + newEntries.length} entries)`);
