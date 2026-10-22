#!/bin/bash
# Custom entrypoint for datagrip/sybase (ASE 16.0 SP02).
# Runs dataserver with READ_IMPLIES_EXEC (via rie_shim.so, see rie_shim.c): on newer kernels (5.8+) the ASE 2015 binary's
# Snap JIT otherwise crashes at boot (SIGSEGV in Snap::Validate).
export SYBASE=/opt/sybase
source /opt/sybase/SYBASE.sh
SA_PWD=${SYBASE_PASSWORD:-myPassword}
ISQL="/opt/sybase/OCS-16_0/bin/isql -Usa -P$SA_PWD -SMYSYBASE -w300"

# MALLOC_ARENA_MAX=1 + no ASLR keep RepAgent allocations near ASE shared memory (avoids a crash in
# ra_free_mempool when a RepAgent thread shuts down on this build).
MALLOC_ARENA_MAX=1 LD_PRELOAD=/scripts/rie_shim.so setarch x86_64 -R sh /opt/sybase/ASE-16_0/install/RUN_MYSYBASE > /dev/null 2>&1 &

# Interfaces entry for our connector acting as a Replication Server (RepAgent connects here)
grep -q "^CDC_RS" /opt/sybase/interfaces || printf "
CDC_RS
	master tcp ether connect 11752
	query tcp ether connect 11752
" >> /opt/sybase/interfaces

echo "Waiting for ASE to accept logins..."
until echo -e "select 1\ngo" | $ISQL >/dev/null 2>&1; do
  if ! pgrep -f dataserver >/dev/null; then echo "dataserver died; tail of errorlog:"; tail -40 /opt/sybase/ASE-16_0/install/MYSYBASE.log; exit 1; fi
  sleep 2
done
echo "=============== SYBASE STARTED ==============="

if [ ! -f /opt/sybase/data/.cdc_initialised ]; then
  echo "=============== INIT (first boot) ==============="
  for f in /scripts/*.sql; do echo "--> $f"; $ISQL -i "$f"; done
  touch /opt/sybase/data/.cdc_initialised
fi
echo "=============== READY ==============="

trap "echo shutting down; echo -e 'shutdown with nowait\ngo' | $ISQL; exit 0" INT TERM
# Exit when dataserver dies so Docker restarts the container (restart: unless-stopped).
while pgrep -f bin/dataserver >/dev/null; do sleep 2; done
echo "dataserver exited; tail of errorlog:"; tail -40 /opt/sybase/ASE-16_0/install/MYSYBASE.log
exit 1
