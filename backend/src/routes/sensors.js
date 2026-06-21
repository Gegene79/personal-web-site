const express = require("express");
const { getLatestSensorReadings, getSensorSeries, getAllSensorSeriesWithPreviousDay } = require("../elasticsearchClient");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const sensors = await getLatestSensorReadings();
    const enriched = await Promise.all(
      sensors.map(async (sensor) => {
        const series = await getSensorSeries(sensor.sensorId, 12);
        return {
          ...sensor,
          series: series.map((item) => ({
            ...item,
            shortTime: new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }))
        };
      })
    );

    res.json({ sensors: enriched });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load sensors" });
  }
});

router.get("/combined", async (req, res) => {
  try {
    const latest = await getLatestSensorReadings();
    const allData = await getAllSensorSeriesWithPreviousDay();
    
    // Combine latest readings with historical data
    const sensors = latest.map(sensor => ({
      sensorId: sensor.sensorId,
      temperature: sensor.temperature,
      humidity: sensor.humidity,
      timestamp: sensor.timestamp,
      series: allData[sensor.sensorId] || []
    }));

    res.json({ sensors });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load combined sensor data" });
  }
});

router.get("/:sensorId/series", async (req, res) => {
  try {
    const { sensorId } = req.params;
    const hours = Number(req.query.hours) || 24;
    const series = await getSensorSeries(sensorId, hours);
    res.json({ sensorId, series });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load sensor series" });
  }
});

module.exports = router;
