import { useSearchParams } from 'react-router-dom';
import { useData } from './useData';
import { useState, useEffect, useRef } from 'react';
import fitty from 'fitty';
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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSemanticSearch, type SearchResult } from './useSemanticSearch';

function FitText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const instance = fitty(ref.current, { minSize: 14, maxSize: 72 });
    return () => instance.unsubscribe();
  }, [children]);
  const prefix = ['総特集＝', '特集＝'].find((p) => children.startsWith(p));
  const hasPrefix = prefix !== undefined;
  return (
    <span ref={ref} className="font-mincho block font-bold whitespace-nowrap">
      {hasPrefix ? (
        <>
          <span className="inline-block w-[4em] text-right text-[0.4em]">{prefix}</span>
          {children.slice(prefix!.length)}
        </>
      ) : (
        children
      )}
    </span>
  );
}

function ResultsTable({ results, debug }: { results: SearchResult[]; debug: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-400">特集</TableHead>
          {debug && <TableHead className="text-zinc-400">キーワード top3</TableHead>}
          {debug && <TableHead className="text-right text-zinc-400">特集類似度</TableHead>}
          {debug && <TableHead className="text-right text-zinc-400">スコア</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((entry, i) => (
          <TableRow key={i} className="border-zinc-800 hover:bg-zinc-900/50">
            <TableCell>
              <a href={entry.url} target="_blank" rel="noreferrer" className="group block">
                <div className="text-sm text-zinc-500 group-hover:text-zinc-400">{entry.title}</div>
                <FitText>{entry.feature}</FitText>
              </a>
            </TableCell>
            {debug && (
              <TableCell className="text-sm text-zinc-400">
                {entry.topKeywords?.map((kw) => (
                  <div key={kw.keyword} className="font-mono">
                    <span className="text-zinc-500">{kw.score.toFixed(3)}</span> {kw.keyword}
                  </div>
                ))}
              </TableCell>
            )}
            {debug && (
              <TableCell className="text-right font-mono text-sm text-zinc-400">
                {entry.titleScore !== undefined ? entry.titleScore.toFixed(3) : ''}
              </TableCell>
            )}
            {debug && (
              <TableCell className="text-right font-mono text-sm text-zinc-400">
                {entry.score !== undefined ? entry.score.toFixed(3) : ''}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { entries, loading: dataLoading } = useData();
  const [showResults, setShowResults] = useState(q !== '');
  const [debug, setDebug] = useState(false);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState(q);
  const isComposing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevQ = useRef(q);

  const { results, searching } = useSemanticSearch(q, entries, dataLoading);

  useEffect(() => {
    if (prevQ.current === '' && q !== '') {
      inputRef.current?.focus();
    }
    prevQ.current = q;
  }, [q]);

  useEffect(() => {
    if (!isComposing.current) setInputValue(q);
  }, [q]);

  function setQuery(value: string, immediate = false) {
    if (urlDebounceRef.current) clearTimeout(urlDebounceRef.current);
    if (immediate) {
      setShowResults(true);
      setSearchParams(value ? { q: value } : {});
    } else {
      urlDebounceRef.current = setTimeout(() => {
        setSearchParams(value ? { q: value } : {});
      }, 800);
    }
  }

  const isLoading = dataLoading || searching;

  const inputArea = (
    <motion.div
      layoutId="search-area"
      className={!showResults ? 'w-full max-w-xl px-6' : undefined}
    >
      <h1 className="mb-6 text-2xl font-bold tracking-tight">ユリイカ・現代思想 特集検索</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(inputValue, true);
        }}
        className={!showResults ? 'flex gap-2' : undefined}
      >
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!isComposing.current && showResults) {
              setQuery(e.target.value);
            }
          }}
          onCompositionStart={() => {
            isComposing.current = true;
          }}
          onCompositionEnd={(e) => {
            isComposing.current = false;
            const v = e.currentTarget.value;
            setInputValue(v);
            if (showResults) setQuery(v);
          }}
          ref={inputRef}
          placeholder="特集タイトルで検索..."
          className={cn(
            'border-zinc-700 bg-zinc-900 placeholder:text-zinc-500',
            showResults && 'mb-6',
          )}
        />
        {!showResults && <Button type="submit">検索</Button>}
      </form>
    </motion.div>
  );

  if (!showResults) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
        {inputArea}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {inputArea}

        <AnimatePresence>
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isLoading && <p className="animate-pulse text-zinc-400">読み込み中...</p>}

            {!isLoading && results.length === 0 && <p className="text-zinc-400">該当なし</p>}

            {!isLoading && results.length > 0 && (
              <ResultsTable results={debug ? results : results.slice(0, 10)} debug={debug} />
            )}

            {!isLoading && (
              <div className="mt-3 flex items-center gap-4">
                <p className="text-sm text-zinc-400">上位 {debug ? results.length : Math.min(results.length, 10)} 件</p>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-500">
                  <input
                    type="checkbox"
                    checked={debug}
                    onChange={(e) => setDebug(e.target.checked)}
                    className="accent-zinc-500"
                  />
                  debug
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
