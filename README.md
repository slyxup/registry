# SlyxUp Registry

Official registry for SlyxUp CLI templates and features.

## 🌐 Registry URL

This registry is served at:
```
https://registry.slyxup.online/registry.json
```

The SlyxUp CLI fetches this file to get available templates and features.

## 📋 What This Repository Contains

- **registry.json** - The main registry file that defines all templates and features
- **Documentation** - How to add templates and features
- **Validation scripts** - Ensure registry integrity

## 🏗️ Structure

```json
{
  "version": "1.0.0",
  "templates": {
    "framework-name": [
      {
        "name": "framework-name",
        "version": "1.0.0",
        "description": "Description",
        "framework": "framework-name",
        "downloadUrl": "https://cdn.slyxup.online/templates/...",
        "sha256": "hash..."
      }
    ]
  },
  "features": {
    "feature-name": [
      {
        "name": "feature-name",
        "version": "1.0.0",
        "description": "Description",
        "frameworks": ["react", "vue"],
        "downloadUrl": "https://cdn.slyxup.online/features/...",
        "sha256": "hash...",
        "dependencies": ["package@version"]
      }
    ]
  }
}
```

## 📦 Current Templates

### React
- **Framework**: React 18 + Vite + TypeScript
- **Version**: 1.0.0
- **Status**: ⏳ Pending creation

### Vue
- **Framework**: Vue 3 + Vite + TypeScript
- **Version**: 1.0.0
- **Status**: ⏳ Pending creation

### Next.js
- **Framework**: Next.js 14 + TypeScript
- **Version**: 1.0.0
- **Status**: ⏳ Pending creation

## 🎨 Current Features

### Tailwind CSS
- **Version**: 3.4.0
- **Frameworks**: React, Vue, Next.js
- **Status**: ⏳ Pending creation

### shadcn/ui
- **Version**: 1.0.0
- **Frameworks**: React, Next.js
- **Status**: ⏳ Pending creation

### Lucide Icons
- **Version**: 1.0.0
- **Frameworks**: React, Vue, Next.js
- **Status**: ⏳ Pending creation

## ➕ Adding a New Template

1. Create template in `slyxup-templates` repository
2. Build and package as `.tar.gz`
3. Generate SHA-256 hash: `sha256sum template.tar.gz`
4. Upload to CDN
5. Add entry to `registry.json`:

```json
{
  "name": "my-template",
  "version": "1.0.0",
  "description": "My awesome template",
  "framework": "my-framework",
  "downloadUrl": "https://cdn.slyxup.online/templates/my-template.tar.gz",
  "sha256": "YOUR_GENERATED_HASH_HERE",
  "size": 123456
}
```

6. Validate registry: `npm run validate`
7. Commit and push

## ➕ Adding a New Feature

1. Create feature in `slyxup-features` repository
2. Create `feature.json` manifest
3. Build and package as `.tar.gz`
4. Generate SHA-256 hash
5. Upload to CDN
6. Add entry to `registry.json`:

```json
{
  "name": "my-feature",
  "version": "1.0.0",
  "description": "My awesome feature",
  "frameworks": ["react", "vue"],
  "downloadUrl": "https://cdn.slyxup.online/features/my-feature.tar.gz",
  "sha256": "YOUR_GENERATED_HASH_HERE",
  "dependencies": ["package@^1.0.0"]
}
```

## 🔧 Validation

Before deploying, validate the registry:

```bash
npm install
npm run validate
```

This checks:
- ✅ Valid JSON syntax
- ✅ Schema compliance
- ✅ SHA-256 hash format (64 hex chars)
- ✅ Valid URLs
- ✅ No duplicate entries

## 🚀 Deployment

### Option 1: Cloudflare Pages (Recommended)

1. Connect this repo to Cloudflare Pages
2. Set build command: `npm run build` (if needed)
3. Set output directory: `.` (root)
4. Configure custom domain: `registry.slyxup.online`

### Option 2: GitHub Pages

1. Enable GitHub Pages in repo settings
2. Set source to `main` branch
3. Configure custom domain
4. Access at: `https://slyxup.github.io/registry/registry.json`

### Option 3: Vercel

1. Connect repo to Vercel
2. Deploy
3. Configure custom domain

## 📝 Version History

### v1.0.0 - Initial Release
- Added React template placeholder
- Added Vue template placeholder
- Added Next.js template placeholder
- Added Tailwind feature placeholder
- Added shadcn/ui feature placeholder
- Added Lucide icons feature placeholder

## 🔐 Security

- All download URLs must use HTTPS
- SHA-256 hashes are mandatory
- Registry is validated on every deployment
- No credentials in this repository

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/slyxup/registry/issues)
- **Discussions**: [GitHub Discussions](https://github.com/slyxup/registry/discussions)
- **Email**: registry@slyxup.online

## 📄 License

MIT License - See LICENSE file

---

**Note**: This registry is currently in development. Template and feature download URLs are placeholders until the actual packages are created.
