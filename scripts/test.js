#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createServer } from 'http';

console.log('🧪 Starting registry test server...\n');

const registryContent = readFileSync('./registry.json', 'utf-8');

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

  if (req.url === '/registry.json' || req.url === '/') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(registryContent);
    console.log(`✓ Served registry.json to ${req.socket.remoteAddress}`);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Registry test server running at:\n`);
  console.log(`   http://localhost:${PORT}/registry.json\n`);
  console.log('   Test with:');
  console.log(`   curl http://localhost:${PORT}/registry.json\n`);
  console.log('   Press Ctrl+C to stop\n');
});
