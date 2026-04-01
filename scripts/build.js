#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

console.log('🔨 Building registry...\n');

try {
  // Read and validate registry
  const registryContent = readFileSync('./registry.json', 'utf-8');
  const registry = JSON.parse(registryContent);

  // Minify for production (optional)
  const minified = JSON.stringify(registry);

  // Write minified version
  writeFileSync('./registry.min.json', minified);
  
  console.log('✅ Created registry.min.json');
  console.log(`   Original size: ${registryContent.length} bytes`);
  console.log(`   Minified size: ${minified.length} bytes`);
  console.log(`   Saved: ${registryContent.length - minified.length} bytes\n`);

  console.log('✅ Build complete!\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
