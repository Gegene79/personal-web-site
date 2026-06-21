function SensorCard({ sensor }) {
  const now = new Date(sensor.timestamp).toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
  const humidityAvailable = sensor.humidity != null;

  return (
    <div className="card sensor-card-compact">
      <div className="sensor-header">
        <h3>{sensor.sensorId}</h3>
      </div>
      <div className="sensor-content">
        <div className="sensor-temp">
          {typeof sensor.temperature === "number" 
            ? `${sensor.temperature.toFixed(1)}°C` 
            : "N/A"}
        </div>
        {humidityAvailable && (
          <div className="sensor-humidity">
            {sensor.humidity.toFixed(1)}%
          </div>
        )}
      </div>
      <div className="sensor-time">
        {now}
      </div>
    </div>
  );
}

export default SensorCard;
