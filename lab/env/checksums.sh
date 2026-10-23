#!/usr/bin/env bash
# SHA-256 checksums of the deliverables (constitution, Principle V: deliverables SHOULD carry a checksum).
#   checksums.sh generate    writes docs/checksums.sha256 for the deliverables that exist
#   checksums.sh verify      checks every file in docs/checksums.sha256; prints OK or FAILED per file
#
# Deliverables:
#   plugins/sybase-cdc/sybase-cdc-connector-0.1.0.jar                the finished connector (required)
#   lab/solutions/06-package-and-run/target/cdc-lab-06-package-and-run-0.1.0.jar   the build-along plugin (SKIPPED if not built)
#   deliverables/images/sybase-cdc-connect-0.1.0.tar.gz              the worker image archive (SKIPPED if absent: it is git-ignored, too large for git)
#   docs/index.html  docs/article.html                               the handbook and the article (required)
#   docs/site/index.html  docs/site/assets/site.css  docs/site/assets/site.js   the article website (required; rebuild with: node docs-src/build.js site)
# Exit code of verify: 1 if any file FAILED, is missing, or a required deliverable is not in the checksum list; 2 bad usage.
# CHECKSUM_ROOT=<dir> verifies a copy of the tree (used to test that a changed byte is detected).
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
ROOT=${CHECKSUM_ROOT:-$LAB_ROOT}
LIST="$LAB_ROOT/docs/checksums.sha256"
required=(plugins/sybase-cdc/sybase-cdc-connector-0.1.0.jar docs/index.html docs/article.html docs/site/index.html docs/site/assets/site.css docs/site/assets/site.js)
optional=(lab/solutions/06-package-and-run/target/cdc-lab-06-package-and-run-0.1.0.jar deliverables/images/sybase-cdc-connect-0.1.0.tar.gz)

case "${1:-}" in
  generate)
    : > "$LIST.tmp"; skipped=0; n=0
    for f in "${required[@]}" "${optional[@]}"; do
      if [ -f "$LAB_ROOT/$f" ]; then
        # sha256sum on Windows prints "<hash> *<file>"; write the portable "<hash>  <file>" form
        ( cd "$LAB_ROOT" && h=$(sha256sum "$f" | cut -d' ' -f1) && printf '%s  %s\n' "$h" "$f" ) >> "$LIST.tmp"; n=$((n + 1))
      else
        case " ${required[*]} " in *" $f "*) echo "ERROR: required deliverable missing: $f" >&2; rm -f "$LIST.tmp"; exit 1 ;; esac
        echo "SKIPPED  $f (not present)"; skipped=$((skipped + 1))
      fi
    done
    mv "$LIST.tmp" "$LIST"
    echo "wrote docs/checksums.sha256: $n files, $skipped skipped"
    ;;
  verify)
    [ -f "$LIST" ] || { echo "no docs/checksums.sha256: run checksums.sh generate" >&2; exit 1; }
    checked=0; failed=0; skipped=0
    for f in "${required[@]}"; do grep -qF "  $f" "$LIST" || { echo "FAILED   $f is a required deliverable but is not in the checksum list"; failed=$((failed + 1)); }; done
    for f in "${optional[@]}"; do grep -qF "  $f" "$LIST" || { echo "SKIPPED  $f (not in the list)"; skipped=$((skipped + 1)); }; done
    while read -r sum path; do
      [ -z "$path" ] && continue
      checked=$((checked + 1))
      if [ ! -f "$ROOT/$path" ]; then echo "FAILED   $path (file missing)"; failed=$((failed + 1)); continue; fi
      actual=$(sha256sum "$ROOT/$path" | cut -d' ' -f1)
      if [ "$actual" = "$sum" ]; then echo "OK       $path"; else echo "FAILED   $path (expected ${sum:0:12}..., got ${actual:0:12}...)"; failed=$((failed + 1)); fi
    done < <(sed -E 's/^([0-9a-f]+) [ *]/\1 /' "$LIST")
    echo "$checked checked, $failed failed, $skipped skipped"
    [ "$failed" -eq 0 ]
    ;;
  *) echo "usage: checksums.sh generate|verify" >&2; exit 2 ;;
esac
