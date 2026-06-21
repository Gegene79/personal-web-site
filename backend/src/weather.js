const { aemetApiKey, aemetLocationCode } = require("./config");

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedCurrent = null;
let cachedForecast = null;

function buildFallbackWeather() {
  const now = new Date();
  return {
    temperature: 20.0,
    condition: "clear",
    station: "AEMET fallback",
    updatedAt: now.toISOString(),
    forecast: Array.from({ length: 6 }, (_, index) => {
      const hour = new Date(now.getTime() + index * 60 * 60 * 1000);
      return {
        hour: hour.toISOString(),
        temperature: 18 + index,
        condition: index < 2 ? "clear" : "partly-cloudy",
        icon: "sun",
      };
    })
  };
}

async function fetchAemetJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`AEMET request failed: ${response.status}`);
  }
  const result = await response.json();
  if (result && result.datos) {
    const dataResponse = await fetch(result.datos);
    return dataResponse.json();
  }
  return null;
}

async function getCurrentWeather() {
  if (cachedCurrent && Date.now() - cachedCurrent.fetchedAt < CACHE_TTL_MS) {
    return cachedCurrent.data;
  }

  if (!aemetApiKey || !aemetLocationCode) {
    const fallback = buildFallbackWeather();
    cachedCurrent = { fetchedAt: Date.now(), data: fallback };
    return fallback;
  }

  try {
    const apiUrl = `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${aemetLocationCode}?api_key=${aemetApiKey}`;
    const observations = await fetchAemetJson(apiUrl);
    const sample = Array.isArray(observations) ? observations[0] : null;

    const current = sample
      ? {
          temperature: Number(sample.temperatura) || 0,
          condition: sample.estadoCielo || "unknown",
          station: sample.nombre || "AEMET station",
          updatedAt: sample.fint || new Date().toISOString()
        }
      : buildFallbackWeather();

    cachedCurrent = { fetchedAt: Date.now(), data: current };
    return current;
  } catch (error) {
    console.warn("AEMET current weather failed", error.message);
    const fallback = buildFallbackWeather();
    cachedCurrent = { fetchedAt: Date.now(), data: fallback };
    return fallback;
  }
}

async function getHourlyForecast() {
  if (cachedForecast && Date.now() - cachedForecast.fetchedAt < CACHE_TTL_MS) {
    return cachedForecast.data;
  }

  if (!aemetApiKey || !aemetLocationCode) {
    const fallback = buildFallbackWeather();
    cachedForecast = { fetchedAt: Date.now(), data: fallback.forecast };
    return fallback.forecast;
  }

  try {
    const apiUrl = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${aemetLocationCode}?api_key=${aemetApiKey}`;
    const forecastPayload = await fetchAemetJson(apiUrl);
    const forecast = Array.isArray(forecastPayload)
      ? forecastPayload.slice(0, 6).map((item) => ({
          hour: item.fint || new Date().toISOString(),
          temperature: Number(item.temperature) || 0,
          condition: item.estadoCielo || "unknown",
          icon: "cloud"
        }))
      : buildFallbackWeather().forecast;

    cachedForecast = { fetchedAt: Date.now(), data: forecast };
    return forecast;
  } catch (error) {
    console.warn("AEMET forecast failed", error.message);
    const fallback = buildFallbackWeather();
    cachedForecast = { fetchedAt: Date.now(), data: fallback.forecast };
    return fallback.forecast;
  }
}

module.exports = { getCurrentWeather, getHourlyForecast };
