---
description: Critique your own work like a senior reviewer would
allowed-tools: Bash(git diff:*), Bash(grep:*), Bash(find:*), Bash(cat:*)
argument-hint: [files]
---

# /critique - Find Issues Before They Reach Consumers

You just wrote code. Now **attack it** like a hostile reviewer.

---

## Your Mindset

You are not the author anymore. You are a senior engineer who:
- Assumes the code has bugs until proven otherwise
- Thinks "what breaks when a consumer upgrades to this version?"
- Looks for inconsistencies, not just correctness

---

## Step 1: Get the Changes

```bash
git diff --cached  # staged
# or
git diff           # unstaged
```

---

## Step 2: Consistency Audit

For EVERY pattern you changed, search for similar patterns:

```bash
# If you changed error handling in one method
grep -rn "catch" src/client.ts

# If you added a new RCML element
grep -rn "create.*:" src/rcml/

# If you changed a type
grep -rn "export type\|export interface" src/types/
```

Ask: **"Did I apply this change everywhere it should apply?"**

---

## Step 3: Public API Audit

If you touched `src/index.ts` or any exported function:

```bash
# List all current exports
grep -n "^export" src/index.ts

# Check what consumers see
npm run build && cat dist/index.d.ts | head -100
```

Ask: **"Would this break any existing consumer?"**

---

## Step 4: Edge Case Audit

For each function you wrote:

| Input                | What Happens? |
| -------------------- | ------------- |
| `null`               | ?             |
| `undefined`          | ?             |
| `""` (empty string)  | ?             |
| `"<script>alert(1)"` | ?             |
| `0`                  | ?             |
| `[]` (empty array)   | ?             |
| String with unicode  | ?             |

If you can't answer confidently, **that's a bug**.

---

## Step 5: Failure Mode Audit

For each API call:

| Failure              | Handled? |
| -------------------- | -------- |
| 401 Unauthorized     | ?        |
| 404 Not Found        | ?        |
| 429 Rate Limited     | ?        |
| 500 Server Error     | ?        |
| Network timeout      | ?        |
| Invalid JSON         | ?        |
| Empty response body  | ?        |

---

## Step 6: The Consumer Test

Write down 3 complaints a consumer would file as GitHub issues:

1. "**___**"
2. "**___**"
3. "**___**"

Verify each is NOT an issue. If it IS, you found a bug.

---

## Step 7: Output

```
## Self-Critique Results

### Consistency Issues
- [ ] None found / [List any]

### Public API Impact
- [ ] No breaking changes / [List changes]

### Edge Cases
- [ ] All handled / [List unhandled]

### Failure Modes
- [ ] All handled / [List unhandled]

### Predicted Consumer Complaints
1. [Complaint] → [Not an issue because... / IS an issue]
2. [Complaint] → [Not an issue because... / IS an issue]
3. [Complaint] → [Not an issue because... / IS an issue]

### Verdict
- [ ] Ready to commit
- [ ] Issues to fix first: [list]
```

---

**If you can't find at least one potential issue, you haven't looked hard enough.**
