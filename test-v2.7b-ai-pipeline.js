const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { buildChatCompletionsUrl, readAIConfig } = require('./ai-provider');

const mockAIObstaclePayload = {
  vocabularyObstacles: [
    {
      subtitleId: 'subtitle-1',
      surfaceText: 'missed',
      word: 'miss',
      phonetic: '/mɪs/',
      partOfSpeech: 'v.',
      sentenceMeaning: '错过',
    },
    {
      subtitleId: 'subtitle-5',
      surfaceText: 'landlord',
      word: 'landlord',
      phonetic: '/ˈlændlɔːrd/',
      partOfSpeech: 'n.',
      sentenceMeaning: '房东',
    },
  ],
  comprehensionObstacles: [
    {
      subtitleId: 'subtitle-2',
      surfaceText: 'No worries',
      Expression: 'No worries',
      字面意思: '没有担心',
      实际意思: '没关系；不用担心。',
      固定用法: 'No worries',
      表示: '告诉对方不用道歉或不用紧张。',
    },
    {
      subtitleId: 'subtitle-3',
      surfaceText: 'clear my head',
      Expression: 'clear my head',
      字面意思: '清理我的头脑',
      实际意思: '让自己冷静一下；理清思路。',
      固定用法: 'clear somebody\'s head',
      表示: '让某人头脑清醒、重新集中。',
    },
    {
      subtitleId: 'subtitle-4',
      surfaceText: 'bottle it up',
      Expression: 'bottle it up',
      字面意思: '把它装进瓶子里',
      实际意思: '把情绪憋在心里不说。',
      固定用法: 'bottle something up',
      表示: '压住情绪或问题，不表达出来。',
    },
  ],
};

function startMockProvider() {
  const requests = [];
  const server = http.createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/chat/completions') {
      response.writeHead(404);
      response.end('not found');
      return;
    }

    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      const parsedBody = JSON.parse(body);
      requests.push({
        url: request.url,
        authorization: request.headers.authorization,
        body: parsedBody,
      });

      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAIObstaclePayload),
            },
          },
        ],
      }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, requests, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

function runNodeScript(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [command, ...args], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

(async () => {
  assert.ok(fs.existsSync('ai-provider.js'), 'ai-provider.js exists');
  assert.ok(fs.existsSync('generate-obstacles.js'), 'generate-obstacles.js exists');

  const providerSource = fs.readFileSync('ai-provider.js', 'utf8');
  assert.match(providerSource, /AI_BASE_URL/);
  assert.match(providerSource, /AI_API_KEY/);
  assert.match(providerSource, /AI_MODEL/);
  assert.equal(buildChatCompletionsUrl('https://example.test/api/'), 'https://example.test/api/chat/completions');
  assert.deepEqual(readAIConfig({ AI_BASE_URL: 'https://example.test', AI_API_KEY: 'key', AI_MODEL: 'model' }), {
    baseUrl: 'https://example.test',
    apiKey: 'key',
    model: 'model',
  });

  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  assert.match(gitignore, /^\.env$/m, '.gitignore protects .env');
  assert.match(gitignore, /^qwen_api_key\.txt$/m, '.gitignore protects qwen_api_key.txt');

  const mockProvider = await startMockProvider();
  try {
    await runNodeScript('generate-obstacles.js', [], {
      AI_BASE_URL: mockProvider.baseUrl,
      AI_API_KEY: 'unit-test-key',
      AI_MODEL: 'qwen-plus',
      GENERATED_AT: '2026-06-10T00:00:00.000Z',
    });
  } finally {
    mockProvider.server.close();
  }

  assert.equal(mockProvider.requests.length, 1, 'generator calls the provider once');
  assert.equal(mockProvider.requests[0].url, '/chat/completions', 'generator calls /chat/completions');
  assert.equal(mockProvider.requests[0].authorization, 'Bearer unit-test-key');
  assert.equal(mockProvider.requests[0].body.model, 'qwen-plus');
  assert.deepEqual(mockProvider.requests[0].body.response_format, { type: 'json_object' });

  assert.ok(fs.existsSync('sample-obstacles.json'), 'sample-obstacles.json exists after generation');
  const generated = JSON.parse(fs.readFileSync('sample-obstacles.json', 'utf8'));
  assert.equal(generated.generatedByAI, true, 'root generatedByAI is true');
  assert.ok(generated.normalizedObstacles.length > 0, 'normalized obstacles are present');
  generated.normalizedObstacles.forEach((obstacle) => {
    assert.equal(obstacle.generatedByAI, true, 'normalized obstacle generatedByAI is true');
  });

  generated.normalizedObstacles
    .filter((obstacle) => obstacle.type === 'comprehension')
    .forEach((obstacle) => {
      assert.equal(Object.prototype.hasOwnProperty.call(obstacle, 'Grammar Explanation'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(obstacle, 'Usage Notes'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(obstacle, 'Example Sentences'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(obstacle, 'grammar'), false);
      assert.ok(obstacle.Expression);
      assert.ok(obstacle['字面意思']);
      assert.ok(obstacle['实际意思']);
      assert.ok(obstacle['固定用法']);
      assert.ok(obstacle['表示']);
    });

  const runtimeSource = fs.readFileSync('script.js', 'utf8');
  assert.match(runtimeSource, /sample-obstacles\.json/, 'runtime reads generated frozen JSON');
  assert.doesNotMatch(runtimeSource, /AI_BASE_URL|AI_API_KEY|AI_MODEL|chat\/completions/, 'runtime does not call AI or read AI secrets');

  console.log('V2.7B AI episode pipeline checks passed.');
})();
