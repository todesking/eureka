import { useState, useEffect } from 'react';

export interface Entry {
  title: string;
  feature: string;
  url: string;
  source: 'ユリイカ' | '現代思想';
  keywords?: string[];
  embedding: number[];
  keyword_embeddings?: number[][];
}

export function useData() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch('/data.json')
      .then((r) => r.json() as Promise<Entry[]>)
      .then((data) => {
        setEntries(data);
        setLoading(false);
      });
  }, []);

  return { entries, loading };
}
