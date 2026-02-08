---
description: Review code changes against SDK standards
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(npm run type-check), Bash(npm run lint), Bash(npm run test)
argument-hint: [files]
---

You are acting as a **critical reviewer**. Be thorough and direct.

## The One Rule

**If you're not confident you understand every line, don't approve.**

---

## Instructions

1. **Run automated checks FIRST:**

   ```bash
   npm run type-check
   npm run lint
   ```

   If any fail, report immediately.

2. **Get the changes to review:**
   - If `$ARGUMENTS` provided: review those files
   - Otherwise: `git diff --cached` (staged)
   - If nothing staged: `git diff` (unstaged)
   - If nothing at all: `git diff HEAD~1` (last commit)

3. **Read the actual code and look for issues below**

---

## Critical Issues (MUST FIX)

### 1. Breaking Public API Changes

- Removed or renamed exports from `src/index.ts`
- Changed function signatures without backward compatibility
- Changed type definitions that consumers depend on

### 2. Type Safety

- Use of `any` type (except in catch blocks)
- Missing return types on public functions
- Missing JSDoc on public functions

### 3. XSS in Templates

- User-provided content not escaped with `escapeHtml()`
- URLs not validated with `sanitizeUrl()`
- Raw string interpolation in RCML output

### 4. Hardcoded Business Logic

- Customer-specific values (names, colors, URLs) that should be parameters
- Booking-specific logic that isn't configurable for other verticals
- Locale-specific text without parameterization

### 5. Security Vulnerabilities

- Hardcoded API keys or secrets
- Logging sensitive data (API keys, subscriber emails in production)
- Missing error handling that could leak internal details

---

## Important Issues (SHOULD FIX)

### 6. Missing Tests

- New public methods without tests
- Edge cases not covered (empty input, null, invalid data)
- Error scenarios not tested (API failures, rate limits)

### 7. Code Duplication

- Repeated patterns that should be extracted
- Similar RCML building logic across templates

### 8. RCML Validity

- Templates that might produce invalid RCML structure
- Missing required RCML fields (head, body, sections)
- Incorrect ProseMirror doc format

### 9. Error Handling

- Async operations without proper try/catch
- Missing cleanup on partial failures (e.g., createAutomationEmail)
- Silent failures that should surface errors

### 10. Documentation

- Public functions missing JSDoc
- Complex logic without comments
- README not updated for new features

---

## Warnings (NICE TO FIX)

### 11. Code Quality

- Console.log left in (should use debug flag)
- TODO/FIXME without linked issues
- Overly complex functions (>50 lines)
- Magic numbers without named constants

---

## Edge Case Checklist

- [ ] What happens with **empty input**? (empty string, empty array, null)
- [ ] What happens with **special characters**? (HTML entities, unicode)
- [ ] What happens if **API returns error**? (429, 401, 500, invalid JSON)
- [ ] Is this **backward compatible**? (existing consumers still work)
- [ ] Are **types correct**? (run `npm run type-check`)

---

## Output Format

```
## Code Review Results

### Automated Checks
- [ ] TypeScript: PASS/FAIL
- [ ] Linting: PASS/FAIL

### Critical Issues (N found)
1. **[file:line]** Description
   - Problem: What's wrong
   - Fix: How to fix it

### Important Issues (N found)
1. **[file:line]** Description

### Summary
- [ ] Ready to proceed
- [ ] Needs fixes before commit
```
