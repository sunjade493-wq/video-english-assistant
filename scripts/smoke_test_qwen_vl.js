#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen-vl-plus';
const PROMPT = 'Describe this image briefly. Return only JSON: {"ok": true, "description": "..."}';

// 1x1 PNG with a red pixel. Generated from a fixed base64 literal so this
// smoke test does not need production dependencies or image tooling.
const TINY_RED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z8BQDwAFgwJ/lZK3ygAAAABJRU5ErkJggg==';

function maskApiKey(apiKey) {
  if (!apiKey) return '(missing)';
  const prefix = apiKey.slice(0, 3);
  const suffix = apiKey.slice(-4);
  return `${prefix}****${suffix}`;
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;

  console.log(`model: ${MODEL}`);
  console.log(`api key detected: ${apiKey ? 'yes' : 'no'}`);
  console.log(`api key masked: ${maskApiKey(apiKey)}`);

  if (!apiKey) {
    console.error('DASHSCOPE_API_KEY is missing. Set process.env.DASHSCOPE_API_KEY before running this smoke test.');
    process.exitCode = 1;
    return;
  }

  const tmpDir = path.join(process.cwd(), 'tmp');
  const imagePath = path.join(tmpDir, 'qwen_vl_smoke_test.png');
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(imagePath, Buffer.from(TINY_RED_PNG_BASE64, 'base64'));

  const imageDataUrl = `data:image/png;base64,${TINY_RED_PNG_BASE64}`;
  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  };

  console.log(`endpoint: ${ENDPOINT}`);
  console.log(`temporary image: ${imagePath}`);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    console.log(`api call succeeded: ${response.ok ? 'yes' : 'no'}`);

    if (!response.ok) {
      console.error(`DashScope request failed with HTTP ${response.status} ${response.statusText}.`);
      console.error('If this is a model availability error for qwen-vl-plus, verify that the model is enabled for this DashScope account/region.');
      console.log(`raw response text: ${responseText}`);
      process.exitCode = 1;
      return;
    }

    let rawModelText = '';
    try {
      const payload = JSON.parse(responseText);
      rawModelText = payload?.choices?.[0]?.message?.content ?? '';
    } catch (_) {
      rawModelText = responseText;
    }

    console.log(`raw response text: ${rawModelText}`);
    const parsed = extractJson(rawModelText);
    console.log(`parsed JSON: ${parsed ? JSON.stringify(parsed, null, 2) : '(not parseable)'}`);
  } catch (error) {
    console.log('api call succeeded: no');
    console.error(`DashScope request error: ${error && error.message ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

main();
