---
description: Run the test suite with coverage
allowed-tools: Bash(npm run test:*)
---

Run the test suite and show coverage report.

```bash
npm run test -- --coverage
```

Analyze the results and suggest improvements for:

- Failing tests
- Low coverage areas (aim for >80% on `src/client.ts` and `src/rcml/`)
- Missing test cases for:
  - Error handling paths (401, 404, 429, 500)
  - Edge cases (empty input, special characters, XSS payloads)
  - Cleanup logic (createAutomationEmail rollback)
  - All public exports from `src/index.ts`
