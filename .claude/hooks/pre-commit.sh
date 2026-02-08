#!/usr/bin/env bash
# Pre-commit checks for the Rule.io SDK.
# Runs type check, lint, and tests before allowing commits.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

cd "$PROJECT_DIR" || {
    echo "❌ Failed to change to project directory: $PROJECT_DIR"
    exit 1
}

# Enforce /commit skill usage
if [ "$CLAUDE_COMMIT_SKILL" != "1" ]; then
    echo ""
    echo "🚫 COMMIT BLOCKED: Direct git commit is not allowed"
    echo ""
    echo "   You must use the /commit command to create commits."
    echo "   This ensures mandatory self-review before committing."
    echo ""
    echo "   Run: /commit"
    echo ""
    exit 1
fi

echo "🔍 Running pre-commit checks..."

ERRORS=0

# Skip npm checks if node_modules missing
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "   ⚠️  node_modules not found - run 'npm install'"
    exit 1
fi

# Quality gate checks on staged files
echo ""
echo "━━━ Quality Gate ━━━"

# Check for any type usage
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$' | grep -v '\.d\.ts$' || true)
if [ -n "$STAGED_TS" ]; then
    echo "  → Checking for 'any' type usage..."
    ANY_USAGE=""
    for file in $STAGED_TS; do
        matches=$(grep -Hn ": any" "$file" 2>/dev/null | grep -v "catch.*any\|error.*any\|err.*any" || true)
        [ -n "$matches" ] && ANY_USAGE+="$matches"$'\n'
    done
    if [ -n "$ANY_USAGE" ]; then
        echo ""
        echo "  ❌ 'any' type found (use specific types or 'unknown'):"
        echo "$ANY_USAGE" | head -5 | sed 's/^/     /'
        ERRORS=$((ERRORS + 1))
    fi

    # Check for console.log (should use debug logging)
    echo "  → Checking for console.log..."
    CONSOLE_LOGS=""
    for file in $STAGED_TS; do
        [[ "$file" == *"test"* ]] && continue
        matches=$(grep -Hn "console\.log" "$file" 2>/dev/null | grep -v "this\.log\|config\.debug\|// debug" || true)
        [ -n "$matches" ] && CONSOLE_LOGS+="$matches"$'\n'
    done
    if [ -n "$CONSOLE_LOGS" ]; then
        echo ""
        echo "  ⚠️  console.log found (use this.log() with debug flag):"
        echo "$CONSOLE_LOGS" | head -5 | sed 's/^/     /'
    fi

    # Check for hardcoded customer references
    echo "  → Checking for hardcoded business references..."
    HARDCODED=""
    for file in $STAGED_TS; do
        matches=$(grep -Hin "blacksta\|vingård\|bookzen" "$file" 2>/dev/null || true)
        [ -n "$matches" ] && HARDCODED+="$matches"$'\n'
    done
    if [ -n "$HARDCODED" ]; then
        echo ""
        echo "  ❌ Hardcoded business references found (must be parameterized):"
        echo "$HARDCODED" | head -5 | sed 's/^/     /'
        ERRORS=$((ERRORS + 1))
    fi
fi

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "❌ QUALITY GATE FAILED - $ERRORS critical issue(s)"
    exit 1
fi

# Type check
echo ""
echo "━━━ Automated Checks ━━━"
echo "  → Type checking..."
npm run type-check > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found. Run: npm run type-check"
    exit 1
fi
echo "  ✅ Type check passed"

# Lint (only if lint script exists)
if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    echo "  → Linting..."
    npm run lint > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Lint failed. Run: npm run lint"
        exit 1
    fi
    echo "  ✅ Lint passed"
else
    echo "  ⚠️ Lint skipped (no lint script in package.json)"
fi

# Tests
if [ -f "vitest.config.ts" ]; then
    echo "  → Running tests..."
    npm run test > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "❌ Tests failed. Run: npm run test"
        exit 1
    fi
    echo "  ✅ Tests passed"
fi

# Build check (ensure it compiles)
echo "  → Build check..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Run: npm run build"
    exit 1
fi
echo "  ✅ Build passed"

echo ""
echo "✅ All pre-commit checks passed!"
exit 0
