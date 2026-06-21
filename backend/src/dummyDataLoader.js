const { mqttBrokerUrl } = require("./config");
const mqtt = require("mqtt");

// NOTE: This loader now publishes MQTT messages to the broker so the
// backend can receive them via its MQTT subscription and process them
// end-to-end. To use it, start the backend (so it subscribes) and then
// call `loadDummyData()` (or uncomment the call in `index.js`) so the
// messages are published. A short delay is used between publishes to
// avoid overwhelming the broker.

const SENSOR_IDS = ["A1", "B2", "C3", "D4"];
const HOURS_PER_DAY = 24;
const DAYS = 3;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function generateDailyValues(baseTemp) {
  const values = [];
  for (let hour = 0; hour < HOURS_PER_DAY; hour += 1) {
    const variation = Math.sin((hour / 24) * Math.PI * 2) * 3;
    const jitter = randomBetween(-1.5, 1.5);
    values.push(Math.max(10, Math.min(30, baseTemp + variation + jitter)));
  }
  return values;
}

function generateDummyReadings() {
  const readings = [];
  const now = new Date();
  const totalHours = DAYS * HOURS_PER_DAY;
  const start = new Date(now);
  start.setMinutes(0, 0, 0, 0);
  start.setHours(start.getHours() - (totalHours - 1));

  SENSOR_IDS.forEach((sensorId, index) => {
    const baseTemp = 14 + index * 3;
    const dailyValues = [];

    for (let day = 0; day < DAYS; day += 1) {
      dailyValues.push(generateDailyValues(baseTemp + day * 0.5));
    }

    for (let i = 0; i < totalHours; i += 1) {
      const timestamp = new Date(start.getTime() + i * 60 * 60 * 1000);
      const day = Math.floor(i / HOURS_PER_DAY);
      const hourIndex = timestamp.getHours();
      const temperature = Number(dailyValues[day][hourIndex].toFixed(1));

      readings.push({
        sensorId,
        temperature,
        humidity: Number(randomBetween(25, 75).toFixed(1)),
        timestamp: timestamp.toISOString()
      });
    }
  });

  return readings;
}

async function publishReadingsViaMqtt() {
  console.log("Publishing dummy sensor data to MQTT broker...", mqttBrokerUrl);
  const client = mqtt.connect(mqttBrokerUrl);
  const readings = generateDummyReadings();

  await new Promise((resolve, reject) => {
    client.on("connect", async () => {
      try {
        // Publish sequentially with a small delay so the backend can process messages
        for (const reading of readings) {
          const topic = `sensor/${reading.sensorId}`;
          // Create a message similar to rtl_433 output
          const msg = JSON.stringify({
            time: reading.timestamp,
            model: "DummySensor",
            id: reading.sensorId,
            channel: 1,
            battery_ok: 1,
            temperature_C: reading.temperature,
            humidity: reading.humidity
          });

          client.publish(topic, msg, { qos: 0, retain: false });
          // small delay
          await new Promise((r) => setTimeout(r, 10));
        }

        // Give broker a moment then close
        setTimeout(() => {
          client.end(true, () => resolve());
        }, 200);
      } catch (err) {
        client.end(true, () => reject(err));
      }
    });

    client.on("error", (err) => {
      reject(err);
    });
  });

  console.log(`Published ${readings.length} dummy MQTT messages.`);
}

module.exports = { loadDummyData: publishReadingsViaMqtt };
