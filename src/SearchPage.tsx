import { useSearchParams } from 'react-router-dom';
import { useData } from './useData';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const { entries, loading } = useData();

  const filtered = q === '' ? entries : entries.filter((e) => e.feature.includes(q));

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
    setSearchParams(input.value ? { q: input.value } : {});
  }

  return (
    <div
      style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem', fontFamily: 'sans-serif' }}
    >
      <h1>ユリイカ・現代思想 特集検索</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
      >
        <input
          name="q"
          defaultValue={q}
          key={q}
          placeholder="特集タイトルで検索..."
          style={{ flex: 1, padding: '0.5rem', fontSize: '1rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
          検索
        </button>
      </form>

      {loading && <p>読み込み中...</p>}

      {!loading && filtered.length === 0 && <p>該当なし</p>}

      {!loading && filtered.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>書名</th>
              <th style={{ padding: '0.5rem' }}>特集タイトル</th>
              <th style={{ padding: '0.5rem' }}>雑誌名</th>
              <th style={{ padding: '0.5rem' }}>リンク</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{entry.title}</td>
                <td style={{ padding: '0.5rem' }}>{entry.feature}</td>
                <td style={{ padding: '0.5rem' }}>{entry.source}</td>
                <td style={{ padding: '0.5rem' }}>
                  <a href={entry.url} target="_blank" rel="noreferrer">
                    詳細
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && (
        <p style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.9rem' }}>
          {filtered.length} 件
        </p>
      )}
    </div>
  );
}
