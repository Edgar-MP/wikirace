#!/bin/sh
set -e
node scripts/migrate.mjs
exec node dist/server/entry.mjs
