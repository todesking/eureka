import { useState, useEffect } from 'react';
import { pipeline, type FeatureExtractionPipelineType } from '@huggingface/transformers';
import type { Entry } from './useData';

export type SearchResult = Entry & { score?: number; queryScore?: number; passageScore?: number };

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
      const [outQuery, outPassage] = await Promise.all([
        extractor(`query: ${q}`, { pooling: 'mean', normalize: true }),
        extractor(`passage: ${q}`, { pooling: 'mean', normalize: true }),
      ]);
      if (cancelled) return;
      const queryVec = Array.from(outQuery.data as Float32Array);
      const passageVec = Array.from(outPassage.data as Float32Array);
      const scored = entries.map((e) => {
        const queryScore = cosineSimilarity(queryVec, e.embedding);
        const passageScore = cosineSimilarity(passageVec, e.embedding);
        return { entry: e, score: Math.max(queryScore, passageScore), queryScore, passageScore };
      });
      scored.sort((a, b) => b.score - a.score);
      setResults(
        scored.slice(0, 50).map((s) => ({
          ...s.entry,
          score: s.score,
          queryScore: s.queryScore,
          passageScore: s.passageScore,
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
