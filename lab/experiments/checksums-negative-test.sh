#!/usr/bin/env bash
# Shows that checksums.sh verify passes on the real tree, fails when one byte of a copy changes, and fails when a file is missing.
# Works on copies in a temporary directory; the real files are never modified. Exit code 1 if any of the three results is not as expected.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
CS="$REPO/lab/env/checksums.sh"
bad=0
expect() { # name, expected rc, actual rc
  if [ "$2" -eq "$3" ]; then echo "-> $1: exit $3 as expected"; else echo "-> $1: exit $3, EXPECTED $2"; bad=1; fi
}

echo "== 1. verify on the real tree"
bash "$CS" verify; expect "clean verify" 0 $?

tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/docs/site/assets" "$tmp/docs/site/path" "$tmp/plugins/sybase-cdc"
cp "$REPO/docs/index.html" "$REPO/docs/article.html" "$tmp/docs/"
cp "$REPO/docs/site/index.html" "$tmp/docs/site/"
cp "$REPO/docs/site/path/index.html" "$tmp/docs/site/path/"
cp "$REPO/docs/site/assets/site.css" "$REPO/docs/site/assets/site.js" "$REPO/docs/site/assets/path.js" "$tmp/docs/site/assets/"
cp "$REPO/plugins/sybase-cdc/sybase-cdc-connector-0.1.0.jar" "$tmp/plugins/sybase-cdc/"

echo "== 2. verify a copy where one byte of docs/article.html was changed"
printf 'X' | dd of="$tmp/docs/article.html" bs=1 seek=100 count=1 conv=notrunc 2>/dev/null
CHECKSUM_ROOT="$(cd "$tmp" && pwd -W 2>/dev/null || pwd)" bash "$CS" verify; expect "one byte changed" 1 $?

echo "== 3. verify a copy where docs/index.html is missing"
cp "$REPO/docs/article.html" "$tmp/docs/article.html"
rm "$tmp/docs/index.html"
CHECKSUM_ROOT="$(cd "$tmp" && pwd -W 2>/dev/null || pwd)" bash "$CS" verify; expect "file missing" 1 $?

exit $bad
