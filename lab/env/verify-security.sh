#!/usr/bin/env bash
# Tests the security scope of the local lab (see "Security scope" in lab/README.md). Every check prints PASS or FAIL;
# the exit code is 1 if any check fails. Needs a running lab (start.sh) and the registered connector.
#   A. network exposure   B. least-privilege accounts   C. credentials   D. input handling   E. documented limits
# Evidence: docs/evidence/21-lab-security.txt
set -uo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"
cd "$LAB_ROOT"
pass=0; fail=0
ok()   { echo "PASS  $*"; pass=$((pass + 1)); }
bad()  { echo "FAIL  $*"; fail=$((fail + 1)); }
info() { echo "INFO  $*"; }
check() { local label=$1; shift; if "$@"; then ok "$label"; else bad "$label"; fi; }

q() { printf '%s\ngo\n' "$1"; }                                  # one SQL statement as a batch
run_as() { local who=$1 sql=$2 pw; case $who in admin) pw=$CDC_ADMIN_PASSWORD; who=cdc_admin;; app) pw=$CDC_APP_PASSWORD; who=cdc_app;; sa) pw=$SA_PASSWORD;; esac
           q "$sql" | ase_sql_as "$who" "$pw" 2>&1; }
has_error() { grep -qE 'Msg [0-9]+, Level (1[1-9]|2[0-9])' <<<"$1"; }
denied()    { grep -qiE 'permission denied|You must have (any of )?the following role|not authorized|You must be SA|Only the System Administrator|Only the owner of object|can only be GRANTed or REVOKEd by owner' <<<"$1"; }
expect_ok()     { local out; out=$(run_as "$1" "$3"); if ! has_error "$out"; then ok "$1 may: $2"; else bad "$1 may: $2"; echo "$out" | head -3 | sed 's/^/        /'; fi; }
expect_denied() { local out; out=$(run_as "$1" "$3"); if denied "$out"; then ok "$1 is refused: $2"; else bad "$1 is refused: $2"; echo "$out" | head -3 | sed 's/^/        /'; fi; }

echo "### A. Network exposure"
for c in cdc-lab-sybase cdc-lab-kafka cdc-lab-connect cdc-lab-kafka-ui; do
  ports=$(docker port "$c" 2>/dev/null)
  if [ -z "$ports" ]; then bad "$c publishes no port (unexpected)"; continue; fi
  if grep -vqE '^[0-9]+/tcp -> 127\.0\.0\.1:[0-9]+$' <<<"$ports"; then bad "$c has a port not bound to 127.0.0.1"; echo "$ports" | sed 's/^/        /'; else ok "$c: all published ports bound to 127.0.0.1 ($(tr '\n' ' ' <<<"$ports"))"; fi
done
check "LTL port 11752 is not published to the host" bash -c "! docker port cdc-lab-connect | grep -q 11752"
lan=$(powershell.exe -NoProfile -Command 'Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "172.*" } | Select-Object -First 1 -ExpandProperty IPAddress' | tr -d '\r')
tcp() { powershell.exe -NoProfile -Command "\$c = New-Object Net.Sockets.TcpClient; \$r = \$c.BeginConnect('$1', $2, \$null, \$null); if (\$r.AsyncWaitHandle.WaitOne(2500) -and \$c.Connected) { 'open' } else { 'closed' }" | tr -d '\r'; }
if [ -z "$lan" ]; then bad "no non-loopback IPv4 address found, cannot test reachability from the network side"; else
  info "host network address used for the reachability test: $lan"
  for p in 5000 8083 8080 29092; do
    check "port $p answers on 127.0.0.1"   test "$(tcp 127.0.0.1 $p)" = open
    check "port $p does NOT answer on $lan" test "$(tcp "$lan" $p)" = closed
  done
fi

echo; echo "### B. Least-privilege accounts"
run_as sa "if object_id('sec_probe') is not null drop table sec_probe" >/dev/null
run_as sa "create table sec_probe (id int)" >/dev/null
run_as sa "grant select on sec_probe to cdc_app" >/dev/null 2>&1
roles=$(run_as sa "select r.name from master..syslogins l, master..sysloginroles lr, master..syssrvroles r where l.name = 'cdc_admin' and l.suid = lr.suid and lr.srid = r.srid")
check "cdc_admin holds replication_role" grep -q replication_role <<<"$roles"
check "cdc_admin holds no other role (no sa_role, sso_role, oper_role)" bash -c "! grep -qE 'sa_role|sso_role|oper_role' <<<\"\$1\"" _ "$roles"
roles_app=$(run_as sa "select r.name from master..syslogins l, master..sysloginroles lr, master..syssrvroles r where l.name = 'cdc_app' and l.suid = lr.suid and lr.srid = r.srid")
check "cdc_app holds no role" test -z "$(grep -E '^ *[a-z_]+_role' <<<"$roles_app")"
echo "-- cdc_admin (replication_role only) -- needed by register-connector:"
expect_ok     admin "show RepAgent status (sp_help_rep_agent)"           "sp_help_rep_agent phoenix_test, 'process'"
expect_ok     admin "change a RepAgent setting (sp_config_rep_agent)"    "sp_config_rep_agent phoenix_test, 'retry timeout', '10'"
expect_ok     admin "stop the RepAgent (sp_stop_rep_agent)"              "sp_stop_rep_agent phoenix_test"
sleep 4
expect_ok     admin "start the RepAgent (sp_start_rep_agent)"            "sp_start_rep_agent phoenix_test"
expect_ok     admin "query a table's replication status (sp_setreptable payment)" "sp_setreptable payment"
echo "-- cdc_admin must not do anything else:"
expect_denied admin "select from a table"                                "select count(*) from payment"
expect_denied admin "insert into a table"                                "insert into payment (account_no, amount, currency) values ('SECTEST', 1, 'EUR')"
expect_denied admin "update a table"                                     "update payment set amount = 0 where account_no = 'SECTEST'"
expect_denied admin "delete from a table"                                "delete from payment where account_no = 'SECTEST'"
expect_denied admin "create a table"                                     "create table sec_admin_x (a int)"
expect_denied admin "drop a table"                                       "drop table sec_probe"
expect_denied admin "grant permissions"                                  "grant select on sec_probe to cdc_admin"
expect_denied admin "create a login"                                     "use master
go
create login sec_evil with password 'Zz9aaaaaaaaaaaa'"
expect_denied admin "change server configuration (sp_configure)"         "sp_configure 'number of locks', 50000"
expect_denied admin "shut the server down"                               "shutdown with nowait"
info "informational (not relied on): cdc_admin marking a table with sp_setreptable true -> $(run_as admin 'sp_setreptable sec_probe, true' | { grep -qE 'Msg [0-9]+, Level' && echo 'refused' || echo 'allowed'; })"
run_as sa "sp_setreptable sec_probe, false" >/dev/null 2>&1
echo "-- cdc_app (DML on the sample tables) -- needed by changes.sql and the experiments:"
expect_ok     app "select from payment"                                  "select count(*) from payment"
expect_ok     app "insert into payment"                                  "insert into payment (account_no, amount, currency) values ('SECTEST', 1, 'EUR')"
expect_ok     app "update payment"                                       "update payment set amount = 2 where account_no = 'SECTEST'"
expect_ok     app "delete from payment"                                  "delete from payment where account_no = 'SECTEST'"
echo "-- cdc_app must not do anything else:"
expect_denied app "see or administer the RepAgent (sp_help_rep_agent)"   "sp_help_rep_agent phoenix_test, 'process'"
expect_denied app "change a RepAgent setting"                            "sp_config_rep_agent phoenix_test, 'retry timeout', '60'"
expect_denied app "stop the RepAgent"                                    "sp_stop_rep_agent phoenix_test"
expect_denied app "start the RepAgent"                                   "sp_start_rep_agent phoenix_test"
expect_denied app "mark a table for replication"                         "sp_setreptable sec_probe, true"
expect_denied app "create a table"                                       "create table sec_app_x (a int)"
expect_denied app "drop a table"                                         "drop table sec_probe"
expect_denied app "truncate a table"                                     "truncate table payment"
expect_denied app "modify a table it has only select on (sec_probe)"     "insert into sec_probe values (1)"
expect_denied app "grant permissions"                                    "grant all on payment to cdc_app"
expect_denied app "create a login"                                       "use master
go
create login sec_evil with password 'Zz9aaaaaaaaaaaa'"
expect_denied app "shut the server down"                                 "shutdown with nowait"
check "payment table and sec_probe still exist after the refused attempts" bash -c "! grep -q 'not found' <<<\"\$1\"" _ "$(run_as sa 'select count(*) from payment select count(*) from sec_probe')"
check "no rogue login was created" test "$(run_as sa "select count(*) from master..syslogins where name = 'sec_evil'" | grep -E '^ +[0-9]+ *$' | tr -d ' ')" = 0
run_as sa "drop table sec_probe" >/dev/null
check "the RepAgent is running after the stop/start test" bash -c "grep -q sleeping <<<\"\$1\"" _ "$(run_as admin "sp_help_rep_agent phoenix_test, 'process'")"
echo "-- where sa is used by the scripts (must be setup only):"
sa_users=$(grep -lE '\base_sql\b' lab/env/*.sh lab/experiments/*.sh 2>/dev/null | grep -v -e '_common.sh' -e 'verify-security.sh' | xargs -n1 basename | sort | tr '\n' ' ')
info "scripts calling ase_sql (sa): $sa_users"
check "sa is used only by setup scripts" test "$sa_users" = "create-accounts.sh data-types.sh key-change-update.sh sample-data.sh "

echo; echo "### C. Credentials"
check "lab/env/.lab-secrets exists"                          test -s lab/env/.lab-secrets
check ".lab-secrets is git-ignored"                          git check-ignore -q lab/env/.lab-secrets
check ".lab-secrets is not tracked by git"                   bash -c "! git ls-files --error-unmatch lab/env/.lab-secrets >/dev/null 2>&1"
for pw in "$CDC_ADMIN_PASSWORD" "$CDC_APP_PASSWORD"; do
  check "a generated password appears in no tracked file"      bash -c "! git grep -qF -- \"\$1\"" _ "$pw"
  check "a generated password appears in no file of the working tree except .lab-secrets" bash -c "! grep -rIlF --exclude=.lab-secrets --exclude-dir=.git --exclude-dir=node_modules -- \"\$1\" ." _ "$pw"
  check "a generated password appears nowhere in git history" test -z "$(git log --all --oneline -S"$pw" 2>/dev/null)"
done
check "secret scan finds no unlabelled secret"               bash lab/env/secret-scan.sh
info "fixed public test values in tracked files (documented exception): $(git grep -lE 'rs_password|myPassword' -- . ':!docs' ':!specs' ':!lab/README.md' | tr '\n' ' ')"

echo; echo "### D. Input handling"
rm -f /tmp/pwn_marker
check "set-tables.sh rejects shell/JSON metacharacters"     bash -c "! bash lab/env/set-tables.sh 'payment; touch /tmp/pwn_marker' 2>/dev/null; test ! -e /tmp/pwn_marker"
check "set-tables.sh rejects a quote"                       bash -c "! bash lab/env/set-tables.sh 'a\"b' 2>/dev/null"
check "set-tables.sh rejects spaces"                        bash -c "! bash lab/env/set-tables.sh 'payment customer' 2>/dev/null"
check "set-tables.sh rejects an empty item"                 bash -c "! bash lab/env/set-tables.sh 'payment,,customer' 2>/dev/null"
cur=$(curl -fsS "$CONNECT_URL/connectors/$CONNECTOR_NAME/config" | sed -E 's/.*"table.include.list":"([^"]*)".*/\1/')
check "set-tables.sh accepts a valid list (unchanged list is a no-op)" bash lab/env/set-tables.sh "$cur"
check "consume.sh rejects command substitution in the topic" bash -c "! bash lab/env/consume.sh 'x\$(touch /tmp/pwn_marker)' 2>/dev/null; test ! -e /tmp/pwn_marker"
check "consume.sh rejects a non-numeric timeout"            bash -c "! bash lab/env/consume.sh sybase.phoenix_test.payment '5; id' 2>/dev/null"
check "await-event.sh rejects a bad topic"                  bash -c "! bash lab/env/await-event.sh 'a b' x 5 2>/dev/null"
check "await-event.sh rejects a non-numeric timeout"        bash -c "! bash lab/env/await-event.sh sybase.phoenix_test.payment x '5 && id' 2>/dev/null"
bash lab/env/await-event.sh sybase.phoenix_test.payment "x'; drop table payment; --" 6 >/dev/null 2>&1
check "SQL-looking text given to await-event.sh is matched literally (payment table still there)" bash -c "! grep -q 'not found' <<<\"\$1\"" _ "$(run_as app 'select count(*) from payment')"
check "create-accounts.sh can be run again without error (idempotent)" bash lab/env/create-accounts.sh
check "no script builds SQL from a command-line argument"   bash -c "! grep -nE 'ase_(sql|app|admin).*\\\$[1@*]|<<SQL.*\\\$[1@*]' lab/env/*.sh lab/experiments/*.sh"

echo; echo "### E. Documented limits (TLS/SASL not performed; no production claim)"
check "compose uses only PLAINTEXT listeners and sets no TLS/SASL options" bash -c "! grep -qiE 'KAFKA_SSL|KAFKA_SASL|SASL_|SSL://' lab/env/docker-compose.yml && grep -q 'PLAINTEXT:PLAINTEXT' lab/env/docker-compose.yml"
check "lab/README.md states TLS/SASL were not performed/tested" bash -c "grep -qE 'TLS / SASL.*Not performed' lab/README.md && grep -qE 'not tested' lab/README.md"
check "lab/README.md states it is not a production deployment" grep -q "not a production deployment" lab/README.md
check "plan.md records the TLS/SASL exception"             grep -qE 'TLS/SASL.*not (run|performed|tested)|not (run|performed|tested).*TLS/SASL' specs/001-cdc-learning-project/plan.md
check "no document claims the lab meets production security" bash -c "! grep -rniE '(is|are|meets|provides) production[- ]?(ready|grade|secure|security)' lab/README.md specs/001-cdc-learning-project/*.md docs-src/article"

echo; echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
