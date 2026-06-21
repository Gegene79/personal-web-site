import { useEffect, useState } from "react";
import SensorCard from "./components/SensorCard";
import WeatherCard from "./components/WeatherCard";
import CombinedChart from "./components/CombinedChart";

function App() {
  const [sensors, setSensors] = useState([]);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [aaemetHistory, setAaemetHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [sensorRes, currentRes, forecastRes, historyRes] = await Promise.all([
          fetch(`/api/sensors/combined`),
          fetch(`/api/weather/current`),
          fetch(`/api/weather/forecast`),
          fetch(`/api/weather/history`).catch(() => null) // History might not exist yet
        ]);

        if (!sensorRes.ok || !currentRes.ok || !forecastRes.ok) {
          throw new Error("Error loading data from backend");
        }

        const sensorData = await sensorRes.json();
        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        const historyData = historyRes && historyRes.ok ? await historyRes.json() : { history: [] };

        setSensors(sensorData.sensors || []);
        setCurrentWeather(currentData);
        setForecast(forecastData.forecast || []);
        setAaemetHistory(historyData.history || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Home</h1>
          <p>Temperatura y humedad de sensores locales, con previsión AEMET</p>
        </div>
      </header>

      <main>
        {/* Current weather and forecast */}
        <section className="dashboard-cards">
          <WeatherCard currentWeather={currentWeather} forecast={forecast} />
        </section>

        {/* Sensor cards - latest readings */}
        <section className="sensor-grid">
          {loading && <div className="status">Cargando datos...</div>}
          {error && <div className="status error">{error}</div>}
          {sensors.map((sensor) => (
            <SensorCard key={sensor.sensorId} sensor={sensor} />
          ))}
          {!loading && !error && sensors.length === 0 && (
            <div className="status">No hay sensores disponibles todavía.</div>
          )}
        </section>

        {/* Combined chart - all sensor history + AEMET */}
        <section className="chart-section">
          {loading ? (
            <div className="status">Cargando gráfico...</div>
          ) : (
            <CombinedChart sensors={sensors} aaemetData={aaemetHistory} />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
