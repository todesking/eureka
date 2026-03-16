type Response = {
  choices: {
    message: {
      content: string;
      reasoning?: string;
    };
  }[];
};

export async function extractKeywords(
  concept: string,
  apiKey: string,
  options?: { showReasoning?: boolean },
): Promise<string[]> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'arcee-ai/trinity-large-preview:free',
      ...(options?.showReasoning ? { reasoning: { effort: 'high' } } : {}),
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'keywords',
          strict: true,
          schema: {
            type: 'object',
            properties: {
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
          content: `以下の概念の関連キーワードを日本語と英語で10個程度抽出し、JSON配列で返せ。\n説明文は不要。キーワードのみ。\n\n概念: ${concept}`,
        },
      ],
    }),
  });
  const json = (await res.json()) as Response;
  const message = json.choices[0].message;
  if (options?.showReasoning && message.reasoning) {
    process.stderr.write(message.reasoning + '\n');
  }
  const parsed = JSON.parse(message.content.trim()) as { keywords: string[] };
  return parsed.keywords;
}
