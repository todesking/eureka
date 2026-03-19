import { useSearchParams } from 'react-router-dom';
import { useData } from './useData';
import { useState, useEffect, useRef } from 'react';
import fitty from 'fitty';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSemanticSearch, type SearchResult } from './useSemanticSearch';

const PREFIXES = ['総特集＝', '特集＝'] as const;

function extractPrefix(feature: string) {
  const prefix = PREFIXES.find((p) => feature.startsWith(p));
  return prefix
    ? { label: prefix.slice(0, -1), title: feature.slice(prefix.length) }
    : { label: null, title: feature };
}

function FitText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const instance = fitty(ref.current, { minSize: 14, maxSize: 72 });
    const handleResize = () => instance.fit();
    window.addEventListener('resize', handleResize);
    return () => {
      instance.unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, [children]);
  return (
    <span
      ref={ref}
      className="font-mincho block pb-[0.2em] [font-feature-settings:'palt'] leading-none font-bold whitespace-nowrap text-zinc-900"
    >
      {children}
    </span>
  );
}

function ResultsTable({ results, debug }: { results: SearchResult[]; debug: boolean }) {
  return (
    <Table className="w-full table-fixed">
      <TableBody>
        {results.map((entry, i) => {
          const { label, title: featureTitle } = extractPrefix(entry.feature);
          return (
            <TableRow key={i} className="border-0 hover:bg-zinc-50">
              <TableCell className="py-0.5">
                <a href={entry.url} target="_blank" rel="noreferrer" className="group block">
                  <div className="text-sm text-zinc-400 group-hover:text-zinc-600">
                    {entry.title}
                    {label && <span className="font-mincho ml-2 font-bold">{label}</span>}
                  </div>
                  <div className="mt-0.5 w-full overflow-x-hidden">
                    <FitText>{featureTitle}</FitText>
                  </div>
                </a>
              </TableCell>
              {debug && (
                <TableCell className="text-sm text-zinc-500">
                  {entry.topKeywords?.map((kw) => (
                    <div key={kw.keyword} className="font-mono">
                      <span className="text-zinc-500">{kw.score.toFixed(3)}</span> {kw.keyword}
                    </div>
                  ))}
                </TableCell>
              )}
              {debug && (
                <TableCell className="text-right font-mono text-sm text-zinc-500">
                  {entry.titleScore !== undefined ? entry.titleScore.toFixed(3) : ''}
                </TableCell>
              )}
              {debug && (
                <TableCell className="text-right font-mono text-sm text-zinc-500">
                  {entry.score !== undefined ? entry.score.toFixed(3) : ''}
                </TableCell>
              )}
            </TableRow>
          );
        })}
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

  const isLoading = dataLoading || searching || (showResults && q === '' && inputValue !== '');

  const inputArea = (
    <motion.div
      layoutId="search-area"
      className={!showResults ? 'w-full max-w-xl px-6' : undefined}
    >
      <h1 className="mb-3">
        <a href="/" className="group inline-flex items-baseline gap-3 hover:opacity-80">
          <span className="font-mincho text-2xl font-bold tracking-wider text-[rgb(0,64,134)]">
            ユリイカ・現代思想
          </span>
          <span className="text-xs font-normal tracking-[0.3em] text-zinc-400">特集検索</span>
        </a>
      </h1>
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
            'border-zinc-300 bg-white placeholder:text-zinc-400',
            showResults && 'mb-6',
          )}
        />
        {!showResults && <Button type="submit">検索</Button>}
      </form>
    </motion.div>
  );

  if (!showResults) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-900">
        {inputArea}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {inputArea}

        <AnimatePresence>
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {isLoading && <p className="animate-pulse text-zinc-500">読み込み中...</p>}

            {!isLoading && results.length === 0 && <p className="text-zinc-500">該当なし</p>}

            {!isLoading && results.length > 0 && (
              <ResultsTable results={debug ? results : results.slice(0, 10)} debug={debug} />
            )}

            {!isLoading && (
              <div className="mt-3 flex items-center gap-4">
                <p className="text-sm text-zinc-500">
                  上位 {debug ? results.length : Math.min(results.length, 10)} 件
                </p>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-500">
                  <input
                    type="checkbox"
                    checked={debug}
                    onChange={(e) => setDebug(e.target.checked)}
                    className="accent-[rgb(0,64,134)]"
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
