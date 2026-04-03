#!/usr/bin/env node

/**
 * Cloudflare R2 Upload Script
 * 
 * Uploads all packaged templates, features, and stacks to Cloudflare R2 bucket
 * with proper folder structure:
 *   - projects/  (project templates like react, vue, next)
 *   - features/  (add-on features like tailwind, eslint, prisma)
 *   - stacks/    (pre-configured bundles)
 * 
 * Skips files that already exist in R2 (use --force to upload anyway)
 * 
 * Requires: wrangler CLI installed and authenticated
 * 
 * Usage:
 *   node upload-to-r2.js              # Interactive mode (skips existing)
 *   node upload-to-r2.js prod         # Upload to production bucket (skips existing)
 *   node upload-to-r2.js prod --force # Force upload all files (overwrite existing)
 *   node upload-to-r2.js prod --clean # Delete all first, then upload
 */

import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const env = args.find(a => !a.startsWith('--')) || 'interactive';
const shouldClean = args.includes('--clean');
const forceUpload = args.includes('--force');

const ENVIRONMENTS = {
  local: {
    bucket: 'slyxup-templates-dev',
    cdnUrl: 'https://cdn-dev.slyxup.online'
  },
  prod: {
    bucket: 'slyxup-templates',
    cdnUrl: 'https://cdn.slyxup.online'
  }
};

const SLYXUP_ROOT = join(__dirname, '..', '..');
const TEMPLATES_DIR = join(SLYXUP_ROOT, 'templates');
const PACKAGED_DIR = join(TEMPLATES_DIR, 'packaged');

// Define which packages are projects vs features vs stacks
const PROJECTS = [
  'react', 'vue', 'next', 'express', 'discord', 
  'fastify', 'nestjs', 'graphql', 'hono', 'bun-server'
];

const FEATURES = [
  'tailwind', 'eslint', 'prettier', 'typescript', 'vitest', 'jest',
  'prisma', 'drizzle', 'husky', 'lint-staged', 'shadcn', 'zustand',
  'react-query', 'zod', 'axios', 'docker', 'dotenv', 'github-actions',
  'swr', 'pinia', 'trpc', 'lucia', 'next-auth', 'playwright', 'cypress',
  'storybook', 'i18n', 'swagger', 'pwa', 'sentry'
];

const STACKS = [
  'express-postgres', 'next-fullstack', 'react-express-monorepo',
  'nestjs-postgres', 'next-t3-stack', 'vue-nuxt-fullstack',
  'react-native-expo', 'fastify-tiny', 'graphql-apollo-fullstack', 'remix-fullstack'
];

console.log('🚀 SlyxUp R2 Upload Script\n');

async function askEnvironment() {
  return new Promise(async resolve => {
    const readline = await import('readline');
    const rl = readline.default.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('Select environment:');
    console.log('  1. local  - Development bucket (slyxup-templates-dev)');
    console.log('  2. prod   - Production bucket (slyxup-templates)\n');
    
    rl.question('Enter choice (1/2) or type "local"/"prod": ', answer => {
      const input = answer.trim().toLowerCase();
      if (input === '1' || input === 'local') {
        resolve('local');
      } else {
        resolve('prod');
      }
      rl.close();
    });
  });
}

// Get all existing objects in R2 bucket (single API call)
function getExistingObjects(bucketName) {
  console.log('📋 Fetching existing objects from R2...');
  try {
    const result = execSync(
      `wrangler r2 object list ${bucketName} --remote`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    // Parse the output - wrangler returns JSON array
    const objects = JSON.parse(result);
    const keys = new Set(objects.map(obj => obj.key));
    console.log(`   Found ${keys.size} existing objects\n`);
    return keys;
  } catch (error) {
    // If bucket is empty or error, return empty set
    console.log('   Bucket is empty or error fetching list\n');
    return new Set();
  }
}

async function deleteAllObjects(bucketName) {
  console.log('🗑️  Deleting all existing objects from R2...\n');
  
  const existingKeys = getExistingObjects(bucketName);
  let deletedCount = 0;
  
  for (const key of existingKeys) {
    try {
      execSync(
        `wrangler r2 object delete ${bucketName}/${key} --remote`,
        { stdio: 'pipe' }
      );
      console.log(`   ✓ Deleted: ${key}`);
      deletedCount++;
    } catch {
      // Ignore delete errors
    }
  }
  
  console.log(`\n   Deleted ${deletedCount} objects\n`);
}

async function main() {
  let selectedEnv = env;

  if (env === 'interactive') {
    selectedEnv = await askEnvironment();
  }

  const config = ENVIRONMENTS[selectedEnv];
  if (!config) {
    console.error(`❌ Unknown environment: ${selectedEnv}`);
    process.exit(1);
  }
  
  const BUCKET_NAME = config.bucket;
  const CDN_URL = config.cdnUrl;

  console.log(`📍 Target: ${selectedEnv.toUpperCase()}`);
  console.log(`   Bucket: ${BUCKET_NAME}`);
  console.log(`   CDN: ${CDN_URL}`);
  console.log(`   Force: ${forceUpload ? 'yes' : 'no'}\n`);

  // Check if wrangler is installed
  try {
    execSync('wrangler --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Wrangler CLI not found!');
    console.error('   Install: npm install -g wrangler');
    console.error('   Login: wrangler login');
    process.exit(1);
  }

  // Delete existing objects if --clean flag is set
  if (shouldClean) {
    await deleteAllObjects(BUCKET_NAME);
  }

  // Check packaged directory exists
  if (!existsSync(PACKAGED_DIR)) {
    console.error(`❌ Packaged directory not found: ${PACKAGED_DIR}`);
    console.error('   Run: node run.js build');
    process.exit(1);
  }

  // Get all .tar.gz files from packaged directory (including stacks/ subdirectory)
  const allFiles = readdirSync(PACKAGED_DIR)
    .filter(f => f.endsWith('.tar.gz'))
    .map(f => ({
      filename: f,
      name: f.replace('.tar.gz', ''),
      path: join(PACKAGED_DIR, f)
    }));
  
  // Also get files from stacks/ subdirectory
  const stacksDir = join(PACKAGED_DIR, 'stacks');
  if (existsSync(stacksDir)) {
    const stackFiles = readdirSync(stacksDir)
      .filter(f => f.endsWith('.tar.gz'))
      .map(f => ({
        filename: f,
        name: f.replace('.tar.gz', ''),
        path: join(stacksDir, f)
      }));
    allFiles.push(...stackFiles);
  }

  if (allFiles.length === 0) {
    console.log('⚠️  No packages found!');
    console.log('   Run: node run.js build');
    process.exit(1);
  }

  // Categorize files - anything not in PROJECTS or FEATURES is a stack
  const projects = allFiles.filter(f => PROJECTS.includes(f.name));
  const features = allFiles.filter(f => FEATURES.includes(f.name));
  const stacks = allFiles.filter(f => STACKS.includes(f.name));
  const unknown = allFiles.filter(f => 
    !PROJECTS.includes(f.name) && 
    !FEATURES.includes(f.name) && 
    !STACKS.includes(f.name)
  );

  console.log('📦 Files found in packaged/:\n');
  console.log(`   Projects: ${projects.length}`);
  projects.forEach(p => console.log(`      - ${p.filename}`));
  console.log(`   Features: ${features.length}`);
  features.forEach(f => console.log(`      - ${f.filename}`));
  console.log(`   Stacks:   ${stacks.length}`);
  stacks.forEach(s => console.log(`      - ${s.filename}`));
  if (unknown.length > 0) {
    console.log(`   Unknown:  ${unknown.length} (will skip)`);
    unknown.forEach(u => console.log(`      - ${u.filename}`));
  }

  // Get existing objects ONCE (fast!)
  let existingKeys = new Set();
  if (!forceUpload && !shouldClean) {
    existingKeys = getExistingObjects(BUCKET_NAME);
  }

  console.log('🔄 Uploading to R2...\n');

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  // Helper function to upload files
  const uploadFiles = (files, folder) => {
    for (const file of files) {
      const r2Key = `${folder}/${file.filename}`;
      
      // Check if already exists (using cached list)
      if (!forceUpload && existingKeys.has(r2Key)) {
        console.log(`   ⏭️  ${file.filename} (exists)`);
        skippedCount++;
        continue;
      }
      
      try {
        process.stdout.write(`   📤 ${file.filename}...`);
        execSync(
          `wrangler r2 object put ${BUCKET_NAME}/${r2Key} --file="${file.path}" --remote`,
          { stdio: 'pipe' }
        );
        console.log(` ✅`);
        successCount++;
      } catch (error) {
        console.log(` ❌`);
        failCount++;
      }
    }
  };

  // Upload all categories
  if (projects.length > 0) {
    console.log('📁 Projects:');
    uploadFiles(projects, 'projects');
    console.log();
  }

  if (features.length > 0) {
    console.log('📁 Features:');
    uploadFiles(features, 'features');
    console.log();
  }

  if (stacks.length > 0) {
    console.log('📁 Stacks:');
    uploadFiles(stacks, 'stacks');
    console.log();
  }

  // Summary
  console.log('─────────────────────────────────────────');
  console.log(`✅ Uploaded: ${successCount}`);
  console.log(`⏭️  Skipped:  ${skippedCount}`);
  if (failCount > 0) {
    console.log(`❌ Failed:   ${failCount}`);
  }
  console.log('─────────────────────────────────────────\n');

  if (successCount > 0 || skippedCount > 0) {
    console.log('🎉 Done!\n');
    console.log('📝 CDN URLs:');
    console.log(`   ${CDN_URL}/projects/{name}.tar.gz`);
    console.log(`   ${CDN_URL}/features/{name}.tar.gz`);
    console.log(`   ${CDN_URL}/stacks/{name}.tar.gz\n`);
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
