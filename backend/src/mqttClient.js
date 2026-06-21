const mqtt = require("mqtt");
const { mqttBrokerUrl } = require("./config");
const { createSensorReading } = require("./elasticsearchClient");

function parseSensorPayload(message) {
  const raw = message.toString();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (_) {
    payload = raw;
  }

  // Log the raw message to debug format
  console.debug("Raw MQTT payload:", raw);

  let temperatureValue = null;
  let humidityValue = null;
  let timestampValue = null;

  if (payload && typeof payload === "object") {
    // Direct level keys (including temperature_C from rtl_433)
    temperatureValue = payload.temperature ?? payload.temp ?? payload.Temperature ?? payload.Temp ?? payload.temperature_C ?? payload.temperature_F;
    humidityValue = payload.humidity ?? payload.hum ?? payload.Humidity ?? payload.Hum;
    timestampValue = payload.time ?? payload.timestamp ?? payload.date ?? payload.datetime ?? payload.ts;

    // If not found at root, search in nested 'data' or other common containers
    if (!temperatureValue && payload.data && typeof payload.data === "object") {
      temperatureValue = payload.data.temperature ?? payload.data.temp ?? payload.data.Temperature ?? payload.data.Temp;
    }
    if (!humidityValue && payload.data && typeof payload.data === "object") {
      humidityValue = payload.data.humidity ?? payload.data.hum ?? payload.data.Humidity ?? payload.data.Hum;
    }
    if (!timestampValue && payload.data && typeof payload.data === "object") {
      timestampValue = payload.data.time ?? payload.data.timestamp ?? payload.data.date ?? payload.data.datetime ?? payload.data.ts;
    }

    // Log what we found
    console.debug("Parsed temperature:", temperatureValue, "humidity:", humidityValue, "timestamp:", timestampValue);
  }

  const temperature = temperatureValue != null
    ? Number(temperatureValue)
    : Number.isFinite(Number(raw))
      ? Number(raw)
      : null;

  const humidity = humidityValue != null
    ? Number(humidityValue)
    : null;

  let timestamp = null;
  if (timestampValue != null) {
    const parsed = new Date(timestampValue);
    if (!Number.isNaN(parsed.getTime())) {
      timestamp = parsed.toISOString();
    }
  }

  return { temperature, humidity, timestamp };
}

function startMqtt() {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(mqttBrokerUrl);

    client.on("connect", () => {
      console.log("Connected to MQTT broker", mqttBrokerUrl);
      client.subscribe("sensor/+", (err) => {
        if (err) {
          console.error("Failed to subscribe to sensor topics", err);
          reject(err);
          return;
        }
        resolve();
      });
    });

    client.on("message", async (topic, message) => {
      const fragments = topic.split("/");
      const sensorId = fragments[1] || "unknown";
      const { temperature, humidity, timestamp } = parseSensorPayload(message);

      if (temperature == null && humidity == null) {
        console.warn(`Skipping invalid payload for ${topic}: ${message.toString()}`);
        return;
      }

      try {
        await createSensorReading(sensorId, temperature, humidity, timestamp);
        console.log(`Stored reading from ${sensorId}: temp=${temperature} humidity=${humidity} timestamp=${timestamp || "now"}`);
      } catch (error) {
        console.error("Error storing sensor reading", error);
      }
    });

    client.on("error", (err) => {
      console.error("MQTT error", err);
      reject(err);
    });
  });
}

module.exports = { startMqtt };
