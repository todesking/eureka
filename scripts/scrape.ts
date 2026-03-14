import { writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const BASE_URL = 'https://www.seidosha.co.jp/book/';

interface Book {
  title: string;
  feature: string;
  url: string;
}

function parseBooks(html: string, nameFilter: string): Book[] {
  const { document } = new JSDOM(html).window;
  const books: Book[] = [];

  for (const td of document.querySelectorAll('td')) {
    const a = td.querySelector('a');
    if (!a) continue;
    const href = a.getAttribute('href') ?? '';
    if (!href.includes('id=') || !href.includes('status=published')) continue;
    const text = td.textContent?.trim() ?? '';
    if (!text.includes(nameFilter)) continue;

    const parts = text.split('\u3000', 2);
    const title = parts[0]?.trim() ?? '';
    const feature = parts[1]?.trim() ?? '';

    let url: string;
    if (href.startsWith('./')) {
      url = BASE_URL + href.slice(2);
    } else if (href.startsWith('/')) {
      url = 'https://www.seidosha.co.jp' + href;
    } else {
      url = href;
    }

    books.push({ title, feature, url });
  }

  return books;
}

async function fetchYear(year: number, catId: number): Promise<string> {
  const url = `https://www.seidosha.co.jp/book/index.php?year=${year}&cat_id=${catId}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  return res.text();
}

async function scrape(config: {
  name: string;
  catId: number;
  filter: string;
  years: [number, number];
  out: string;
}): Promise<void> {
  const allBooks: Book[] = [];
  for (let year = config.years[0]; year <= config.years[1]; year++) {
    process.stdout.write(`[${config.name}] Fetching ${year}...`);
    try {
      const html = await fetchYear(year, config.catId);
      const books = parseBooks(html, config.filter);
      console.log(` ${books.length} books`);
      allBooks.push(...books);
    } catch (e) {
      console.log(` Error: ${e}`);
    }
  }
  writeFileSync(config.out, JSON.stringify(allBooks, null, 2));
  console.log(`\nTotal: ${allBooks.length} entries written to ${config.out}`);
}

await scrape({
  name: 'ユリイカ',
  catId: 10,
  filter: 'ユリイカ',
  years: [1988, 2026],
  out: 'data/eureka.json',
});
await scrape({
  name: '現代思想',
  catId: 11,
  filter: '現代思想',
  years: [1973, 2026],
  out: 'data/gendai_shiso.json',
});
