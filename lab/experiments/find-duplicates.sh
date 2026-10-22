#!/usr/bin/env bash
# Count events and duplicates on a topic for rows whose text contains a tag.
# Usage: find-duplicates.sh <topic> <tag>
# A duplicate is an event whose source.oqid appears more than once: the same change delivered again after a restart.
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../env/_common.sh"
topic=${1:?usage: find-duplicates.sh <topic> <tag>}; tag=${2:?usage: find-duplicates.sh <topic> <tag>}
[[ "$topic" =~ ^[A-Za-z0-9._-]+$ && "$tag" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "invalid topic or tag" >&2; exit 2; }

events=$(TOPIC=$topic "$LAB_ENV_DIR/consume.sh" "$topic" 6000 | grep -F "\"$tag"-)
[ -n "$events" ] || { echo "events with tag $tag: 0"; exit 1; }
total=$(printf '%s\n' "$events" | wc -l | tr -d ' ')
oqids=$(printf '%s\n' "$events" | grep -o '"oqid":"[0-9a-f]*"')
distinct=$(printf '%s\n' "$oqids" | sort -u | wc -l | tr -d ' ')
rows=$(printf '%s\n' "$events" | grep -oE "\"$tag-[0-9]+\"" | sort -u | wc -l | tr -d ' ')
echo "events with tag $tag: $total"
echo "distinct source.oqid: $distinct   (distinct rows by account_no: $rows)"
echo "duplicated events:    $((total - distinct))"
dups=$(printf '%s\n' "$oqids" | sort | uniq -c | awk '$1 > 1 {print "  seen " $1 "x  " $2}')
[ -n "$dups" ] && { echo "oqids seen more than once:"; echo "$dups"; }
exit 0
