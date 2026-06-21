const dotenv = require("dotenv");
const path = require("path");

const rootEnv = path.resolve(__dirname, "../../.env");
dotenv.config({ path: rootEnv });

module.exports = {
  port: Number(process.env.PORT || 4000),
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || "mqtt://mqtt-broker:1883",
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || "http://elasticsearch:9200",
  aemetApiKey: process.env.AEMET_API_KEY || "",
  aemetLocationCode: process.env.AEMET_LOCATION_CODE || "",
};
