---
description: Generate API documentation from source code
allowed-tools: Read, Glob, Grep, Bash(cat:*), Write
---

Generate comprehensive API documentation for the Rule.io SDK.

**Scope:** $ARGUMENTS (if empty, document all public API)

**Read the public API from:** `src/index.ts`

**For each exported item, document:**

1. **Name and type** (function, class, type, constant)
2. **Description** from JSDoc
3. **Parameters** with types and descriptions
4. **Return type** and description
5. **Example usage**
6. **Error cases** (what throws and when)

**Categories to organize by:**

- **Client** - RuleClient class methods
- **RCML Builders** - Template and element creation functions
- **Types** - Exported TypeScript types and interfaces
- **Constants** - Tags, URLs, defaults
- **Errors** - Error classes
- **Utilities** - Helper functions (escapeHtml, sanitizeUrl, etc.)

**Output:** Update or create `API_REFERENCE.md` at project root.

**Validation:** Cross-reference with actual source code to ensure accuracy.
Verify every public export from `src/index.ts` is documented.
