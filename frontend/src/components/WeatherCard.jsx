function getWeatherIcon(condition) {
  const map = {
    clear: "☀️",
    partly_cloudy: "⛅",
    cloudy: "☁️",
    rain: "🌧️",
    storm: "⛈️",
    snow: "❄️",
    unknown: "🌤️"
  };
  return map[condition] || "🌤️";
}

function formatHour(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function WeatherCard({ currentWeather, forecast }) {
  if (!currentWeather) {
    return (
      <div className="card">
        <h2>Clima AEMET</h2>
        <div className="status">Cargando clima...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Clima AEMET</h2>
      <div className="weather-grid">
        <div className="weather-top">
          <div className="weather-state">
            <span className="weather-temperature">{currentWeather.temperature.toFixed(1)} °C</span>
            <span>{currentWeather.condition}</span>
            <span>Estación: {currentWeather.station}</span>
          </div>
          <div style={{ fontSize: 48 }}>
            {getWeatherIcon(currentWeather.condition.toLowerCase().replace(/\s+/g, "_"))}
          </div>
        </div>

        <div>
          <strong>Previsión próximas horas</strong>
          <div className="forecast-list">
            {forecast.length > 0 ? (
              forecast.map((item) => (
                <div className="forecast-item" key={item.hour}>
                  <span>{formatHour(item.hour)}</span>
                  <span>{getWeatherIcon(item.condition.toLowerCase().replace(/\s+/g, "_"))}</span>
                  <span>{item.temperature.toFixed(1)} °C</span>
                </div>
              ))
            ) : (
              <div className="status">No se encontró previsión.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeatherCard;
