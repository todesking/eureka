import { useState, useEffect } from 'react';
import { pipeline, type FeatureExtractionPipelineType } from '@huggingface/transformers';
import type { Entry } from './useData';

const SEARCH_LIMIT = 50;
const TOP_KEYWORDS_COUNT = 3;
const EPSILON = 1e-6;
const TITLE_WEIGHT = 2;

export type SearchResult = Entry & {
  score?: number;
  matchedLabel?: string;
  titleScore?: number;
  topKeywords?: { keyword: string; score: number }[];
};

let extractorPromise: Promise<FeatureExtractionPipelineType> | null = null;

function getExtractor(): Promise<FeatureExtractionPipelineType> {
  if (!extractorPromise) {
    // TODO: cast needed due to @huggingface/transformers union type being too complex for TypeScript (TS2590)
    extractorPromise = pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      dtype: 'q8',
    }) as unknown as Promise<FeatureExtractionPipelineType>;
  }
  return extractorPromise;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return dot; // normalize: true なのでL2正規化済み → 内積 = コサイン類似度
}

function scoreEntry(queryVec: number[], e: Entry) {
  const embScore = Math.max(cosineSimilarity(queryVec, e.embedding), EPSILON);
  const kwScores = (e.keyword_embeddings ?? []).map((kw) =>
    Math.max(cosineSimilarity(queryVec, kw), EPSILON),
  );
  const topKw =
    kwScores.length > 0
      ? kwScores
          .slice()
          .sort((a, b) => b - a)
          .slice(0, TOP_KEYWORDS_COUNT)
      : [];
  const geoValues = [...topKw, ...Array<number>(TITLE_WEIGHT).fill(embScore)];
  const score = Math.exp(geoValues.reduce((s, v) => s + Math.log(v), 0) / geoValues.length);
  const maxKwScore = kwScores.length > 0 ? Math.max(...kwScores) : embScore;
  const maxKwIndex = kwScores.indexOf(maxKwScore);
  const matchedLabel = e.keywords?.[maxKwIndex] ?? `kw[${maxKwIndex}]`;
  const topKeywords = kwScores
    .map((s, i) => ({ keyword: e.keywords?.[i] ?? `kw[${i}]`, score: s }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_KEYWORDS_COUNT);
  return { entry: e, score, matchedLabel, titleScore: embScore, topKeywords };
}

export function useSemanticSearch(
  q: string,
  entries: Entry[],
  dataLoading: boolean,
): { results: SearchResult[]; searching: boolean; error: string | null } {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q === '') {
      const getId = (url: string) => parseInt(new URL(url).searchParams.get('id') ?? '0', 10);
      setResults([...entries].sort((a, b) => getId(b.url) - getId(a.url)));
      setSearching(false);
      setError(null);
      return;
    }

    if (dataLoading) return;

    setSearching(true);
    setError(null);
    let cancelled = false;

    void (async () => {
      try {
        const extractor = await getExtractor();
        const outQuery = await extractor(`query: ${q}`, { pooling: 'mean', normalize: true });
        if (cancelled) return;
        const queryVec = Array.from(outQuery.data as Float32Array);
        const scored = entries.map((e) => scoreEntry(queryVec, e));
        scored.sort((a, b) => b.score - a.score);
        setResults(
          scored.slice(0, SEARCH_LIMIT).map((s) => ({
            ...s.entry,
            score: s.score,
            matchedLabel: s.matchedLabel,
            titleScore: s.titleScore,
            topKeywords: s.topKeywords,
          })),
        );
        setSearching(false);
      } catch (err) {
        if (cancelled) return;
        extractorPromise = null;
        setError(err instanceof Error ? err.message : 'Search model failed to load');
        setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q, entries, dataLoading]);

  return { results, searching, error };
}
