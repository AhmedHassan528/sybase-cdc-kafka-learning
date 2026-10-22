#!/usr/bin/env bash
# FR-015 audit: every script or file the article names must exist, and every bash example must be traceable to a script.
#   1. paths such as lab/env/start.sh or lab/experiments/offsets.sh  -> the file must exist
#   2. bare script names in the text (set-tables.sh, await-event.sh ...) -> a file with that name must exist under lab/
#   3. bash code blocks: lines that start with lab/ must name an existing file; other lines (curl, docker ...) are listed
#      as "inline commands" with the chapter's own scripts, so a reviewer can check they are reproduced by one of them.
# Exit code 1 if anything named does not exist. Usage: audit-article-scripts.sh
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
cd "$LAB_ROOT"
missing=0; checked=0

for f in docs-src/article/*.html; do
  name=$(basename "$f")
  # 1. paths (placeholders like NN-name are patterns, not files)
  while IFS=: read -r line path; do
    [ -z "$path" ] && continue
    case "$path" in *NN-*|*\<*|*\**) continue ;; esac
    checked=$((checked + 1))
    if [ ! -e "$path" ]; then echo "MISSING  $name:$line  $path"; missing=$((missing + 1)); fi
  done < <(grep -noE 'lab/[A-Za-z0-9_./-]+\.(sh|ps1|sql|json|jar|xml|md|java)' "$f" | sort -u)
  # 2. bare script names
  while IFS=: read -r line script; do
    [ -z "$script" ] && continue
    checked=$((checked + 1))
    if [ -z "$(find lab -name "$script" -not -path '*/target/*' -print -quit)" ]; then
      echo "MISSING  $name:$line  $script (no file of that name under lab/)"; missing=$((missing + 1))
    fi
  done < <(grep -noE '<code>[A-Za-z0-9_-]+\.(sh|ps1)</code>' "$f" | sed -E 's#<code>([^<]*)</code>#\1#' | sort -u)
  # 3. bash blocks
  inline=$(awk '/<pre data-lang="bash">/{b=1} b{print} /<\/pre>/{b=0}' "$f" | sed -E 's/<[^>]*>//g' | grep -vE '^\s*$|^\s*#|^\s*\\' | grep -vE '^\s*(lab/|--|export )' | head -n 50)
  if [ -n "$inline" ]; then
    own=$(grep -oE 'lab/[A-Za-z0-9_./-]+\.sh' "$f" | sort -u | tr '\n' ' ')
    echo "INLINE   $name: $(wc -l <<<"$inline" | tr -d ' ') inline command line(s); the chapter's own scripts: ${own:-none}"
  fi
done
echo "checked $checked script and path references, $missing missing"
[ "$missing" -eq 0 ]
