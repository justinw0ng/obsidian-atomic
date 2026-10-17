#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${ATOMIC_JOURNEY_WORK:-${TMPDIR:-/tmp}/atomic-reader-journey}"
mkdir -p "$WORK"
cp "$ROOT/journey.source.html" "$WORK/styled2.html"
cp "$ROOT/tools/flatten.js" "$WORK/flatten.js"

python3 - "$WORK" <<'PY'
from pathlib import Path
import sys
work = Path(sys.argv[1])
html = (work / "styled2.html").read_text()
script = (work / "flatten.js").read_text()
(work / "flat_m.html").write_text(html.replace("</body>", "<script>" + script + "</script></body>"))
PY

timeout 180 google-chrome --headless=new --no-sandbox --disable-gpu \
  --window-size=6400,1200 --virtual-time-budget=8000 \
  --dump-dom "file://${WORK}/flat_m.html" 2>/dev/null > "${WORK}/flat_d.html"

python3 - "$WORK" <<'PY'
from pathlib import Path
import re, sys
work = Path(sys.argv[1])
s = (work / "flat_d.html").read_text()
s = re.sub(r"<script>\(function\(\)\{.*?</script>", "", s, flags=re.S)
s = re.sub(r"<script>[\s\S]*?</script>", "", s)
(work / "journey.flat.html").write_text("<!DOCTYPE html>\n" + s)
PY

python3 - "$WORK" <<'PY'
from pathlib import Path
import re, sys
p = Path(sys.argv[1]) / "journey.flat.html"
s = p.read_text()
def f(m):
    v = m.group(1).split()
    while len(v) < 4:
        v = v + [v[len(v) - 2] if len(v) >= 2 else v[0]]
    t, r, b, l = v
    out = f"top: {t}; left: {l};"
    if r != "auto":
        out += f" right: {r};"
    if b != "auto":
        out += f" bottom: {b};"
    return out
s, n = re.subn(r"inset:\s*([^;\"]+);", f, s)
print("inset fixed", n)
p.write_text(s)
PY

# Generated import board. Do not commit journey.html.
cp "${WORK}/journey.flat.html" "${WORK}/journey.html"
echo "Wrote ${WORK}/journey.html ($(wc -c < "${WORK}/journey.html") bytes)"
echo "Import with: openpencil import ${WORK}/journey.html -o ${ROOT}/atomic-reader-journey.fig"

timeout 120 google-chrome --headless=new --no-sandbox --disable-gpu \
  --window-size=2200,1100 \
  --screenshot="${WORK}/theater-styled-preview.png" \
  "file://${WORK}/styled2.html#step-06" 2>/dev/null || true
echo "build done"
