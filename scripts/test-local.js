#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Starting local test server for SlyxUp...\n');

// Load local registry
const registryContent = readFileSync(
  path.join(__dirname, '..', 'registry.local.json'),
  'utf-8'
);

// Load React template archive
const templatePath = path.join(
  __dirname,
  '..',
  '..',
  'templates',
  'react',
  'v1.0.0',
  'react-1.0.0.tar.gz'
);

let templateBuffer;
try {
  templateBuffer = readFileSync(templatePath);
  console.log(`✅ Loaded React template (${templateBuffer.length} bytes)`);
} catch (error) {
  console.error(`❌ Failed to load template: ${error.message}`);
  console.error('   Make sure to run: cd ../templates && ./scripts/package-react.sh');
  process.exit(1);
}

const server = createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`📡 ${req.method} ${req.url}`);

  // Serve registry
  if (req.url === '/registry.json' || req.url === '/') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(registryContent);
    console.log('   ✓ Served registry.json');
    return;
  }

  // Serve React template
  if (req.url === '/templates/react-1.0.0.tar.gz') {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Length', templateBuffer.length);
    res.writeHead(200);
    res.end(templateBuffer);
    console.log('   ✓ Served react-1.0.0.tar.gz');
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not Found');
  console.log('   ✗ Not found');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n✅ Local test server running!\n`);
  console.log(`   Registry: http://localhost:${PORT}/registry.json`);
  console.log(`   Template: http://localhost:${PORT}/templates/react-1.0.0.tar.gz\n`);
  console.log('📝 Next steps:\n');
  console.log('   1. Keep this server running');
  console.log('   2. In another terminal, modify CLI to use local registry:');
  console.log('      cd ../cli');
  console.log('      # Edit src/core/registry.ts:');
  console.log(`      # Change REGISTRY_URL to 'http://localhost:${PORT}/registry.json'`);
  console.log('   3. Build and test CLI:');
  console.log('      npm run build');
  console.log('      npm link');
  console.log('      slyxup init react test-app\n');
  console.log('   Press Ctrl+C to stop\n');
});
