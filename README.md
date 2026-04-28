# rule-io-sdk

Nx monorepo for the Rule.io TypeScript SDK. Publishes eight packages under the `@rule-io/*` npm scope:

| Package | Purpose |
|---|---|
| [`@rule-io/core`](packages/core) | Shared error classes (zero deps) |
| [`@rule-io/rcml`](packages/rcml) | RCML email-template builders, RCML types, automation-config schema |
| [`@rule-io/client`](packages/client) | HTTP wrapper around the Rule.io v2/v3 API |
| [`@rule-io/vendor-shopify`](packages/vendor-shopify) | Shopify preset — e-commerce automation flows |
| [`@rule-io/vendor-bookzen`](packages/vendor-bookzen) | Bookzen preset — hospitality automation flows |
| [`@rule-io/vendor-samfora`](packages/vendor-samfora) | Samfora preset — Swedish donation flows |
| [`@rule-io/sdk`](packages/sdk) | Meta-package re-exporting the six library packages above |
| [`@rule-io/cli`](packages/cli) | `rule-io` command-line tool — deploy presets, validate RCML, inspect accounts |

Dependency graph (clean DAG, no cycles):

```
core ← rcml ← client
  ↑     ↑       ↑
  └── vendor-{shopify,bookzen,samfora}
                                    ↑
sdk (meta) ─── depends on all six   │
cli        ─── depends on client, rcml, core, all three vendor-*
```

---

## Dev workflow

Node `>=20` required (the Nx plugins used by this workspace rely on `node:util.styleText`, added in Node 20.12 / 22). If you use nvm: `nvm use 22`.

```bash
npm install                         # install + link workspace packages
npx nx show projects                # sanity-check: 8 publishable projects
npm run build                       # build all publishable packages → dist/packages/<pkg>/
npm run test                        # run every package's tests
npm run lint                        # lint every package
npm run graph                       # visualise the project graph in a browser

# Run the CLI directly against source (no build step):
npm run cli -- --help
npm run deploy:shopify -- --activate
```

Building a single package (and its deps, in topological order):

```bash
npx nx build @rule-io/vendor-shopify    # builds core, rcml, vendor-shopify
```

---

## Release process

Releases are driven by [`nx release`](https://nx.dev/features/manage-releases) — conventional-commits-based, independent per-package, with a transformed package.json shipped from `dist/packages/<pkg>/` at publish time.

### Prerequisites

1. **Clean working tree + on `main`**: `git status` shows nothing; no unpushed commits.
2. **Node 20+** in your shell (`node --version`).
3. **npm authenticated** with a token that has publish rights on the `@rule-io` scope. Either:
   - `npm login` — interactive, writes `~/.npmrc`.
   - `NPM_CONFIG_TOKEN=<token> npx nx release publish` — one-shot, no persisted state (preferred for CI).
4. **Commits since the last release follow the [Conventional Commits](https://www.conventionalcommits.org/) spec** (`feat:`, `fix:`, `refactor:`, `chore:`, …). `nx release` reads them to decide the semver bump per package.

### Step 1 — Dry-run

Always preview what `nx release` would do before committing to it:

```bash
npx nx release --dry-run
```

This:
- runs the `preVersionCommand` (`nx run-many -t build`) to regenerate `dist/packages/<pkg>/`
- determines the next version per package from conventional commits since each package's last git tag
- shows the diff it would write to each `dist/packages/<pkg>/package.json` (the *published* manifest)
- shows the `packages/<pkg>/CHANGELOG.md` entries it would append
- shows the git commit + per-package tags it would create
- shows which packages it would publish to npm (skipped under `--dry-run`)

**First release only** — pass `--first-release` so Nx doesn't fail when no prior git tags exist:

```bash
npx nx release --first-release --dry-run --skip-publish
```

### Step 2 — Run the release

Drop `--dry-run` to execute:

```bash
npx nx release
# or for the first release:
npx nx release --first-release
```

This creates local commits + tags and pushes to the registry. You can split the steps if you want more control:

```bash
npx nx release version          # bump versions, write CHANGELOG entries, commit, tag
npx nx release publish          # npm publish from dist/packages/<pkg>/ for each bumped package
```

### Step 3 — Push commits + tags

`nx release` does **not** push automatically. Push the release commit and all tags:

```bash
git push --follow-tags
```

### Versioning rules

- **Independent** — each package gets its own semver track (`projectsRelationship: "independent"` in `nx.json`).
- **Specifier is inferred from conventional commits** (`specifierSource: "conventional-commits"`):
  - `feat:` → minor bump
  - `fix:`, `refactor:`, `perf:` → patch bump
  - `BREAKING CHANGE:` footer / `!` suffix → major bump
  - `chore:`, `docs:`, `test:`, `style:`, `ci:` → no bump by default
- **Scope your commits** when a change is package-specific: `fix(vendor-shopify): …`, `feat(rcml): …`. Unscoped changes are attributed to all affected packages.
- **Cross-package dep bumps** — when `@rule-io/client@0.4.0` releases, Nx automatically bumps the `@rule-io/client` dependency in `@rule-io/sdk`'s dist package.json to match. The `@rule-io/sdk` meta-package follows suit via its own semver rules; typically release `@rule-io/sdk` in the same `nx release` invocation so the meta stays aligned.

### What gets published

For each bumped package, Nx runs `npm publish` from `dist/packages/<pkg>/`. Contents of each tarball:

- the `.js` + `.d.ts` output under `dist/packages/<pkg>/src/`
- the package-specific `README.md` and `CHANGELOG.md`
- a `package.json` with the bumped version, rewritten paths, and no `devDependencies`

Runtime dependencies across all seven packages are only `@rule-io/*` workspace siblings — CI enforces zero external deps.

### CI / automated release

CI (`.github/workflows/ci.yml`) currently runs quality gates (lint / test / build / zero-deps check) on every PR. Automated publish from CI is **not** wired up yet. When adding it, the usual pattern is a `release.yml` workflow triggered by a push to `main` or a manual `workflow_dispatch` that runs `npx nx release` with `NPM_CONFIG_TOKEN` from repo secrets.

### Rolling back a bad release

If you've already run `npx nx release` but not pushed:

```bash
git reset --hard HEAD~1           # drop the release commit
git tag -d <tag-created-by-nx>    # delete each tag Nx created (see `git tag --sort=-creatordate` to find them)
```

If you've pushed but not published (unlikely — `nx release` publishes before you get a chance to push):

```bash
git push --delete origin <tag>
git revert <release-sha> && git push
```

If a broken version is live on npm, **unpublish within 72 hours** (`npm unpublish @rule-io/<pkg>@<version>`) or publish a patch release with the fix.

---

## Repository layout

```
packages/
├── core/
├── rcml/
├── client/
├── vendor-shopify/
├── vendor-bookzen/
├── vendor-samfora/
└── sdk/                    # meta-package
scripts/                    # dev utilities (deploy, clone, validate); not published
.github/workflows/          # CI
nx.json                     # Nx config incl. `release`
tsconfig.json               # path mappings for IDE autocompletion
```

Dev utility scripts in `scripts/` consume `@rule-io/sdk` (the meta) via the workspace symlink. Run any of them with `npx tsx scripts/<name>.ts`.

---

## Contributing

- Start a branch from `main`.
- Use conventional commits (`feat(core): …`, `fix(vendor-shopify): …`, etc.) — they drive the version bumps.
- Open a PR; CI runs `nx affected -t eslint:lint test-ci build --parallel=3` on your changes.
- After merge, a maintainer runs `nx release` to publish.
