#!/usr/bin/env bash
# Build a self-contained release tarball for the droplet: dist/sore-eyes.tar.gz
# Contains the Next.js standalone server only — never data, PDFs or extracted pages.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run test
npm run build

rm -rf dist/pkg && mkdir -p dist/pkg
cp -R .next/standalone/. dist/pkg/
mkdir -p dist/pkg/.next && cp -R .next/static dist/pkg/.next/static

# Guard: refuse to ship anything private.
if find dist/pkg -path '*/node_modules' -prune -o \( -name '*.pdf' -o -name 'state.json' -o -path '*private-assets*' -o -name '.env*' \) -print | grep -q .; then
  echo "Refusing to package: private files found in the bundle." >&2
  exit 1
fi

tar -czf dist/sore-eyes.tar.gz -C dist/pkg .
echo "Release: dist/sore-eyes.tar.gz ($(du -h dist/sore-eyes.tar.gz | cut -f1))"
