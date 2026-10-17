#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${ATOMIC_JOURNEY_WORK:-${TMPDIR:-/tmp}/atomic-reader-journey}"
T="${WORK}/tree.txt"
cd "$ROOT"
if [ ! -f "$T" ]; then
  echo "Missing ${T}."
  echo "Generate it with: mkdir -p ${WORK} && openpencil tree atomic-reader-journey.fig > ${T}"
  exit 1
fi
id(){ grep -E "$1" "$T" | sed -n "${2:-1}p" | grep -o '([0-9:]*)' | tr -d '()'; }
O="${OPENPENCIL:-openpencil}"; F=atomic-reader-journey.fig
e(){ $O export $F --node "$1" -s 2 -o export/$2.png 2>&1 | grep Exported; }
e $(id '"step-01"') 01-library; e $(id '"step-02"') 02-note-tap; e $(id '"step-03"') 03-chooser; e $(id '"step-04"') 04-open-notes
e $(id '"step-05"') 05-open-book-flight
e $(id '"flight"' 1) 05a-cover-lifts; e $(id '"flight"' 2) 05b-hinge-opens; e $(id '"flight"' 3) 05c-pages-flip; e $(id '"flight"' 4) 05d-spread-forms; e $(id '"flight"' 5) 05e-lands-p47
e $(id '"step-06"') 06-theater
e $(id '"desk-theater-light"') 06-theater-light
e $(id '"desk-theater-dark"') 06-theater-dark
e $(id '"step-07"') 07-reader; e $(id '"step-08"') 08-ask; e $(id '"step-09"') 09-canvas; e $(id '"step-10"') 10-settings
e $(id '"step-07b"') 07b-book-size
