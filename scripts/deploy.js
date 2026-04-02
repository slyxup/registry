#!/usr/bin/env node

/**
 * SlyxUp Registry Deploy Script
 * Cross-platform deployment for Mac, Windows, Linux, Ubuntu
 * Works for both local testing and production deployment
 * 
 * Usage:
 *   node scripts/deploy.js          # Interactive mode
 *   node scripts/deploy.js local    # Generate local registry
 *   node scripts/deploy.js prod     # Deploy to Cloudflare Pages/R2
 *   node scripts/deploy.js validate # Validate registry.json
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SLYXUP_ROOT = path.resolve(__dirname, '../..');
const TEMPLATES_DIR = path.join(SLYXUP_ROOT, 'templates');
const PACKAGED_DIR = path.join(TEMPLATES_DIR, 'packaged');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(step, msg) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${msg}`);
}

function logSuccess(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function logError(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function logWarning(msg) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

// Run command cross-platform
function runCommand(cmd, options = {}) {
  const { cwd = ROOT_DIR, silent = false, ignoreError = false } = options;
  
  try {
    if (!silent) {
      log(`  $ ${cmd}`, 'gray');
    }
    
    const result = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
    });
    
    return { success: true, output: result };
  } catch (error) {
    if (ignoreError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

// Get SHA-256 hash of file
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Get file size
function getFileSize(filePath) {
  return fs.statSync(filePath).size;
}

// Load registry.json
function loadRegistry(type = 'main') {
  const filename = type === 'local' ? 'local-registry.json' : 'registry.json';
  const registryPath = path.join(ROOT_DIR, filename);
  
  if (!fs.existsSync(registryPath)) {
    throw new Error(`${filename} not found`);
  }
  
  return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
}

// Save registry.json
function saveRegistry(registry, type = 'main') {
  const filename = type === 'local' ? 'local-registry.json' : 'registry.json';
  const registryPath = path.join(ROOT_DIR, filename);
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
}

// Validate registry schema
function validateRegistry() {
  logStep('VALIDATE', 'Validating registry.json schema...');
  
  const registry = loadRegistry();
  const errors = [];
  
  // Check required fields
  if (!registry.version) errors.push('Missing version field');
  if (!registry.templates) errors.push('Missing templates field');
  if (!registry.features) errors.push('Missing features field');
  
  // Validate templates
  for (const [name, versions] of Object.entries(registry.templates || {})) {
    for (const template of versions) {
      if (!template.name) errors.push(`Template ${name}: missing name`);
      if (!template.version) errors.push(`Template ${name}: missing version`);
      if (!template.downloadUrl) errors.push(`Template ${name}: missing downloadUrl`);
      if (!template.sha256 || template.sha256 === '0'.repeat(64)) {
        logWarning(`Template ${name}: invalid or placeholder SHA256`);
      }
    }
  }
  
  // Validate features
  for (const [name, versions] of Object.entries(registry.features || {})) {
    for (const feature of versions) {
      if (!feature.name) errors.push(`Feature ${name}: missing name`);
      if (!feature.version) errors.push(`Feature ${name}: missing version`);
      if (!feature.frameworks) errors.push(`Feature ${name}: missing frameworks`);
      if (!feature.downloadUrl) errors.push(`Feature ${name}: missing downloadUrl`);
      if (!feature.sha256 || feature.sha256 === '0'.repeat(64)) {
        logWarning(`Feature ${name}: invalid or placeholder SHA256`);
      }
    }
  }
  
  if (errors.length > 0) {
    logError('Validation failed:');
    errors.forEach(e => console.log(`  - ${e}`));
    return false;
  }
  
  const templateCount = Object.keys(registry.templates).length;
  const featureCount = Object.keys(registry.features).length;
  
  logSuccess(`Validation passed (${templateCount} templates, ${featureCount} features)`);
  return true;
}

// Update hashes from packaged templates
function updateHashes() {
  logStep('HASH', 'Updating SHA-256 hashes from packaged templates...');
  
  const registry = loadRegistry();
  let updated = 0;
  
  // Update template hashes
  for (const [name, versions] of Object.entries(registry.templates)) {
    for (const template of versions) {
      const tarPath = path.join(PACKAGED_DIR, `${name}.tar.gz`);
      if (fs.existsSync(tarPath)) {
        const newHash = getFileHash(tarPath);
        const newSize = getFileSize(tarPath);
        
        if (template.sha256 !== newHash) {
          template.sha256 = newHash;
          template.size = newSize;
          updated++;
          log(`  Updated ${name}: ${newHash.substring(0, 16)}...`, 'gray');
        }
      } else {
        logWarning(`Missing package: ${tarPath}`);
      }
    }
  }
  
  // Update feature hashes
  for (const [name, versions] of Object.entries(registry.features)) {
    for (const feature of versions) {
      const tarPath = path.join(PACKAGED_DIR, `${name}.tar.gz`);
      if (fs.existsSync(tarPath)) {
        const newHash = getFileHash(tarPath);
        const newSize = getFileSize(tarPath);
        
        if (feature.sha256 !== newHash) {
          feature.sha256 = newHash;
          feature.size = newSize;
          updated++;
          log(`  Updated ${name}: ${newHash.substring(0, 16)}...`, 'gray');
        }
      } else {
        logWarning(`Missing package: ${tarPath}`);
      }
    }
  }
  
  saveRegistry(registry);
  logSuccess(`Updated ${updated} hashes`);
  
  return registry;
}

// Generate local registry with file:// URLs
function generateLocalRegistry() {
  logStep('LOCAL', 'Generating local-registry.json...');
  
  const registry = loadRegistry();
  const localRegistry = JSON.parse(JSON.stringify(registry)); // Deep clone
  
  // Update template URLs
  for (const [name, versions] of Object.entries(localRegistry.templates)) {
    for (const template of versions) {
      const tarPath = path.join(PACKAGED_DIR, `${name}.tar.gz`);
      template.downloadUrl = `file://${tarPath}`;
      
      // Update hash if file exists
      if (fs.existsSync(tarPath)) {
        template.sha256 = getFileHash(tarPath);
        template.size = getFileSize(tarPath);
      }
    }
  }
  
  // Update feature URLs
  for (const [name, versions] of Object.entries(localRegistry.features)) {
    for (const feature of versions) {
      const tarPath = path.join(PACKAGED_DIR, `${name}.tar.gz`);
      feature.downloadUrl = `file://${tarPath}`;
      
      // Update hash if file exists
      if (fs.existsSync(tarPath)) {
        feature.sha256 = getFileHash(tarPath);
        feature.size = getFileSize(tarPath);
      }
    }
  }
  
  saveRegistry(localRegistry, 'local');
  
  const localPath = path.join(ROOT_DIR, 'local-registry.json');
  logSuccess(`Generated local-registry.json`);
  
  console.log(`
${colors.bright}To use local registry:${colors.reset}

${colors.cyan}# Linux/Mac:${colors.reset}
export SLYXUP_REGISTRY_URL="file://${localPath}"

${colors.cyan}# Windows PowerShell:${colors.reset}
$env:SLYXUP_REGISTRY_URL="file://${localPath}"

${colors.cyan}# Windows CMD:${colors.reset}
set SLYXUP_REGISTRY_URL=file://${localPath}
`);
  
  return localRegistry;
}

// Generate production registry with CDN URLs
function generateProductionRegistry(cdnBase = 'https://cdn.slyxup.online') {
  logStep('PROD', 'Generating production registry with CDN URLs...');
  
  const registry = loadRegistry();
  
  // Update template URLs
  for (const [name, versions] of Object.entries(registry.templates)) {
    for (const template of versions) {
      template.downloadUrl = `${cdnBase}/templates/${name}.tar.gz`;
    }
  }
  
  // Update feature URLs
  for (const [name, versions] of Object.entries(registry.features)) {
    for (const feature of versions) {
      feature.downloadUrl = `${cdnBase}/features/${name}.tar.gz`;
    }
  }
  
  saveRegistry(registry);
  logSuccess('Updated registry.json with CDN URLs');
  
  return registry;
}

// Check sync between registry and packaged files
function checkSync() {
  logStep('SYNC', 'Checking synchronization...');
  
  const registry = loadRegistry();
  const issues = [];
  const synced = [];
  
  // Check all packages exist
  const allItems = [
    ...Object.keys(registry.templates).map(name => ({ name, type: 'template' })),
    ...Object.keys(registry.features).map(name => ({ name, type: 'feature' })),
  ];
  
  for (const { name, type } of allItems) {
    const tarPath = path.join(PACKAGED_DIR, `${name}.tar.gz`);
    
    if (!fs.existsSync(tarPath)) {
      issues.push({ name, type, issue: 'Missing package file' });
      continue;
    }
    
    // Check hash matches
    const versions = type === 'template' ? registry.templates[name] : registry.features[name];
    const item = versions[0];
    const actualHash = getFileHash(tarPath);
    
    if (item.sha256 !== actualHash) {
      issues.push({ 
        name, 
        type, 
        issue: 'Hash mismatch',
        expected: item.sha256?.substring(0, 16),
        actual: actualHash.substring(0, 16),
      });
    } else {
      synced.push({ name, type });
    }
  }
  
  console.log(`
${colors.cyan}Sync Status:${colors.reset}
  Total items: ${allItems.length}
  Synced:      ${colors.green}${synced.length}${colors.reset}
  Issues:      ${issues.length > 0 ? colors.red + issues.length + colors.reset : '0'}
`);
  
  if (issues.length > 0) {
    console.log(`${colors.yellow}Issues found:${colors.reset}`);
    for (const issue of issues) {
      console.log(`  - ${issue.type}/${issue.name}: ${issue.issue}`);
      if (issue.expected) {
        console.log(`    Expected: ${issue.expected}...`);
        console.log(`    Actual:   ${issue.actual}...`);
      }
    }
    
    console.log(`
${colors.bright}To fix:${colors.reset}
  1. Run template packaging: cd ../templates && node scripts/package-all-features.js
  2. Run hash update: node scripts/deploy.js hash
`);
    return false;
  }
  
  logSuccess('All items are in sync');
  return true;
}

// Deploy to Cloudflare Pages
function deployToCloudflare() {
  logStep('DEPLOY', 'Deploying to Cloudflare Pages...');
  
  // Check if wrangler is installed
  const wranglerCheck = runCommand('npx wrangler --version', { silent: true, ignoreError: true });
  if (!wranglerCheck.success) {
    logError('Wrangler not found. Install with: npm install -g wrangler');
    return false;
  }
  
  // Deploy
  runCommand('npx wrangler pages deploy . --project-name=slyxup-registry');
  
  logSuccess('Deployed to Cloudflare Pages');
  return true;
}

// Upload packages to R2
async function uploadToR2() {
  logStep('R2', 'Uploading packages to Cloudflare R2...');
  
  // Check if upload script exists
  const uploadScript = path.join(ROOT_DIR, 'scripts', 'upload-to-r2.js');
  if (fs.existsSync(uploadScript)) {
    runCommand(`node ${uploadScript}`);
    logSuccess('Uploaded to R2');
  } else {
    logWarning('upload-to-r2.js script not found');
  }
}

// Interactive prompt
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Interactive menu
async function interactiveMenu() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════╗
║   ${colors.bright}SlyxUp Registry Deploy Script${colors.reset}${colors.cyan}           ║
╚═══════════════════════════════════════════╝${colors.reset}

Select operation:

  ${colors.green}1)${colors.reset} Local Setup    - Generate local-registry.json for testing
  ${colors.yellow}2)${colors.reset} Production     - Update hashes and deploy to Cloudflare
  ${colors.blue}3)${colors.reset} Validate       - Validate registry.json schema
  ${colors.cyan}4)${colors.reset} Check Sync     - Check if registry matches packaged files
  ${colors.gray}5)${colors.reset} Update Hashes  - Update SHA-256 hashes from packages
  ${colors.gray}6)${colors.reset} Exit
`);

  const choice = await prompt('Enter choice (1-6): ');
  
  switch (choice) {
    case '1':
    case 'local':
      generateLocalRegistry();
      break;
    case '2':
    case 'prod':
    case 'production':
      await runProductionDeploy();
      break;
    case '3':
    case 'validate':
      validateRegistry();
      break;
    case '4':
    case 'sync':
      checkSync();
      break;
    case '5':
    case 'hash':
      updateHashes();
      break;
    case '6':
    case 'exit':
    case 'q':
      log('Bye!', 'gray');
      process.exit(0);
    default:
      logError('Invalid choice');
      await interactiveMenu();
  }
}

// Production deployment workflow
async function runProductionDeploy() {
  console.log(`\n${colors.yellow}═══ Production Deployment ═══${colors.reset}\n`);
  
  // Validate first
  if (!validateRegistry()) {
    logError('Fix validation errors before deploying');
    return;
  }
  
  // Check sync
  if (!checkSync()) {
    const fix = await prompt('Fix hash mismatches? (y/n): ');
    if (fix === 'y' || fix === 'yes') {
      updateHashes();
    } else {
      logWarning('Proceeding with mismatched hashes');
    }
  }
  
  // Update production URLs
  const cdnBase = await prompt('CDN base URL (default: https://cdn.slyxup.online): ');
  generateProductionRegistry(cdnBase || 'https://cdn.slyxup.online');
  
  // Upload to R2
  const uploadR2 = await prompt('Upload packages to R2? (y/n): ');
  if (uploadR2 === 'y' || uploadR2 === 'yes') {
    await uploadToR2();
  }
  
  // Deploy to Cloudflare Pages
  const deployCF = await prompt('Deploy registry to Cloudflare Pages? (y/n): ');
  if (deployCF === 'y' || deployCF === 'yes') {
    deployToCloudflare();
  }
  
  console.log(`
${colors.green}═══ Production Deployment Complete ═══${colors.reset}

${colors.bright}Verify:${colors.reset}
  curl https://registry.slyxup.online/registry.json | jq .version
`);
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'local':
      generateLocalRegistry();
      break;
    case 'prod':
    case 'production':
      await runProductionDeploy();
      break;
    case 'validate':
      validateRegistry();
      break;
    case 'sync':
    case 'check':
      checkSync();
      break;
    case 'hash':
    case 'hashes':
      updateHashes();
      break;
    case 'deploy':
      deployToCloudflare();
      break;
    case 'r2':
    case 'upload':
      await uploadToR2();
      break;
    default:
      await interactiveMenu();
  }
}

main().catch((error) => {
  logError(`Deploy failed: ${error.message}`);
  process.exit(1);
});
