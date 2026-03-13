import { useSearchParams } from 'react-router-dom';
import { useData, type Entry } from './useData';
import { useState, useEffect, useRef } from 'react';
import { pipeline, type FeatureExtractionPipelineType } from '@huggingface/transformers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

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

type SearchResult = Entry & { score?: number; queryScore?: number; passageScore?: number };

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { entries, loading: dataLoading } = useData();
  const [showResults, setShowResults] = useState(q !== '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState(q);
  const isComposing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevQ = useRef(q);

  useEffect(() => {
    if (prevQ.current === '' && q !== '') {
      inputRef.current?.focus();
    }
    prevQ.current = q;
  }, [q]);

  function submitSearch(value: string) {
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    setShowResults(true);
    setSearchParams(value ? { q: value } : {});
  }

  function updateSearchParams(value: string) {
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    urlDebounceRef.current = setTimeout(() => {
      setSearchParams(value ? { q: value } : {});
    }, 800);
  }

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
        const [outQuery, outPassage] = await Promise.all([
          extractor(`query: ${q}`, { pooling: 'mean', normalize: true }),
          extractor(`passage: ${q}`, { pooling: 'mean', normalize: true }),
        ]);
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
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, entries, dataLoading]);

  const isLoading = dataLoading || searching;

  const inputArea = (
    <motion.div
      layoutId="search-area"
      className={!showResults ? 'w-full max-w-xl px-6' : undefined}
    >
      <h1 className="text-2xl font-bold tracking-tight mb-6">ユリイカ・現代思想 特集検索</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch(inputValue);
        }}
        className={!showResults ? 'flex gap-2' : undefined}
      >
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isComposing.current && showResults) {
              updateSearchParams(e.target.value);
            }
          }}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            const v = e.currentTarget.value;
            setInputValue(v);
            if (showResults) updateSearchParams(v);
          }}
          ref={inputRef}
          placeholder="特集タイトルで検索..."
          className={`bg-zinc-900 border-zinc-700 placeholder:text-zinc-500 ${!showResults ? '' : 'mb-6'}`}
        />
        {!showResults && <Button type="submit">検索</Button>}
      </form>
    </motion.div>
  );

  if (!showResults) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">
        {inputArea}
      </div>
    );
  }

  const displayResults: SearchResult[] = results;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {inputArea}

        <AnimatePresence>
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isLoading && <p className="text-zinc-400 animate-pulse">読み込み中...</p>}

            {!isLoading && displayResults.length === 0 && <p className="text-zinc-400">該当なし</p>}

            {!isLoading && displayResults.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400">書名</TableHead>
                    <TableHead className="text-zinc-400">特集タイトル</TableHead>
                    <TableHead className="text-zinc-400">雑誌名</TableHead>
                    <TableHead className="text-zinc-400">リンク</TableHead>
                    <TableHead className="text-zinc-400 text-right">queryスコア</TableHead>
                    <TableHead className="text-zinc-400 text-right">passageスコア</TableHead>
                    <TableHead className="text-zinc-400 text-right">スコア</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayResults.map((entry, i) => (
                    <TableRow key={i} className="border-zinc-800 hover:bg-zinc-900/50">
                      <TableCell className="text-zinc-100">{entry.title}</TableCell>
                      <TableCell className="text-zinc-100">{entry.feature}</TableCell>
                      <TableCell>
                        <Badge variant={entry.source === 'ユリイカ' ? 'default' : 'secondary'}>
                          {entry.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 hover:text-zinc-100 underline underline-offset-2 transition-colors"
                        >
                          詳細
                        </a>
                      </TableCell>
                      <TableCell className="font-mono text-right text-sm text-zinc-400">
                        {entry.queryScore !== undefined ? entry.queryScore.toFixed(3) : ''}
                      </TableCell>
                      <TableCell className="font-mono text-right text-sm text-zinc-400">
                        {entry.passageScore !== undefined ? entry.passageScore.toFixed(3) : ''}
                      </TableCell>
                      <TableCell className="font-mono text-right text-sm text-zinc-400">
                        {entry.score !== undefined ? entry.score.toFixed(3) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && (
              <p className="text-sm text-zinc-400 mt-3">{displayResults.length} 件（上位50件）</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
