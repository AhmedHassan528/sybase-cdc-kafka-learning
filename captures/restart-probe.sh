#!/usr/bin/env bash
# Restart the LTL probe inside the Connect container (discovery mode).
export MSYS_NO_PATHCONV=1
docker exec cdc-connect sh -c 'pkill -f LtlProbe; sleep 1' || true
docker exec -d cdc-connect bash -c 'rm -rf /tmp/ltl-raw; java -Dltl.dump.dir=/tmp/ltl-raw -Dlog4j.configuration=file:/tmp/probe-log4j.properties -cp "/opt/kafka/libs/*:/opt/connectors/sybase-cdc/*" com.phoenix.cdc.sybase.tools.LtlProbe 11752 rs_user rs_password > /tmp/probe.log 2>&1'
sleep 2
