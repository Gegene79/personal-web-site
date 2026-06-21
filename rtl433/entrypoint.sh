#!/bin/sh
set -e

MQTT_BROKER_HOST=${MQTT_BROKER_HOST:-mqtt-broker}
MQTT_BROKER_PORT=${MQTT_BROKER_PORT:-1883}
MQTT_TOPIC_PREFIX=${MQTT_TOPIC_PREFIX:-sensor}
RTL433_OPTS=${RTL433_OPTS:-}
RETRY_DELAY=${RETRY_DELAY:-60}

run_rtl433() {
  echo "Starting rtl_433..."
  set +e
  rtl_433 -F log -F "mqtt://${MQTT_BROKER_HOST}:${MQTT_BROKER_PORT},retain=0,events=${MQTT_TOPIC_PREFIX}[/id]" ${RTL433_OPTS}
  status=$?
  set -e

  if [ $status -eq 0 ]; then
    echo "rtl_433 exited normally. Restarting in ${RETRY_DELAY}s..."
  else
    echo "rtl_433 failed with exit code ${status}. Waiting ${RETRY_DELAY}s before retry."
  fi
}

while true; do
  run_rtl433
  sleep "$RETRY_DELAY"
done
