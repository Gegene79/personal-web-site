const express = require("express");
const cors = require("cors");
const { port } = require("./config");
const { startMqtt } = require("./mqttClient");
const { loadDummyData } = require("./dummyDataLoader");
const sensorsRouter = require("./routes/sensors");
const weatherRouter = require("./routes/weather");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/sensors", sensorsRouter);
app.use("/api/weather", weatherRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, async () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);

  // Start MQTT subscription first so it's ready to receive messages
  await startMqtt();

  // Load dummy sensor data at startup after MQTT subscription is ready
  await loadDummyData();
});
