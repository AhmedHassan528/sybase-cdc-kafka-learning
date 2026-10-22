#!/usr/bin/env bash
# Samples every 5 s until <target> new Kafka events (or timeout). CSV to stdout.
# Log guard: stops with ALERT when free log pages < 30% (9830 of 32768). Never touches the log itself.
export MSYS_NO_PATHCONV=1
TARGET=$1; BASE=$2; LIMIT=${3:-1500}; START=$(date +%s)
echo "elapsed_s,ase_time,blocked,locks,log_free_pages,sec_trunc_page,repagent_state,kafka_new_events,connector_task,connect_errors,sybase_cpu,sybase_mem,connect_cpu,connect_mem,kafka_cpu,kafka_mem"
while true; do
  ase=$(docker exec cdc-sybase bash -c 'source /opt/sybase/SYBASE.sh; isql -Usa -PmyPassword -SMYSYBASE -Dphoenix_test -i /tmp/t6-monitor.sql -b -w200' 2>/dev/null | head -1 | awk '{print $1","$2","$3","$4","$5}')
  ra=$(docker exec cdc-sybase bash -c "source /opt/sybase/SYBASE.sh; printf \"sp_help_rep_agent phoenix_test, 'process'\ngo\n\" | isql -Usa -PmyPassword -SMYSYBASE -Dphoenix_test -b -w250" 2>/dev/null | awk '$1=="phoenix_test"{print $(NF-2)}' | head -1)
  k=$(docker exec cdc-kafka /opt/kafka/bin/kafka-get-offsets.sh --bootstrap-server kafka:9092 --topic sybase.phoenix_test.payment 2>/dev/null | awk -F: '{s+=$3} END {print s}')
  task=$(curl -s localhost:8083/connectors/sybase-cdc-phoenix/status | grep -o '"tasks":\[{"id":0,"state":"[A-Z]*"' | cut -d'"' -f8)
  errs=$(docker logs cdc-connect --since "${START}" 2>&1 | grep -c " ERROR ")
  st=$(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' cdc-sybase cdc-connect cdc-kafka | awk '{m[$1]=$2","$3} END {print m["cdc-sybase"]","m["cdc-connect"]","m["cdc-kafka"]}')
  now=$(date +%s); echo "$((now-START)),$ase,$ra,$((k-BASE)),$task,$errs,$st"
  free=$(echo "$ase" | cut -d, -f4)
  if [ -n "$free" ] && [ "$free" -lt 9830 ]; then echo "ALERT: free log pages $free < 30% - stopping monitor, NO recovery commands run"; break; fi
  [ $((k-BASE)) -ge "$TARGET" ] && break
  [ $((now-START)) -gt "$LIMIT" ] && { echo "TIMEOUT"; break; }
  sleep 5
done
