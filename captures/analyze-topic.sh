#!/usr/bin/env bash
# Usage: analyze-topic.sh <account prefix> [start offset] [max messages]
# Summary of CDC events for that prefix, computed inside the Kafka container.
export MSYS_NO_PATHCONV=1
FROM=${2:-earliest}; MAX=${3:-}
ARGS="--partition 0 --offset $FROM"; [ -n "$MAX" ] && ARGS="$ARGS --max-messages $MAX"
docker exec cdc-kafka sh -c "/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic sybase.phoenix_test.payment $ARGS --timeout-ms 20000 2>/dev/null \
 | grep '\"account_no\":\"$1' \
 | awk -F'\"' '{for(i=1;i<NF;i++){ if(\$i==\"account_no\")a=\$(i+2); if(\$i==\"oqid\")o=\$(i+2); if(\$i==\"xid\")x=\$(i+2); if(\$i==\"op\")op=\$(i+2)}
     match(\$0, /\"txn_rows\":[0-9]+/); tr=substr(\$0, RSTART+11, RLENGTH-11);
     ev++; if(!(a in A)){A[a]=1; na++} if(o in O) dup++; else O[o]=1; if(!(x in X)){X[x]=tr; nx++} T[tr]++; OP[op]++}
     END {printf \"events=%d distinct_rows=%d duplicate_oqids=%d distinct_xids=%d\n\", ev, na, dup+0, nx;
          for (t in T) printf \"  txn_rows=%s : %d events\n\", t, T[t]; for (p in OP) printf \"  op=%s : %d\n\", p, OP[p]}'"
