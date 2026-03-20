import { useSearchParams, Link } from 'react-router-dom';
import { useData } from './useData';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSemanticSearch } from './useSemanticSearch';
import { ResultsTable } from './components/ResultsTable';

const DEBOUNCE_MS = 800;
const DISPLAY_LIMIT = 10;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { entries, loading: dataLoading, error: dataError } = useData();
  const [showResults, setShowResults] = useState(q !== '');
  const [debug, setDebug] = useState(false);
  const urlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inputValue, setInputValue] = useState(q);
  const isComposing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevQ = useRef(q);

  const { results, searching, error: searchError } = useSemanticSearch(q, entries, dataLoading);

  const error = dataError ?? searchError;

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
      }, DEBOUNCE_MS);
    }
  }

  const isLoading = dataLoading || searching || (showResults && q === '' && inputValue !== '');

  const inputArea = (
    <motion.div
      layoutId="search-area"
      className={!showResults ? 'w-full max-w-xl px-6' : undefined}
    >
      <h1 className="mb-3">
        <Link to="/" className="group inline-flex items-baseline gap-3 hover:opacity-80">
          <span className="font-mincho text-2xl font-bold tracking-wider text-[rgb(0,64,134)]">
            ユリイカ・現代思想
          </span>
          <span className="text-xs font-normal tracking-[0.3em] text-zinc-400">特集検索</span>
        </Link>
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
        <div className="flex flex-col items-center gap-4">
          {inputArea}
          <p className="text-xs text-zinc-400">※ 初回検索時に約200MBのデータをダウンロードします</p>
        </div>
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
            {error && <p className="text-red-600">{error}</p>}

            {!error && isLoading && <p className="animate-pulse text-zinc-500">読み込み中...</p>}

            {!error && !isLoading && results.length === 0 && (
              <p className="text-zinc-500">該当なし</p>
            )}

            {!error && !isLoading && results.length > 0 && (
              <ResultsTable
                results={debug ? results : results.slice(0, DISPLAY_LIMIT)}
                debug={debug}
              />
            )}

            {!error && !isLoading && (
              <div className="mt-3 flex items-center gap-4">
                <p className="text-sm text-zinc-500">
                  上位 {debug ? results.length : Math.min(results.length, DISPLAY_LIMIT)} 件
                </p>
                <label
                  htmlFor="debug-toggle"
                  className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-500"
                >
                  <input
                    id="debug-toggle"
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
