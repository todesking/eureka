import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';
import { extractKeywords } from './lib/keywords.js';

process.loadEnvFile('.env');

type Source = 'ユリイカ' | '現代思想';

interface Entry {
  title: string;
  feature: string;
  url: string;
  source: Source;
  keywords: string[];
  embedding: number[];
  keyword_embeddings: number[][];
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
  existingEntries = (JSON.parse(readFileSync('public/data.json', 'utf-8')) as Partial<Entry>[]).map(
    (e) => ({
      ...e,
      keywords: e.keywords ?? [],
      keyword_embeddings: e.keyword_embeddings ?? [],
    }),
  ) as Entry[];
}
const existingUrls = new Set(existingEntries.map((e) => e.url));
const newRawEntries = rawEntries.filter((e) => !existingUrls.has(e.url));

console.log(
  `Existing index found, ${existingEntries.length} entries cached, ${newRawEntries.length} new entries to embed`,
);

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('OPENROUTER_API_KEY is not set');
}

const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
  dtype: 'fp32',
});

const CHECKPOINT_INTERVAL = 100;

function extractConcept(feature: string): string {
  return feature.replace(/^.*?＝/, '');
}

async function embedKeywords(keywords: string[]): Promise<number[][]> {
  return Promise.all(
    keywords.map(async (kw) => {
      const out = await extractor('query: ' + kw, { pooling: 'mean', normalize: true });
      return Array.from(out.data as Float32Array);
    }),
  );
}

function saveCheckpoint(existingEntries: Entry[], newEntries: Entry[], label: string): void {
  writeFileSync('public/data.json', JSON.stringify([...existingEntries, ...newEntries]));
  console.log(`  [checkpoint] ${label}`);
}

const newEntries: Entry[] = [];
let updatedCount = 0;
for (const entry of existingEntries) {
  const needsKeywords = !entry.keywords.length;
  const needsKwEmbed = !entry.keyword_embeddings.length;
  if (!needsKeywords && !needsKwEmbed) continue;

  const concept = extractConcept(entry.feature);
  console.log(`[update] ${entry.title} / ${concept}`);

  if (needsKeywords) {
    entry.keywords = await extractKeywords(concept, apiKey);
    console.log(`  keywords: ${entry.keywords.join(', ')}`);
  }

  if (needsKwEmbed) {
    entry.keyword_embeddings = await embedKeywords(entry.keywords);
  }

  updatedCount++;
  if (updatedCount % CHECKPOINT_INTERVAL === 0) {
    saveCheckpoint(existingEntries, newEntries, `saved ${updatedCount} updates`);
  }
}

for (const raw of newRawEntries) {
  const concept = extractConcept(raw.feature);
  console.log(`[new] ${raw.title} / ${concept}`);

  const [out, keywords] = await Promise.all([
    extractor('query: ' + concept, { pooling: 'mean', normalize: true }),
    extractKeywords(concept, apiKey),
  ]);
  console.log(`  keywords: ${keywords.join(', ')}`);

  const keyword_embeddings = await embedKeywords(keywords);

  newEntries.push({
    ...raw,
    keywords,
    embedding: Array.from(out.data as Float32Array),
    keyword_embeddings,
  });

  if (newEntries.length % CHECKPOINT_INTERVAL === 0) {
    saveCheckpoint(existingEntries, newEntries, `saved ${newEntries.length} new entries`);
  }
}

writeFileSync('public/data.json', JSON.stringify([...existingEntries, ...newEntries]));
console.log(`Generated public/data.json (${existingEntries.length + newEntries.length} entries)`);
