process.loadEnvFile('.env');
import { extractKeywords } from './lib/keywords.js';

const [subcommand, arg] = process.argv.slice(2);

if (subcommand === 'keywords') {
  if (!arg) {
    console.error('Usage: debug keywords <TITLE>');
    process.exit(1);
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');
  const keywords = await extractKeywords(arg, apiKey, { showReasoning: true });
  console.log(JSON.stringify(keywords, null, 2));
} else {
  console.error(`Unknown subcommand: ${subcommand}`);
  process.exit(1);
}
