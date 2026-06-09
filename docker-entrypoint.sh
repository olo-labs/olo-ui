#!/bin/sh
set -e

# Start olo-be in background (port 8082)
java -jar /app/olo-be.jar &

# Wait for backend to be ready
for i in 1 2 3 4 5 6 7 8 9 10; do
  if wget -q -O /dev/null http://127.0.0.1:8082/api/v1/health 2>/dev/null; then
    break
  fi
  sleep 1
done

# Start nginx in foreground (keeps container running)
exec nginx -g "daemon off;"
