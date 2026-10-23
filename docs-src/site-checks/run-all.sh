#!/usr/bin/env bash
# Runs the validation scenarios of specs/002-article-website/quickstart.md from a clean state and prints one result line each.
# Scenario 1 deletes the GENERATED docs/site and the installed docs-src/node_modules, then reinstalls from the lock file
# (needs the internet once). Bash only; on Windows run it in Git Bash. Exit code 1 if any scenario fails or cannot run.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
cd "$REPO"
fails=0; t0=$(date +%s)
result() { printf '%-3s %-52s %s\n' "$1" "$2" "$3"; [[ "$3" == PASS* ]] || fails=$((fails + 1)); }
last() { tail -n 1 "$1" | cut -c1-110; }
run() { # number, name, command...   (PASS when exit 0; shows the last output line)
  local n="$1" name="$2"; shift 2
  "$@" > "/tmp/site-s$n.log" 2>&1; local rc=$?
  result "$n" "$name" "$([ $rc -eq 0 ] && echo "PASS ($(last /tmp/site-s$n.log))" || echo "FAIL (exit $rc: $(last /tmp/site-s$n.log))")"
}

echo "== scenario 1: clean install and build"
rm -rf docs/site docs-src/node_modules
run 1 "npm ci, then node docs-src/build.js site" bash -c 'npm ci --prefix docs-src --no-audit --no-fund && node docs-src/build.js site'

echo "== scenario 2: reproducible build and checksums"
run 2 "two builds identical, checksums generate and verify" bash -c 'node docs-src/site-checks/reproducible.js && bash lab/env/checksums.sh generate && node docs-src/build.js site && bash lab/env/checksums.sh verify'

echo "== scenario 3: text unchanged"
run 3 "text-compare" node docs-src/site-checks/text-compare.js
echo "== scenario 4: links"
run 4 "links (site) and the existing link check" bash -c 'node docs-src/site-checks/links.js && node docs-src/linkcheck.js docs "$(cygpath -m /tmp)/site-links.txt"'
echo "== scenario 5: offline"
run 5 "offline" node docs-src/site-checks/offline.js
echo "== scenario 6: no horizontal scroll"
run 6 "overflow at 320/375/768/1280 px, both themes" node docs-src/site-checks/overflow.js
echo "== scenario 7: keyboard"
run 7 "keyboard (6 actions and edge cases)" node docs-src/site-checks/keyboard.js
echo "== scenario 8: search"
run 8 "search and contents clicks" node docs-src/site-checks/search.js
echo "== scenario 9: look review"
run 9 "look review against the reference post" node docs-src/site-checks/look-review.js
echo "== scenario 10: secret scan and checksums"
run 10 "secret scan and checksum verify" bash -c 'bash lab/env/secret-scan.sh && bash lab/env/checksums.sh verify'
echo "== extras from the plan"
run 11 "contrast and page structure" node docs-src/site-checks/contrast.js
run 12 "print style" node docs-src/site-checks/print.js
run 13 "size budgets" node docs-src/site-checks/sizes.js
if docker info >/dev/null 2>&1; then
  run 14 "build the JAR and inspect it (Maven in a container)" bash lab/experiments/build-jar.sh
else
  result 14 "build the JAR and inspect it" "NOT RUN (Docker is not available)"
fi

echo "== learning path (specs/003-end-to-end-learning-path/quickstart.md)"
run 15 "path lint, evidence, diagrams, java, values" bash -c 'node docs-src/site-checks/path-lint.js && node docs-src/site-checks/path-evidence.js && node docs-src/site-checks/path-diagrams.js && node docs-src/site-checks/path-java.js && node docs-src/site-checks/path-env.js'
run 16 "existing pages unchanged" node docs-src/site-checks/site-unchanged.js
run 17 "progress (marks, counts, blocked storage)" node docs-src/site-checks/path-progress.js

echo
echo "SUMMARY: 17 scenarios, $fails failed, $(( $(date +%s) - t0 )) s"
exit $(( fails > 0 ))
