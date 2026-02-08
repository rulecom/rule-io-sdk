---
description: Create a well-formatted git commit (includes self-review)
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(CLAUDE_COMMIT_SKILL=1 git commit:*), Bash(git diff:*), Bash(git push:*), Bash(git log:*), Bash(gh pr:*), Bash(gh api:*), Bash(npm run:*), Read, Glob, Grep
argument-hint: [scope or files]
---

> **IMPORTANT**: Prefix git commit with `CLAUDE_COMMIT_SKILL=1` to pass pre-commit hook.
> Example: `CLAUDE_COMMIT_SKILL=1 git commit -m "..."`

> **AUTO-COMMIT**: If ALL checks pass, proceed through the entire flow automatically.
> Do NOT stop to ask for confirmation when everything is green.

## STEP 0: CONTEXT CHECK (MANDATORY)

Before reviewing, check what type of changes you're committing:

```bash
git diff --cached --name-only
```

**If changes touch `src/index.ts`:**
- Verify no accidental export removals (breaking change!)
- Check if new exports need tests

**If changes touch `src/rcml/`:**
- Verify templates still produce valid RCML
- Check XSS protection (escapeHtml, sanitizeUrl usage)

**If changes touch `src/client.ts`:**
- Verify backward compatibility
- Check error handling for all API calls

---

## STEP 1: RUN /review (MANDATORY GATE)

Run the /review skill on your changes. Do not skip.

**STOP** if /review found any Critical Issues. Fix ALL before proceeding.

---

## STEP 2: RUN /critique

Run the /critique skill. Do not skip.

**If /critique finds issues: STOP and fix them.**

---

## STEP 3: AUTOMATED CHECKS

```bash
npm run type-check    # TypeScript errors - MUST pass
npm run lint          # ESLint errors - MUST pass
npm run test          # Tests - MUST pass
```

If ANY fail, stop and fix.

---

## STEP 4: VERIFY YOUR WORK

1. **Run it** - If you wrote a function, call it in a test
2. **Break it** - Try empty input, null, edge cases
3. **Verify claims** - If you said "this does X", prove it

**If you can't demonstrate it works, don't commit it.**

---

## STEP 5: CREATE COMMIT

Status: !`git status --short`

Diff summary: !`git diff --stat`

Recent commits: !`git log --oneline -5`

**Format:**
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Focus on "why" not "what"
- Subject line under 72 characters

**Footer (required):**
```
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Steps:**
1. Add files: `git add <files>`
2. Commit:
   ```bash
   CLAUDE_COMMIT_SKILL=1 git commit -m "feat: Subject line

   Body explaining the why.

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```
3. Verify: `git status`

---

## STEP 6: PUSH TO REMOTE

1. Push: `git push -u origin <branch-name>`
2. Check PR: `PR_NUMBER=$(gh pr view --json number -q '.number' 2>/dev/null)`
3. If PR exists: report URL. If not: ask user.
