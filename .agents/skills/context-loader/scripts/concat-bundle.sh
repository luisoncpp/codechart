#!/usr/bin/env bash
# concat-bundle.sh — Concatenates source files into a single bundle
# Usage:
#   First call (overwrite):  ./concat-bundle.sh -o bundle.txt -- src/foo.ts src/bar.ts
#   Append more:             ./concat-bundle.sh -a -o bundle.txt -- src/baz.ts

set -euo pipefail

APPEND=false
OUTPUT=""
SOURCES=()
while [[ $# -gt 0 ]]; do
    case "$1" in
        -a|--append) APPEND=true; shift ;;
        -o|--output) OUTPUT="$2"; shift 2 ;;
        --) shift; SOURCES+=("$@"); break ;;
        *) SOURCES+=("$1"); shift ;;
    esac
done

if [[ -z "$OUTPUT" ]]; then
    echo "Error: -o <output> is required" >&2
    exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

if ! $APPEND; then
    > "$OUTPUT"
fi

for src in "${SOURCES[@]}"; do
    if [[ ! -f "$src" ]]; then
        echo "Error: File not found: $src" >&2
        exit 1
    fi
    {
        echo "--- BEGIN FILE: $src ---"
        cat "$src"
        echo "--- END FILE: $src ---"
        echo
    } >> "$OUTPUT"
done

MODE=$($APPEND && echo "appended" || echo "overwritten")
echo "Bundle $MODE: $OUTPUT (${#SOURCES[@]} files)"
