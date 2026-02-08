# Claude Code Configuration

This directory contains Claude Code workflow automation for the **Rule.io SDK**.

## Overview

- **Slash Commands:** Quick shortcuts for common development tasks
- **Hooks:** Automated quality checks on file writes and commits
- **Rules:** Context-aware guidelines activated by file path

---

## Slash Commands

| Command      | Description                              |
| ------------ | ---------------------------------------- |
| `/commit`    | Smart commit (runs /review first)        |
| `/review`    | Code review against SDK standards        |
| `/critique`  | Self-critique your changes               |
| `/test`      | Run tests with coverage                  |
| `/publish`   | Pre-publish checklist and version bump   |
| `/api-docs`  | Generate API documentation               |

---

## Active Hooks

### PostToolUse (After Write/Edit)

1. **Code Formatting** (`format-code.sh`) — Auto-format with Prettier
2. **Security Scan** (`security-scan.py`) — Detect hardcoded secrets
3. **Export Check** (`check-exports.sh`) — Warn about public API changes

### PreToolUse (Before Bash Commands)

4. **Pre-Commit** (`pre-commit.sh`) — Type check, lint, test gate

---

## Rules (Path-Scoped)

| Rule             | Applies To              | Purpose                                |
| ---------------- | ----------------------- | -------------------------------------- |
| code-quality.md  | `src/**/*.ts`           | DRY, type safety, no `any`             |
| testing.md       | `tests/**/*`            | Test patterns and coverage             |
| api-client.md    | `src/client.ts`         | API quirks, error handling             |
| public-api.md    | `src/index.ts`          | Export stability, backward compat      |
| rcml.md          | `src/rcml/**/*.ts`      | RCML structure, XSS, template patterns |

---

## Security Note

The `.claude/` directory is checked into git to share team workflows.
**DO NOT** put secrets in these files.
