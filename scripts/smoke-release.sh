#!/usr/bin/env bash
set -euo pipefail

bundle=$(cd "$1" && pwd)
binary=$2
cd "$bundle"

GRINDFESTA_NO_OPEN=1 "./$binary" >engine.log 2>&1 &
engine_pid=$!

cleanup() {
  kill "$engine_pid" 2>/dev/null || true
  wait "$engine_pid" 2>/dev/null || true
  rm -f db db-shm db-wal engine.log
  rmdir projects 2>/dev/null || true
}
trap cleanup EXIT

for attempt in {1..60}; do
  if curl --fail --silent http://localhost:9002/health >/dev/null; then
    break
  fi
  sleep 0.5
done

if ! curl --fail --silent http://localhost:9002/health | grep --quiet '^ok$'; then
  cat engine.log
  exit 1
fi
if ! curl --fail --silent http://localhost:9002/ | grep --quiet '<title>Grindfesta Engine</title>'; then
  cat engine.log
  exit 1
fi
