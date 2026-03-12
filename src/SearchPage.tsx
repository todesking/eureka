import { useSearchParams } from 'react-router-dom';
import { useData, type Entry } from './useData';
import { useState, useEffect, useRef } from 'react';
import { pipeline, type FeatureExtractionPipelineType } from '@huggingface/transformers';

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

type SearchResult = Entry & { score?: number };

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { entries, loading: dataLoading } = useData();
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState(q);
  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current) setInputValue(q);
  }, [q]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q === '') {
      setResults(entries);
      setSearching(false);
      return;
    }

    if (dataLoading) return;

    debounceRef.current = setTimeout(() => {
      setSearching(true);
      void (async () => {
        const extractor = await getExtractor();
        const out = await extractor(`query: ${q}`, { pooling: 'mean', normalize: true });
        const queryVec = Array.from(out.data as Float32Array);
        const scored = entries.map((e) => ({
          entry: e,
          score: cosineSimilarity(queryVec, e.embedding),
        }));
        scored.sort((a, b) => b.score - a.score);
        setResults(scored.slice(0, 50).map((s) => ({ ...s.entry, score: s.score })));
        setSearching(false);
      })();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, entries, dataLoading]);

  const displayResults: SearchResult[] = q === '' ? entries : results;
  const isLoading = dataLoading || searching;

  return (
    <div
      style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}
    >
      <h1>ユリイカ・現代思想 特集検索</h1>
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isComposing.current) {
              setSearchParams(e.target.value ? { q: e.target.value } : {});
            }
          }}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            const v = e.currentTarget.value;
            setInputValue(v);
            setSearchParams(v ? { q: v } : {});
          }}
          placeholder="特集タイトルで検索..."
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', boxSizing: 'border-box' }}
        />
      </div>

      {isLoading && <p>読み込み中...</p>}

      {!isLoading && displayResults.length === 0 && <p>該当なし</p>}

      {!isLoading && displayResults.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>書名</th>
              <th style={{ padding: '0.5rem' }}>特集タイトル</th>
              <th style={{ padding: '0.5rem' }}>雑誌名</th>
              <th style={{ padding: '0.5rem' }}>リンク</th>
              {q !== '' && <th style={{ padding: '0.5rem' }}>スコア</th>}
            </tr>
          </thead>
          <tbody>
            {displayResults.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{entry.title}</td>
                <td style={{ padding: '0.5rem' }}>{entry.feature}</td>
                <td style={{ padding: '0.5rem' }}>{entry.source}</td>
                <td style={{ padding: '0.5rem' }}>
                  <a href={entry.url} target="_blank" rel="noreferrer">
                    詳細
                  </a>
                </td>
                {q !== '' && (
                  <td style={{ padding: '0.5rem' }}>
                    {entry.score !== undefined ? entry.score.toFixed(3) : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!isLoading && (
        <p style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          {displayResults.length} 件{q !== '' && '（上位50件）'}
        </p>
      )}
    </div>
  );
}
