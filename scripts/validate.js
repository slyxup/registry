#!/usr/bin/env node

import { readFileSync } from 'fs';
import { z } from 'zod';

// Schema definitions (same as CLI)
const RegistryTemplateSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  framework: z.string(),
  downloadUrl: z.string().url(),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$|^TO_BE_GENERATED_WHEN_TEMPLATE_IS_CREATED$/),
  size: z.number().optional(),
});

const RegistryFeatureSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  frameworks: z.array(z.string()),
  downloadUrl: z.string().url(),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$|^TO_BE_GENERATED_WHEN_FEATURE_IS_CREATED$/),
  dependencies: z.array(z.string()).optional(),
  peerDependencies: z.array(z.string()).optional(),
});

const RegistrySchema = z.object({
  version: z.string(),
  templates: z.record(z.array(RegistryTemplateSchema)),
  features: z.record(z.array(RegistryFeatureSchema)),
});

console.log('🔍 Validating registry.json...\n');

try {
  // Read registry file
  const registryContent = readFileSync('./registry.json', 'utf-8');
  
  // Parse JSON
  let registryData;
  try {
    registryData = JSON.parse(registryContent);
    console.log('✅ Valid JSON syntax');
  } catch (error) {
    console.error('❌ Invalid JSON syntax:', error.message);
    process.exit(1);
  }

  // Validate schema
  try {
    RegistrySchema.parse(registryData);
    console.log('✅ Schema validation passed');
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    process.exit(1);
  }

  // Count templates and features
  const templateCount = Object.values(registryData.templates).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const featureCount = Object.values(registryData.features).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  console.log(`\n📊 Registry Statistics:`);
  console.log(`   Templates: ${templateCount}`);
  console.log(`   Features: ${featureCount}`);
  console.log(`   Frameworks: ${Object.keys(registryData.templates).join(', ')}`);

  // Check for placeholder hashes
  let placeholderCount = 0;
  
  for (const [framework, templates] of Object.entries(registryData.templates)) {
    for (const template of templates) {
      if (template.sha256.includes('TO_BE_GENERATED')) {
        placeholderCount++;
        console.log(`\n⚠️  Template '${framework}@${template.version}' has placeholder SHA-256`);
      }
    }
  }

  for (const [name, features] of Object.entries(registryData.features)) {
    for (const feature of features) {
      if (feature.sha256.includes('TO_BE_GENERATED')) {
        placeholderCount++;
        console.log(`⚠️  Feature '${name}@${feature.version}' has placeholder SHA-256`);
      }
    }
  }

  if (placeholderCount > 0) {
    console.log(`\n⚠️  ${placeholderCount} entries have placeholder hashes (normal during development)`);
  }

  console.log('\n✅ Registry validation successful!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Validation failed:', error.message);
  process.exit(1);
}
