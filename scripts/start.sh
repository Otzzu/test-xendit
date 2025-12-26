#!/bin/sh
set -e

if [ "$USE_POSTGRES" = "true" ]; then
  echo "Starting in PostgreSQL Mode"
  echo "Waiting for database..."
  echo "Running Migrations..."
  npx prisma migrate deploy
  echo "Seeding Database..."
  npx prisma db seed
else
  echo "Starting in In-Memory Mode (No database required)"
fi

echo "Starting Application..."
exec npm start