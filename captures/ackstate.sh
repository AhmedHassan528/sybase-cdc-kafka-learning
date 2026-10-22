#!/usr/bin/env bash
# One line: ASE secondary truncation page | last OQID RepAgent got from us (trace 9202) | last Connect offset commit
export MSYS_NO_PATHCONV=1
p=$(docker exec cdc-sybase bash -c "source /opt/sybase/SYBASE.sh; isql -Usa -PmyPassword -SMYSYBASE -b -i /tmp/truncpage.sql" 2>/dev/null | tr -d " " | head -1)
r=$(docker exec cdc-sybase sh -c 'grep "OQID:" /tmp/repagent_trace.log | tail -1' | awk '{print substr($NF,17,24)}')
rc=$(docker exec cdc-sybase sh -c 'grep -c "RS sent" /tmp/repagent_trace.log')
o=$(docker exec cdc-kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic _connect-offsets --from-beginning --timeout-ms 4000 2>/dev/null | tail -1 | cut -c33-56)
echo "$(date +%T) sec_trunc_page=$p  truncation_sent_to_RepAgent(#$rc)=..${r}..  connect_offset=..${o}.."
