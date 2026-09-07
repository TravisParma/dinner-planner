#!/bin/sh
set -e

echo "Running prisma migrate deploy against $DATABASE_URL..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
