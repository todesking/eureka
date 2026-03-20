# Eureka

## Requirements

- [mise](https://mise.jdx.dev/) — Node.js version management
- Node.js 24 (pinned in `.mise.toml`, installed via `mise install`)

```bash
mise install
```

## Setup

```bash
npm install
cp .env.example .env  # set OPENROUTER_API_KEY for embedding
```

## Build data (required for the app to work)

`public/data.json` and the raw `data/*.json` files are `.gitignore`d. Generate them locally:

```bash
npm run scrape        # fetch latest issue lists into data/*.json
npm run build-index   # embed + keyword extraction → public/data.json (needs OPENROUTER_API_KEY)
# or run both:
npm run data
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | Run type check, ESLint, and Prettier |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run scrape` | Scrape issue lists (no API key needed) |
| `npm run build-index` | Generate embeddings & keywords into `public/data.json` |
| `npm run data` | Run scrape + build-index sequentially |
