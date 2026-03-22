import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { FitText } from './FitText';
import type { SearchResult } from '../useSemanticSearch';

const PREFIXES = ['総特集＝', '特集＝'] as const;

function extractPrefix(feature: string) {
  const prefix = PREFIXES.find((p) => feature.startsWith(p));
  return prefix
    ? { label: prefix.slice(0, -1), title: feature.slice(prefix.length) }
    : { label: null, title: feature };
}

export function ResultsTable({ results, debug }: { results: SearchResult[]; debug: boolean }) {
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
                  <div className="mt-0.5 w-full overflow-x-clip">
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
