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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL('data.json', import.meta.env.BASE_URL).toString();
    void fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch data: ${r.status}`);
        return r.json() as Promise<Entry[]>;
      })
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
      });
  }, []);

  return { entries, loading, error };
}
