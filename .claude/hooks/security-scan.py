#!/usr/bin/env python3
"""
Security scan hook - detect hardcoded secrets and security issues.
Adapted for SDK context (no database URLs, but watch for API keys).
"""

import sys
import re
import os

project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
file_path = os.environ.get('TOOL_USE_FILE_PATH', '')

SECURITY_PATTERNS = [
    (r'apiKey\s*[:=]\s*["\'][a-f0-9-]{20,}["\']', 'Hardcoded API key detected'),
    (r'api[_-]?key\s*=\s*["\'][^"\']{10,}["\']', 'Hardcoded API key detected'),
    (r'Bearer\s+[a-f0-9-]{20,}', 'Hardcoded Bearer token detected'),
    (r'password\s*=\s*["\'][^"\']{3,}["\']', 'Hardcoded password detected'),
    (r'secret\s*=\s*["\'][^"\']{10,}["\']', 'Hardcoded secret detected'),
]

EXCLUDED_FILES = [
    '.env.example',
    'README.md',
    'CLAUDE.md',
    'security-scan.py',
]

SAFE_PATTERNS = [
    r'process\.env\.',
    r'\.env\.example',
    r'# Example',
    r'@example',
    r'your-api-key',
    r'test-key',
    r'mock',
    r'config\.apiKey',
]

if any(excluded in file_path for excluded in EXCLUDED_FILES):
    sys.exit(0)

if not file_path.endswith(('.ts', '.tsx', '.js', '.jsx', '.env', '.sh')):
    sys.exit(0)

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
except (OSError, IOError, UnicodeDecodeError):
    sys.exit(0)

def is_safe_context(line):
    return any(re.search(pattern, line, re.IGNORECASE) for pattern in SAFE_PATTERNS)

issues = []
lines = content.split('\n')

for pattern, message in SECURITY_PATTERNS:
    for i, line in enumerate(lines, 1):
        if is_safe_context(line):
            continue
        if re.search(pattern, line, re.IGNORECASE):
            issues.append((i, message, line.strip()[:80]))

if issues:
    print(f"\n⚠️  SECURITY WARNING in {file_path}:")
    for line_num, message, line_preview in issues:
        print(f"   Line {line_num}: {message}")
        print(f"   → {line_preview}")
    print("\n   → Use environment variables or config parameters instead!")

sys.exit(0)
