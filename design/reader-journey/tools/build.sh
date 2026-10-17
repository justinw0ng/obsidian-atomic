#!/usr/bin/env bash
set -euo pipefail
ROOT=/workspace/reader-openpencil
WORK=/tmp/rx
mkdir -p "$WORK"
cp "$ROOT/journey.source.html" "$WORK/styled2.html"
cp "$ROOT/tools/flatten.js" "$WORK/flatten.js"

python3 - <<'PY'
s=open('/tmp/rx/styled2.html').read()
open('/tmp/rx/flat_m.html','w').write(s.replace('</body>','<script>'+open('/tmp/rx/flatten.js').read()+'</script></body>'))
PY

timeout 180 google-chrome --headless=new --no-sandbox --disable-gpu \
  --window-size=6400,1200 --virtual-time-budget=8000 \
  --dump-dom "file:///tmp/rx/flat_m.html" 2>/dev/null > /tmp/rx/flat_d.html

python3 - <<'PY'
import re
s=open('/tmp/rx/flat_d.html').read()
s=re.sub(r'<script>\(function\(\)\{.*?</script>','',s,flags=re.S)
# also strip any leftover script tags from flatten
s=re.sub(r'<script>[\s\S]*?</script>','',s)
open('/tmp/rx/journey.flat.html','w').write('<!DOCTYPE html>\n'+s)
PY

python3 - <<'PY'
import re
p='/tmp/rx/journey.flat.html'; s=open(p).read()
def f(m):
    v=m.group(1).split()
    while len(v)<4: v=v+[v[len(v)-2] if len(v)>=2 else v[0]]
    t,r,b,l=v; out=f'top: {t}; left: {l};'
    if r!='auto': out+=f' right: {r};'
    if b!='auto': out+=f' bottom: {b};'
    return out
s,n=re.subn(r'inset:\s*([^;"]+);',f,s); print('inset fixed',n)
open(p,'w').write(s)
PY

cp /tmp/rx/journey.flat.html "$ROOT/journey.html"
echo "Wrote $ROOT/journey.html ($(wc -c < "$ROOT/journey.html") bytes)"

# quick visual of step-06 region via screenshot of source (styled) for QA
timeout 120 google-chrome --headless=new --no-sandbox --disable-gpu \
  --window-size=2200,1100 \
  --screenshot=/tmp/rx/theater-styled-preview.png \
  "file:///tmp/rx/styled2.html#step-06" 2>/dev/null || true
echo "build done"
