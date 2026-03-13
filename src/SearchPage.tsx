import { useSearchParams } from 'react-router-dom';
import { useData } from './useData';
import { useState, useEffect, useRef } from 'react';
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
import { cn } from '@/lib/utils';
import { useSemanticSearch, type SearchResult } from './useSemanticSearch';

function ResultsTable({ results }: { results: SearchResult[] }) {
  return (
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
        {results.map((entry, i) => (
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
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { entries, loading: dataLoading } = useData();
  const [showResults, setShowResults] = useState(q !== '');
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
      <h1 className="text-2xl font-bold tracking-tight mb-6">ユリイカ・現代思想 特集検索</h1>
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
            'bg-zinc-900 border-zinc-700 placeholder:text-zinc-500',
            showResults && 'mb-6',
          )}
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

            {!isLoading && results.length === 0 && <p className="text-zinc-400">該当なし</p>}

            {!isLoading && results.length > 0 && <ResultsTable results={results} />}

            {!isLoading && (
              <p className="text-sm text-zinc-400 mt-3">{results.length} 件（上位50件）</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
