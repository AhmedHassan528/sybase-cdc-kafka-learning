#!/usr/bin/env bash
# Check that every image the lab uses is pinned by digest, that the digest still resolves in the registry
# (needs internet; skipped with a notice when offline), and that the local copy has the same digest.
# Usage: verify-images.sh        Exit code 1 if a pin is missing or does not match.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
cd "$LAB_ROOT"

refs=$(grep -hE '^\s*image: [^ ]+@sha256:|^FROM [^ ]+@sha256:' lab/env/docker-compose.yml deploy/docker/Dockerfile.connect \
       | sed -E 's/^\s*image: //; s/^FROM //; s/ .*//' | sort -u)
unpinned=$(grep -hE '^\s*image: ' lab/env/docker-compose.yml | grep -v '@sha256:' | grep -v 'sybase-cdc-connect:' || true)
[ -n "$unpinned" ] && { echo "NOT PINNED BY DIGEST:"; echo "$unpinned"; }

fail=0
for ref in $refs; do
  name=${ref%@*}; digest=${ref#*@}
  echo "== $ref"
  reg=$(docker buildx imagetools inspect "$ref" 2>/dev/null | sed -n 's/^Digest: *//p' | head -1)
  if [ -z "$reg" ]; then
    # The digest did not resolve. Tell "registry unreachable" apart from "digest does not exist" by looking up the name alone.
    if docker buildx imagetools inspect "$name" >/dev/null 2>&1; then echo "   registry: DIGEST NOT FOUND (the registry answers for $name but not for this digest)"; fail=1
    else echo "   registry: not reachable (offline?) - skipped"; fi
  elif [ "$reg" = "$digest" ]; then echo "   registry: digest resolves ($reg)"
  else echo "   registry: MISMATCH $reg"; fail=1; fi
  local_digest=$(docker image inspect "$ref" --format '{{index .RepoDigests 0}}' 2>/dev/null)
  if [ -z "$local_digest" ]; then echo "   local: not pulled yet"
  elif [ "${local_digest#*@}" = "$digest" ]; then echo "   local: same digest ($local_digest)"
  else echo "   local: MISMATCH $local_digest"; fail=1; fi
  if [ "$name" != "${name%:*}" ]; then
    tag=${name##*:}; tag_digest=$(docker buildx imagetools inspect "$name" 2>/dev/null | sed -n 's/^Digest: *//p' | head -1)
    [ -n "$tag_digest" ] && { [ "$tag_digest" = "$digest" ] && echo "   tag $tag still points at this digest" || { echo "   tag $tag now points at $tag_digest (pin is older)"; }; }
  fi
done
[ -n "$unpinned" ] && fail=1
exit $fail
