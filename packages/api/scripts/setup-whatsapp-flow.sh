#!/usr/bin/env bash
# One-time setup for the court-booking WhatsApp Flow. Reads credentials
# from packages/api/.env so nothing secret has to be typed into chat or
# passed as a command-line argument. See docs/app/features/court-booking-flow.md
# for what each step does and why.
set -euo pipefail

cd "$(dirname "$0")/.." # -> packages/api

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing packages/api/$ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

WABA_ID="${WHATSAPP_WABA_ID:-${WABA_ID:-}}"

: "${WHATSAPP_ACCESS_TOKEN:?WHATSAPP_ACCESS_TOKEN not set in .env}"
: "${WHATSAPP_PHONE_NUMBER_ID:?WHATSAPP_PHONE_NUMBER_ID not set in .env}"
if [ -z "$WABA_ID" ]; then
  echo "WABA_ID not found — set WHATSAPP_WABA_ID (or WABA_ID) in .env" >&2
  exit 1
fi

API_VERSION="v20.0"
FLOW_NAME="Rezervare Teren Tenis Tineretului"
FLOW_JSON="src/modules/booking/booking.flow.json"
PUBLIC_KEY="flow_public.pem"
ENDPOINT_URI="${WHATSAPP_FLOW_ENDPOINT_URI:-https://tennis-bot-3cyi.onrender.com/flow}"

if [ ! -f "$PUBLIC_KEY" ]; then
  echo "Missing $PUBLIC_KEY in packages/api/ — generate it first:" >&2
  echo "  openssl genrsa -out flow_private.pem 2048" >&2
  echo "  openssl rsa -in flow_private.pem -pubout -out flow_public.pem" >&2
  exit 1
fi
if [ ! -f "$FLOW_JSON" ]; then
  echo "Missing $FLOW_JSON" >&2
  exit 1
fi

echo "Endpoint URI for the flow: $ENDPOINT_URI"
echo "(override by setting WHATSAPP_FLOW_ENDPOINT_URI in .env if this is wrong)"
echo

echo "== 1/4: setting the business public key on the phone number =="
curl -sS -X POST "https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/whatsapp_business_encryption" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -F "business_public_key=$(cat "$PUBLIC_KEY")"
echo
echo

echo "== 2/4: creating the flow =="
CREATE_RESPONSE=$(curl -sS -X POST "https://graph.facebook.com/${API_VERSION}/${WABA_ID}/flows" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${FLOW_NAME}\", \"categories\": [\"APPOINTMENT_BOOKING\"], \"endpoint_uri\": \"${ENDPOINT_URI}\"}")
echo "$CREATE_RESPONSE"
echo

FLOW_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id"[[:space:]]*:[[:space:]]*"[0-9]*"' | head -1 | grep -o '[0-9]*')

if [ -z "$FLOW_ID" ]; then
  echo "Could not find a flow id in the response above — fix the error and re-run." >&2
  exit 1
fi
echo "Flow id: $FLOW_ID"
echo

echo "== 3/4: uploading booking.flow.json as the flow's asset =="
curl -sS -X POST "https://graph.facebook.com/${API_VERSION}/${FLOW_ID}/assets" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -F "name=flow.json" \
  -F "asset_type=FLOW_JSON" \
  -F "file=@${FLOW_JSON};type=application/json"
echo
echo

echo "== 4/4: publishing the flow =="
curl -sS -X POST "https://graph.facebook.com/${API_VERSION}/${FLOW_ID}/publish" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}"
echo
echo

echo "Done. Add this to packages/api/.env and to Render's env vars:"
echo "WHATSAPP_FLOW_ID=${FLOW_ID}"
