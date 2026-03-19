import { useState, useEffect } from 'react';
import { pipeline, type FeatureExtractionPipelineType } from '@huggingface/transformers';
import type { Entry } from './useData';

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

export function useSemanticSearch(
  q: string,
  entries: Entry[],
  dataLoading: boolean,
): { results: SearchResult[]; searching: boolean } {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (q === '') {
      setResults(entries);
      setSearching(false);
      return;
    }

    if (dataLoading) return;

    setSearching(true);
    let cancelled = false;

    void (async () => {
      const extractor = await getExtractor();
      const outQuery = await extractor(`query: ${q}`, { pooling: 'mean', normalize: true });
      if (cancelled) return;
      const queryVec = Array.from(outQuery.data as Float32Array);
      const scored = entries.map((e) => {
        const embScore = cosineSimilarity(queryVec, e.embedding);
        const kwScores = (e.keyword_embeddings ?? []).map((kw) => cosineSimilarity(queryVec, kw));
        const top3 =
          kwScores.length > 0
            ? kwScores
                .slice()
                .sort((a, b) => b - a)
                .slice(0, 3)
            : [];
        const geoValues = [...top3, embScore];
        const score = Math.exp(geoValues.reduce((s, v) => s + Math.log(v), 0) / geoValues.length);
        const maxKwScore = kwScores.length > 0 ? Math.max(...kwScores) : embScore;
        const maxKwIndex = kwScores.indexOf(maxKwScore);
        const matchedLabel = e.keywords?.[maxKwIndex] ?? `kw[${maxKwIndex}]`;
        const topKeywords = kwScores
          .map((s, i) => ({ keyword: e.keywords?.[i] ?? `kw[${i}]`, score: s }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        return { entry: e, score, matchedLabel, titleScore: embScore, topKeywords };
      });
      scored.sort((a, b) => b.score - a.score);
      setResults(
        scored.slice(0, 10).map((s) => ({
          ...s.entry,
          score: s.score,
          matchedLabel: s.matchedLabel,
          titleScore: s.titleScore,
          topKeywords: s.topKeywords,
        })),
      );
      setSearching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [q, entries, dataLoading]);

  return { results, searching };
}
