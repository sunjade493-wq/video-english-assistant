const REQUIRED_ENV_VARS = ['AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL'];

function readAIConfig(env = process.env) {
  const config = {
    baseUrl: env.AI_BASE_URL,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
  };

  const missing = REQUIRED_ENV_VARS.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required AI environment variables: ${missing.join(', ')}`);
  }

  return config;
}

function buildChatCompletionsUrl(baseUrl) {
  return `${String(baseUrl).replace(/\/+$/g, '')}/chat/completions`;
}

async function createJsonChatCompletion(messages, options = {}) {
  const env = options.env || process.env;
  const fetchImplementation = options.fetch || globalThis.fetch;

  if (typeof fetchImplementation !== 'function') {
    throw new Error('No fetch implementation is available for AI provider calls. Use Node.js 18+ or pass options.fetch.');
  }

  const { baseUrl, apiKey, model } = readAIConfig(env);
  const url = buildChatCompletionsUrl(baseUrl);
  const response = await fetchImplementation(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`AI provider request failed with ${response.status}: ${responseText}`);
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`AI provider returned non-JSON response: ${error.message}`);
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('AI provider response did not include choices[0].message.content.');
  }

  let jsonContent;
  try {
    jsonContent = JSON.parse(content);
  } catch (error) {
    throw new Error(`AI provider message content was not valid JSON: ${error.message}`);
  }

  return {
    url,
    model,
    payload,
    jsonContent,
  };
}

module.exports = {
  REQUIRED_ENV_VARS,
  readAIConfig,
  buildChatCompletionsUrl,
  createJsonChatCompletion,
};
