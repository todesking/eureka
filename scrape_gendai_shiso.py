import csv
import urllib.request
from html.parser import HTMLParser

BASE_URL = "https://www.seidosha.co.jp/book/"


class BookListParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.books = []
        self._in_td = False
        self._current_href = None
        self._current_text = ""

    def handle_starttag(self, tag, attrs):
        if tag == "td":
            self._in_td = True
            self._current_href = None
            self._current_text = ""
        elif tag == "a" and self._in_td:
            attrs_dict = dict(attrs)
            href = attrs_dict.get("href", "")
            if "id=" in href and "status=published" in href:
                self._current_href = href

    def handle_endtag(self, tag):
        if tag == "td" and self._in_td:
            self._in_td = False
            text = self._current_text.strip()
            if self._current_href and "現代思想" in text:
                parts = text.split("\u3000", 1)
                title = parts[0].strip()
                feature = parts[1].strip() if len(parts) > 1 else ""
                href = self._current_href
                if href.startswith("./"):
                    url = BASE_URL + href[2:]
                elif href.startswith("/"):
                    url = "https://www.seidosha.co.jp" + href
                else:
                    url = href
                self.books.append((title, feature, url))

    def handle_data(self, data):
        if self._in_td:
            self._current_text += data


def fetch_year(year):
    url = f"https://www.seidosha.co.jp/book/index.php?year={year}&cat_id=11"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  Error fetching {year}: {e}")
        return []
    parser = BookListParser()
    parser.feed(html)
    return parser.books


def main():
    all_books = []
    for year in range(1973, 2027):
        print(f"Fetching {year}...")
        books = fetch_year(year)
        print(f"  {len(books)} books")
        all_books.extend(books)

    with open("gendai_shiso.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["書名", "特集タイトル", "URL"])
        writer.writerows(all_books)

    print(f"\nTotal: {len(all_books)} rows written to gendai_shiso.csv")


if __name__ == "__main__":
    main()
