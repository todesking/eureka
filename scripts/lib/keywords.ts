type Response = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

const PROMPT = `
雑誌の特集タイトルを検索するシステムを作っている。
特集の概念に関連するキーワードを使用したドキュメント拡張を行いたい。
キーワードを10個程度挙げ、JSON形式として返答せよ。

注意点:
- キーワードの多様性を重視
- キーワードから特集の概念が自然に連想できること
- ユーザの検索クエリに含まれそうなキーワードであること
- 狭すぎるキーワード(マニアックすぎるもの)は避ける
- 広すぎるキーワード(例: 思想, 西洋など、範囲が広すぎるもの)は避ける
- 固有名詞は3個程度にする

JSONの形式:
\`\`\`
{
  reasoning_steps: string[], // 思考の過程
  keywords: []
}
\`\`\`

特集: {CONCEPT}
`;

const MODEL = 'arcee-ai/trinity-large-preview:free';
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

export async function extractKeywords(
  concept: string,
  apiKey: string,
  options?: { showReasoning?: boolean },
): Promise<string[]> {
  const body = JSON.stringify({
    model: MODEL,
    reasoning: { effort: 'high' },
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'keywords',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            reasoning_steps: {
              type: 'array',
              items: { type: 'string' },
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['keywords'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: PROMPT.replace('{CONCEPT}', concept),
      },
    ],
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      const json = (await res.json()) as Response;
      clearTimeout(timer);
      const message = json.choices[0].message;
      const parsed = JSON.parse(message.content.trim()) as {
        reasoning_steps: string[];
        keywords: string[];
      };
      if (options?.showReasoning && parsed.reasoning_steps) {
        process.stderr.write(parsed.reasoning_steps.join('\n') + '\n');
      }
      return parsed.keywords;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === MAX_RETRIES) throw err;
      console.error(`  [retry] attempt ${attempt} failed: ${err}`);
    }
  }

  // unreachable
  throw new Error('unreachable');
}
