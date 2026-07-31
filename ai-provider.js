async function requestChatCompletion({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY or AI_API_KEY. Runtime does not use this provider; it is only for offline content generation.');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI provider returned an empty response.');
  }

  return JSON.parse(content);
}

module.exports = {
  requestChatCompletion,
};
