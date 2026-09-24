#!/usr/bin/env bash
# export-pdf.sh - gabungkan semua PoC markdown jadi 1 PDF lengkap (per bahasa)
# Usage: ./scripts/export-pdf.sh [en|id] [output.pdf]
# Requires: pandoc + Chrome/Chromium (headless print-to-pdf)
set -euo pipefail

LANG_CODE="${1:-en}"
OUT="${2:-rudilab-poc-${LANG_CODE}.pdf}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
CONTENT_DIR="$ROOT/content/$LANG_CODE/poc"

if [ ! -d "$CONTENT_DIR" ]; then
  echo "ERROR: content dir tidak ada: $CONTENT_DIR" >&2
  exit 1
fi
if ! command -v pandoc >/dev/null; then
  echo "ERROR: pandoc tidak terinstall. brew install pandoc" >&2
  exit 1
fi
CHROME=""
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
         "$(command -v chromium 2>/dev/null || true)" \
         "$(command -v google-chrome 2>/dev/null || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then CHROME="$c"; break; fi
done
if [ -z "$CHROME" ]; then
  echo "ERROR: Chrome/Chromium tidak ditemukan (dibutuhkan untuk print-to-pdf)." >&2
  exit 1
fi

TMP_HTML="$(mktemp -d)/rudilab-poc.html"
TITLE="Rudi - PoC Write-ups ($LANG_CODE)"

echo "→ Menggabung markdown ($LANG_CODE)..."
pandoc "$CONTENT_DIR"/poc*.md \
  --from markdown+smart+yaml_metadata_block \
  --to html5 \
  --standalone \
  --toc --toc-depth=2 \
  --number-sections \
  --metadata title="$TITLE" \
  --metadata lang="${LANG_CODE/-*/}" \
  --section-divs \
  --wrap=none \
  -o "$TMP_HTML"

echo "→ Membuat PDF via headless Chrome..."
"$CHROME" --headless --disable-gpu --no-sandbox \
  --print-to-pdf="$OUT" \
  --no-pdf-header-footer \
  "$TMP_HTML" >/dev/null 2>&1

echo "✓ PDF selesai: $OUT"
ls -lh "$OUT" | awk '{print "  ukuran:", $5}'