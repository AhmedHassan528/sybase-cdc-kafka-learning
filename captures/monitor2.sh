#!/usr/bin/env bash
# Parallel 5-second samplers -> <outdir>/{ase,repagent,kafka,connector,stats}.csv until <outdir>/STOP exists.
# Log guard: if free log pages < 30% (9830 of 32768) write ALERT and create STOP. Never runs recovery commands.
export MSYS_NO_PATHCONV=1
OUT=$1; mkdir -p "$OUT"; rm -f "$OUT"/*.csv "$OUT"/STOP "$OUT"/ALERT
iso() { date +%H:%M:%S; }
ase() { echo "time,blocked,locks,log_free_pages,sec_trunc_page" > "$OUT/ase.csv"
  while [ ! -f "$OUT/STOP" ]; do t=$(iso)
    v=$(docker exec cdc-sybase bash -c 'source /opt/sybase/SYBASE.sh; isql -Usa -PmyPassword -SMYSYBASE -Dphoenix_test -i /tmp/t6-monitor.sql -b -w200' 2>/dev/null | head -1 | awk '{print $2","$3","$4","$5}')
    echo "$t,$v" >> "$OUT/ase.csv"; f=$(echo "$v" | cut -d, -f3)
    if [ -n "$f" ] && [ "$f" -lt 9830 ]; then echo "$t free log pages $f < 30%" > "$OUT/ALERT"; touch "$OUT/STOP"; fi
    sleep 5; done; }
repagent() { echo "time,state,current_marker" > "$OUT/repagent.csv"
  while [ ! -f "$OUT/STOP" ]; do t=$(iso)
    v=$(docker exec cdc-sybase bash -c "source /opt/sybase/SYBASE.sh; printf \"sp_help_rep_agent phoenix_test, 'process'\ngo\n\" | isql -Usa -PmyPassword -SMYSYBASE -Dphoenix_test -b -w250" 2>/dev/null | awk '$1=="phoenix_test"{print $(NF-2)","$5}' | head -1)
    echo "$t,$v" >> "$OUT/repagent.csv"; sleep 5; done; }
kafka() { echo "time,topic_end_offset" > "$OUT/kafka.csv"
  while [ ! -f "$OUT/STOP" ]; do t=$(iso)
    v=$(docker exec cdc-kafka /opt/kafka/bin/kafka-get-offsets.sh --bootstrap-server kafka:9092 --topic sybase.phoenix_test.payment 2>/dev/null | awk -F: '{s+=$3} END {print s}')
    echo "$t,$v" >> "$OUT/kafka.csv"; sleep 5; done; }
connector() { echo "time,task_state,errors_last_5s,connector_offset" > "$OUT/connector.csv"
  while [ ! -f "$OUT/STOP" ]; do t=$(iso)
    s=$(curl -s localhost:8083/connectors/sybase-cdc-phoenix/status | grep -o '"tasks":\[{"id":0,"state":"[A-Z]*"' | cut -d'"' -f8)
    e=$(docker logs cdc-connect --since 5s 2>&1 | grep -c " ERROR ")
    o=$(curl -s localhost:8083/connectors/sybase-cdc-phoenix/offsets | grep -o '"commit_oqid":"[0-9a-f]*"' | cut -d'"' -f4)
    echo "$t,${s:-NONE},$e,${o:-none}" >> "$OUT/connector.csv"; sleep 5; done; }
stats() { echo "time,container,cpu,mem" > "$OUT/stats.csv"
  while [ ! -f "$OUT/STOP" ]; do t=$(iso)
    docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' cdc-sybase cdc-connect cdc-kafka | sed "s|^|$t,|; s| / .*||" >> "$OUT/stats.csv"
    sleep 3; done; }
ase & repagent & kafka & connector & stats &
wait
