#!/usr/bin/env bash
# Run a listener of your own in place of the connector, so the real ASE RepAgent talks to your code.
# Usage: run-listener-live.sh <jar relative to the repository root> <main class> [--wait-for <text>] [--also-rollback] [--second-row] [--settle <seconds>] [-- <args for the class>]
#   e.g. run-listener-live.sh lab/solutions/01-listener/target/cdc-lab-01-listener-0.1.0.jar com.phoenix.cdc.lab.Increment1Main --wait-for "[inc1] LTL"
#
# What it does: stops the connector (a stopped connector frees port 11752; a paused one does not), copies the jar into the
# Connect container, starts the class there, writes one tagged row as cdc_app so the RepAgent has something to send,
# waits for --wait-for to appear in the listener's output (up to 120 s; @TAG@ in the text stands for the row tag, so
# --wait-for "account_no=@TAG@-1" waits for the row it wrote), prints the first lines of the output and every line that
# mentions the tag (the RepAgent first replays older changes), then ALWAYS stops the listener
# and resumes the connector. Rows the listener saw are still delivered later by the connector (evidence 34).
# --also-rollback first writes a row (TAG-RB) inside a transaction that is rolled back, then the committed row (TAG-1).
# --second-row then writes a second committed row (TAG-2) in its own transaction after TAG-1.
# --settle waits that many extra seconds after --wait-for was found before printing (default 2).
# Exit code: 0 the listener ran and the text appeared, 1 otherwise, 2 bad arguments.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$HERE/_common.sh"

jar=${1:?usage: run-listener-live.sh <jar> <main class> [--wait-for <text>] [-- <class args>]}; main=${2:?main class}; shift 2
wait_text=""; class_args=(); also_rollback=0; second_row=0; settle=2
while [ $# -gt 0 ]; do
  case "$1" in
    --wait-for) wait_text=${2:?--wait-for needs text}; shift 2 ;;
    --also-rollback) also_rollback=1; shift ;;
    --second-row) second_row=1; shift ;;
    --settle) settle=${2:?--settle needs seconds}; [[ "$settle" =~ ^[0-9]+$ ]] || { echo "invalid --settle" >&2; exit 2; }; shift 2 ;;
    --) shift; class_args=("$@"); break ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
[[ "$jar" =~ ^[A-Za-z0-9._/-]+\.jar$ && "$jar" != *..* ]] || { echo "invalid jar path" >&2; exit 2; }
[[ "$main" =~ ^[A-Za-z0-9_.]+$ ]] || { echo "invalid main class" >&2; exit 2; }
for a in "${class_args[@]:-}"; do [[ -z "$a" || "$a" =~ ^[A-Za-z0-9_.:/-]+$ ]] || { echo "invalid class argument" >&2; exit 2; }; done
[ -f "$LAB_ROOT/$jar" ] || { echo "jar not found: $jar (build it first, for example with lab/env/mvn.sh <module> package)" >&2; exit 2; }

U="$CONNECT_URL/connectors/$CONNECTOR_NAME"
TAG=LIVE$(date +%H%M%S)
cleanup() {
  docker exec "$CONNECT" sh -c 'for p in $(ps -ef | grep "[l]ive-listener.jar" | awk "{print \$2}"); do kill $p; done' >/dev/null 2>&1
  curl -fsS -X PUT "$U/resume" >/dev/null 2>&1
  wait_for "connector task RUNNING again" 90 bash -c "curl -fsS $U/status | grep -q '\"tasks\":\[{\"id\":0,\"state\":\"RUNNING\"'" >/dev/null
}
trap cleanup EXIT

curl -fsS -X PUT "$U/stop" >/dev/null || { echo "cannot stop the connector (is the lab running?)" >&2; exit 1; }
sleep 5
docker cp "$LAB_ROOT/$jar" "$CONNECT:/tmp/live-listener.jar" || { echo "cannot copy the jar" >&2; exit 1; }
docker exec "$CONNECT" sh -c 'rm -f /tmp/live-listener.log'
docker exec -d "$CONNECT" bash -c "java -cp '/opt/kafka/libs/*:/tmp/live-listener.jar' $main ${class_args[*]:-11752 rs_user rs_password} > /tmp/live-listener.log 2>&1"
sleep 4

running=$(docker exec "$CONNECT" sh -c 'ps -ef | grep -c "[l]ive-listener.jar"' | tr -d '\r')
if [ "${running:-0}" -lt 1 ]; then
  echo "== the listener did not stay running. Its output:"
  docker exec "$CONNECT" sh -c 'head -n 15 /tmp/live-listener.log' | cut -c1-200
  exit 1
fi

if [ "$also_rollback" -eq 1 ]; then
  ase_app >/dev/null <<SQL
begin tran
go
insert into payment (account_no, amount, currency) values ('$TAG-RB', 9, 'EUR')
go
rollback tran
go
SQL
fi
ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-1', 1, 'EUR')
go
SQL
if [ "$second_row" -eq 1 ]; then
  ase_app >/dev/null <<SQL
insert into payment (account_no, amount, currency) values ('$TAG-2', 2, 'EUR')
go
SQL
fi
found=1
wait_text=${wait_text//@TAG@/$TAG}
if [ -n "$wait_text" ]; then
  found=0
  for i in $(seq 1 40); do
    docker exec -e WANT="$wait_text" "$CONNECT" sh -c 'grep -qF -- "$WANT" /tmp/live-listener.log' 2>/dev/null && { found=1; break; }
    sleep 3
  done
fi
sleep "$settle"
echo "== listener output (tag $TAG), first lines:"
docker exec "$CONNECT" sh -c 'head -n 12 /tmp/live-listener.log' | cut -c1-1500
echo "== lines that mention $TAG:"
docker exec -e TAG="$TAG" "$CONNECT" sh -c 'grep -F -- "$TAG" /tmp/live-listener.log | head -n 10' | cut -c1-1500
echo "== output from the first mention of $TAG onward (up to 40 lines):"
docker exec -e TAG="$TAG" "$CONNECT" sh -c 'sed -n "/$TAG/,\$p" /tmp/live-listener.log | head -n 40' | cut -c1-1500
[ "$found" -eq 1 ] || { echo "== TIMEOUT: '$wait_text' never appeared in the listener output"; exit 1; }
exit 0
