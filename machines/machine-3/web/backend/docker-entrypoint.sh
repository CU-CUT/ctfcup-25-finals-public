#!/bin/sh
set -e

# Apply schema and seed, then start API
npx prisma db push --accept-data-loss
npx ts-node --compiler-options '{"module":"commonjs"}' --transpile-only prisma/seed.ts
exec node dist/main.js
