#!/bin/bash

# Test Railway backend health endpoint
# Usage: ./test-railway-health.sh https://your-backend.up.railway.app

if [ -z "$1" ]; then
  echo "Usage: ./test-railway-health.sh <railway-backend-url>"
  echo "Example: ./test-railway-health.sh https://resumakr-backend-production-xxxx.up.railway.app"
  exit 1
fi

BACKEND_URL=$1

echo "Testing Railway backend health..."
echo "URL: $BACKEND_URL/api/health"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Backend is healthy!"
else
  echo "❌ Backend health check failed"
  exit 1
fi
