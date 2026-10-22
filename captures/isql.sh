#!/usr/bin/env bash
# Run SQL text (stdin) against phoenix_test as sa.
export MSYS_NO_PATHCONV=1
docker exec -i cdc-sybase bash -c 'source /opt/sybase/SYBASE.sh; isql -Usa -PmyPassword -SMYSYBASE -w250 -Dphoenix_test' | grep -v "^\s*$"
