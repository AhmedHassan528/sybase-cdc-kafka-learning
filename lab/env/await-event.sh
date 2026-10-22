#!/usr/bin/env bash
# Wait until a topic contains an event with the given text. Usage: await-event.sh <topic> <text> [timeout-seconds]
# Prints the matching events without the source block (set KEEP_SOURCE=1 to keep it); exits 1 on timeout.
# POLL_MS (default 5000): how long each look at the topic waits for more events; lower it to react faster.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
topic=$1; text=$2; limit=${3:-90}
# Input validation: a Kafka topic name and a number; the text is matched literally (grep -F), never run.
[[ "$topic" =~ ^[A-Za-z0-9._-]+$ && "$limit" =~ ^[0-9]+$ ]] || { echo "invalid topic or timeout" >&2; exit 2; }
t=0; [[ "${POLL_MS:-5000}" =~ ^[0-9]+$ ]] || { echo "invalid POLL_MS" >&2; exit 2; }
while [ $t -lt "$limit" ]; do
  hit=$(TOPIC=$topic "$LAB_ENV_DIR/consume.sh" "$topic" "${POLL_MS:-5000}" | grep -F "$text")
  if [ -n "$hit" ]; then
    if [ -n "${KEEP_SOURCE:-}" ]; then echo "$hit"; else echo "$hit" | sed -E 's/"source":\{[^}]*\},//'; fi
    exit 0
  fi
  t=$((t + 6))
done
echo "TIMEOUT: no event containing '$text' on $topic after ${limit}s" >&2
exit 1
