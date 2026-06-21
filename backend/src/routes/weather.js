const express = require("express");
const { getCurrentWeather, getHourlyForecast } = require("../weather");

const router = express.Router();

router.get("/current", async (req, res) => {
  try {
    const current = await getCurrentWeather();
    res.json(current);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load weather" });
  }
});

router.get("/forecast", async (req, res) => {
  try {
    const forecast = await getHourlyForecast();
    res.json({ forecast });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load forecast" });
  }
});

router.get("/history", async (req, res) => {
  try {
    // TODO: Implement AEMET historical data storage and retrieval
    // For now, return empty array
    res.json({ history: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load weather history" });
  }
});

module.exports = router;
