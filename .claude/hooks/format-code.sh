#!/usr/bin/env bash
# Auto-format code after Write/Edit operations

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
FILE_PATH="$TOOL_USE_FILE_PATH"

# Only format if Prettier is actually available
if ! command -v prettier &> /dev/null && [ ! -x "$PROJECT_DIR/node_modules/.bin/prettier" ]; then
    exit 0
fi

# Format TypeScript/JavaScript/JSON/Markdown files
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json|md)$ ]]; then
    npx --no-install prettier --write -- "$FILE_PATH" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Formatted: $FILE_PATH"
    else
        echo "⚠️  Could not format: $FILE_PATH"
    fi
fi

exit 0
