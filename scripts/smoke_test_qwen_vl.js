#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen-vl-plus';
const PROMPT = 'Describe this image briefly. Return only JSON: {"ok": true, "description": "..."}';

const SMOKE_TEST_IMAGE_SIZE = 64;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

// 64x64 PNG generated with Node built-ins so the smoke test remains
// dependency-free while satisfying qwen-vl-plus image size restrictions.
function createSmokeTestPngBase64(size = SMOKE_TEST_IMAGE_SIZE) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // Bit depth.
  header[9] = 2; // Truecolor RGB.
  header[10] = 0; // Compression method.
  header[11] = 0; // Filter method.
  header[12] = 0; // No interlace.

  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // No filter for this scanline.
  for (let x = 0; x < size; x += 1) {
    const offset = 1 + x * 3;
    row[offset] = 255;
    row[offset + 1] = x % 2 === 0 ? 0 : 96;
    row[offset + 2] = 0;
  }

  const imageData = Buffer.concat(Array.from({ length: size }, () => row));
  const compressed = zlib.deflateSync(imageData);

  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]).toString('base64');
}

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
  const smokeTestPngBase64 = createSmokeTestPngBase64();
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(imagePath, Buffer.from(smokeTestPngBase64, 'base64'));

  const imageDataUrl = `data:image/png;base64,${smokeTestPngBase64}`;
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
