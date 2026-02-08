---
description: Pre-publish checklist and version bump
allowed-tools: Bash(npm run:*), Bash(npm version:*), Bash(npm publish:*), Bash(git:*), Bash(cat:*), Bash(grep:*), Read, Write, Edit
argument-hint: [patch|minor|major]
---

# Pre-Publish Checklist

**Version bump type:** $ARGUMENTS (default: patch)

---

## STEP 1: VERIFY EVERYTHING PASSES

```bash
npm run type-check
npm run lint
npm run test -- --coverage
npm run build
```

ALL must pass. Stop if any fail.

---

## STEP 2: CHECK PUBLIC API

Review `src/index.ts` for unintentional changes:

```bash
git diff HEAD -- src/index.ts
```

**If exports were removed or renamed:**
- This is a BREAKING CHANGE → must be `major` bump
- Confirm with user before proceeding

**If exports were added:**
- This is a feature → should be at least `minor` bump

---

## STEP 3: CHECK BUILD OUTPUT

```bash
npm run build
ls -la dist/
```

Verify:
- [ ] `dist/index.js` exists (CJS)
- [ ] `dist/index.mjs` exists (ESM)
- [ ] `dist/index.d.ts` exists (types)
- [ ] No unexpected files in dist/

---

## STEP 4: CHECK PACKAGE.JSON

Verify:
- [ ] `main` points to `dist/index.js`
- [ ] `module` points to `dist/index.mjs`
- [ ] `types` points to `dist/index.d.ts`
- [ ] `files` only includes `dist` and `README.md`
- [ ] No `devDependencies` leak into `dependencies`

---

## STEP 5: TEST PACKAGE CONTENTS

```bash
npm pack --dry-run
```

Review what would be published. Should NOT include:
- `src/` directory
- `tests/` directory
- `.claude/` directory
- `.env` files
- `node_modules/`

---

## STEP 6: VERSION BUMP

```bash
npm version $ARGUMENTS
```

This creates a git tag automatically.

---

## STEP 7: PUBLISH

Ask user for confirmation before publishing:

"Ready to publish version X.Y.Z to npm. Proceed?"

```bash
npm publish
git push --follow-tags
```

---

## NEVER DO

- Publish without running full test suite
- Publish with `any` types in public API
- Publish breaking changes as patch/minor
- Publish without updating CHANGELOG.md
