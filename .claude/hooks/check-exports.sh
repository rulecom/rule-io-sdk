#!/usr/bin/env bash
# Check for changes to public API exports.
# Warns when src/index.ts is modified so you don't accidentally break consumers.
# Consolidates: check-exports.sh, api-surface.sh, validate-exports.sh

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
FILE_PATH="$TOOL_USE_FILE_PATH"

# Only check if src/index.ts was modified
if [[ "$FILE_PATH" != *"src/index.ts" ]]; then
    exit 0
fi

echo ""
echo "⚠️  PUBLIC API CHANGE DETECTED: src/index.ts was modified"
echo ""
echo "   Every export is a contract with consumers."
echo "   • Adding exports: OK (needs JSDoc + tests)"
echo "   • Removing exports: BREAKING CHANGE (needs major version bump)"
echo "   • Renaming exports: BREAKING CHANGE (deprecate old name first)"
echo ""

# Compare with git HEAD to detect removed/added exports
if command -v git &> /dev/null; then
    cd "$PROJECT_DIR" || exit 0

    OLD_EXPORTS=$(git show HEAD:src/index.ts 2>/dev/null | grep "^export" | sort)
    NEW_EXPORTS=$(grep "^export" "$FILE_PATH" | sort)

    if [ -n "$OLD_EXPORTS" ]; then
        REMOVED=$(comm -23 <(echo "$OLD_EXPORTS") <(echo "$NEW_EXPORTS"))
        if [ -n "$REMOVED" ]; then
            echo "   🚨 REMOVED EXPORTS (breaking change!):"
            echo "$REMOVED" | sed 's/^/      /'
            echo ""
            echo "   This requires a MAJOR version bump."
            echo ""
        fi

        ADDED=$(comm -13 <(echo "$OLD_EXPORTS") <(echo "$NEW_EXPORTS"))
        if [ -n "$ADDED" ]; then
            echo "   ➕ NEW EXPORTS:"
            echo "$ADDED" | sed 's/^/      /'
            echo ""
            echo "   Ensure new exports have tests and JSDoc."
            echo ""
        fi
    fi
fi

echo "   Run /review before committing to verify no breaking changes."
echo ""

exit 0
