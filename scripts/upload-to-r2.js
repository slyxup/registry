#!/usr/bin/env node

/**
 * Cloudflare R2 Upload Script
 * 
 * Uploads all packaged templates to Cloudflare R2 bucket
 * Requires: wrangler CLI installed and authenticated
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUCKET_NAME = 'slyxup-templates';
const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');

console.log('🚀 SlyxUp R2 Upload Script\n');

// Check if wrangler is installed
try {
  execSync('wrangler --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Wrangler CLI not found!');
  console.error('   Install: npm install -g wrangler');
  console.error('   Login: wrangler login');
  process.exit(1);
}

// Find all .tar.gz files
function findTemplates(dir) {
  const templates = [];
  
  function scan(currentDir) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (entry.endsWith('.tar.gz')) {
        templates.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return templates;
}

const templates = findTemplates(TEMPLATES_DIR);

if (templates.length === 0) {
  console.log('⚠️  No templates found!');
  console.log('   Make sure to package templates first:');
  console.log('   cd templates && ./scripts/package-react.sh');
  process.exit(1);
}

console.log(`📦 Found ${templates.length} template(s) to upload:\n`);

for (const templatePath of templates) {
  const filename = basename(templatePath);
  const r2Key = `templates/${filename}`;
  
  console.log(`   ${filename}`);
}

console.log('\n🔄 Uploading to R2...\n');

let successCount = 0;
let failCount = 0;

for (const templatePath of templates) {
  const filename = basename(templatePath);
  const r2Key = `templates/${filename}`;
  
  try {
    console.log(`📤 Uploading: ${filename}`);
    
    execSync(
      `wrangler r2 object put ${BUCKET_NAME}/${r2Key} --file="${templatePath}"`,
      { stdio: 'inherit' }
    );
    
    console.log(`   ✅ Success: https://cdn.slyxup.online/${r2Key}\n`);
    successCount++;
  } catch (error) {
    console.error(`   ❌ Failed to upload ${filename}\n`);
    failCount++;
  }
}

console.log('─────────────────────────────────────────');
console.log(`✅ Uploaded: ${successCount}`);
if (failCount > 0) {
  console.log(`❌ Failed: ${failCount}`);
}
console.log('─────────────────────────────────────────\n');

if (successCount > 0) {
  console.log('🎉 Upload complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Update registry/registry.json with CDN URLs');
  console.log('   2. Push registry to GitHub');
  console.log('   3. Cloudflare Pages will auto-deploy');
  console.log('   4. Test: curl https://registry.slyxup.online/registry.json\n');
}

process.exit(failCount > 0 ? 1 : 0);
