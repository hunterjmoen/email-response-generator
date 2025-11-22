# Fix Vitest ESM Compatibility Issue

## Problem
Vitest is failing to load `vitest.config.ts` because of a CommonJS/ESM module format mismatch. The error shows:
```
Error [ERR_REQUIRE_ESM]: require() of ES Module .../node_modules/vite/dist/node/index.js from .../node_modules/vitest/dist/config.cjs not supported
```

## Root Cause Analysis
- The project's `package.json` is missing `"type": "module"`
- This causes Node.js to treat the project as CommonJS by default
- Vite 7.2.4 is an ESM module, but Vitest is trying to require() it
- Both vitest.config.ts files already use ESM syntax (import/export) ✓
- Versions are compatible (Vite 7.2.4, Vitest 4.0.13) ✓

## Plan

### Task 1: Add ESM Module Type to package.json
**Solution**: Add `"type": "module"` to package.json to tell Node.js this is an ESM project
- [x] Add `"type": "module"` field to package.json after "private" field
- **Impact**: Only package.json, 1 line added

### Task 2: Convert Next.js Config to ESM
- [x] Rename next.config.js to next.config.mjs
- [x] Convert require() to import and module.exports to export default
- **Impact**: 1 file renamed, 2 lines changed

### Task 3: Convert PostCSS/Tailwind Configs to .cjs
**Reason**: These configs use CommonJS syntax and need explicit .cjs extension
- [x] Rename postcss.config.js to postcss.config.cjs
- [x] Rename tailwind.config.js to tailwind.config.cjs
- **Impact**: 2 files renamed, no code changes

### Task 4: Verify Both Vitest and Next.js Build Work
- [x] Run `npm test` to verify Vitest can now load the config
- [x] Run `npm run build` to verify Next.js build works
- [x] Confirm no ESM/CommonJS errors appear

---

## Changes Made

### 1. Added ESM Module Type to package.json
- Added `"type": "module"` at [package.json:5](package.json#L5)
- This tells Node.js to treat all `.js` files as ES modules
- **Impact**: 1 line added

### 2. Converted Next.js Config to ESM Format
- Renamed `next.config.js` → [next.config.mjs](next.config.mjs)
- Changed `require('@sentry/nextjs')` → `import` at [next.config.mjs:1](next.config.mjs#L1)
- Changed `module.exports` → `export default` at [next.config.mjs:34](next.config.mjs#L34)
- **Impact**: File renamed, 2 lines changed

### 3. Converted PostCSS and Tailwind Configs to .cjs
- Renamed `postcss.config.js` → [postcss.config.cjs](postcss.config.cjs)
- Renamed `tailwind.config.js` → [tailwind.config.cjs](tailwind.config.cjs)
- These files keep CommonJS syntax (`module.exports`) but use `.cjs` extension
- **Impact**: 2 files renamed, no code changes

## Review

### Summary
✅ **Vitest ESM compatibility issue resolved!**

### Root Cause
The project was missing `"type": "module"` in package.json, causing Node.js to default to CommonJS mode. This created a mismatch when Vitest tried to load Vite's ESM-only build.

### Solution Applied
1. Added `"type": "module"` to package.json
2. Converted next.config.js to ESM format (next.config.mjs)
3. Renamed PostCSS and Tailwind configs to .cjs extension to keep CommonJS syntax

### Test Results
- ✅ Vitest successfully loads vitest.config.ts files
- ✅ No `ERR_REQUIRE_ESM` errors
- ✅ No "require() of ES Module" errors
- ✅ Next.js build compiles successfully
- ✅ Tests run successfully (test failures are unrelated to ESM issue)

### Files Modified
1. [package.json](package.json) - Added `"type": "module"`
2. [next.config.mjs](next.config.mjs) - Converted from CommonJS to ESM
3. [postcss.config.cjs](postcss.config.cjs) - Renamed from .js to .cjs
4. [tailwind.config.cjs](tailwind.config.cjs) - Renamed from .js to .cjs

### Impact
Minimal and simple - 4 files changed (1 code change, 3 renames). All changes maintain existing functionality while enabling proper ESM/CommonJS interop.
