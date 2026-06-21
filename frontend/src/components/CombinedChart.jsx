import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

// Color palette - vibrant for current day, pastel for previous day
const sensorColors = {
  "A1": { current: "#2563eb", previous: "#bfdbfe" }, // Blue
  "B2": { current: "#dc2626", previous: "#fecaca" }, // Red
  "C3": { current: "#16a34a", previous: "#bbf7d0" }, // Green
  "D4": { current: "#f59e0b", previous: "#fed7aa" }, // Amber
};

const aaemetColor = { current: "#7c3aed", previous: "#ddd6fe" }; // Purple

function getColorForSensor(sensorId, isCurrentDay) {
  const colors = sensorColors[sensorId] || { current: "#64748b", previous: "#cbd5e1" };
  return isCurrentDay ? colors.current : colors.previous;
}

function prepareCombinedData(sensors, aaemetData) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const intervalMs = 30 * 60 * 1000; // 30-minute grid

  const dataByTime = {};

  function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Always include every 30-minute bucket for the last 24 hours
  for (let time = oneDayAgo.getTime(); time <= now.getTime(); time += intervalMs) {
    const bucketDate = new Date(time);
    const bucketKey = bucketDate.toISOString();
    dataByTime[bucketKey] = {
      time: formatTime(bucketDate),
      timestamp: bucketDate
    };
  }

  function addSeriesPoint(key, reading, isPreviousDay) {
    const rawTimestamp = new Date(reading.timestamp);
    const shiftedTimestamp = isPreviousDay
      ? new Date(rawTimestamp.getTime() + 24 * 60 * 60 * 1000)
      : rawTimestamp;

    const timeKey = shiftedTimestamp.toISOString();

    if (!dataByTime[timeKey]) {
      dataByTime[timeKey] = {
        time: formatTime(shiftedTimestamp),
        timestamp: shiftedTimestamp
      };
    }

    dataByTime[timeKey][key] = reading.temperature;
  }

  // Process sensor data
  sensors.forEach(sensor => {
    (sensor.series || []).forEach(reading => {
      const timestamp = new Date(reading.timestamp);
      const isCurrentDay = timestamp > oneDayAgo && timestamp <= now;
      const isPreviousDay = timestamp > twoDaysAgo && timestamp <= oneDayAgo;

      if (!isCurrentDay && !isPreviousDay) {
        return;
      }

      const suffix = isPreviousDay ? "_prev" : "";
      addSeriesPoint(`${sensor.sensorId}${suffix}`, reading, isPreviousDay);
    });
  });

  // Process AEMET data if available
  if (aaemetData && Array.isArray(aaemetData)) {
    aaemetData.forEach(reading => {
      const timestamp = new Date(reading.timestamp || reading.time);
      const isCurrentDay = timestamp > oneDayAgo && timestamp <= now;
      const isPreviousDay = timestamp > twoDaysAgo && timestamp <= oneDayAgo;

      if (!isCurrentDay && !isPreviousDay) {
        return;
      }

      const suffix = isPreviousDay ? "_prev" : "";
      addSeriesPoint(`aemet${suffix}`, { ...reading, timestamp: timestamp.toISOString() }, isPreviousDay);
    });
  }

  const data = Object.values(dataByTime)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ timestamp, ...rest }) => rest);

  return data;
}

function CombinedChart({ sensors, aaemetData }) {
  const data = prepareCombinedData(sensors, aaemetData);
  const sensorIds = [...new Set(sensors.map(s => s.sensorId))].sort();
  const hourTicks = data.filter((item) => item.time.endsWith(":00")).map((item) => item.time);

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h2>Gráfico de Temperatura (24h + Histórico)</h2>
        <div className="status">No hay datos disponibles para mostrar</div>
      </div>
    );
  }

  return (
    <div className="card chart-card">
      <h2>Temperatura - Últimas 24 horas y Histórico</h2>
      <div style={{ height: 400, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <XAxis 
              dataKey="time" 
              stroke="#64748b"
              tick={{ fontSize: 12 }}
              interval={0}
              tickCount={24}
              ticks={hourTicks}
            />
            <YAxis 
              stroke="#64748b" 
              domain={["auto", "auto"]}
              label={{ value: "Temperatura (°C)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip 
              formatter={(value) => (value != null ? `${Number(value).toFixed(1)}°C` : "-")}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                border: "1px solid #475569",
                borderRadius: "4px",
                color: "#f1f5f9"
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              layout="vertical"
              align="right"
              verticalAlign="middle"
            />
            
            {/* Current day sensor lines */}
            {sensorIds.map(sensorId => (
              <Line 
                key={`${sensorId}-current`}
                type="monotone" 
                dataKey={sensorId}
                stroke={getColorForSensor(sensorId, true)}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
                name={`${sensorId} (Hoy)`}
              />
            ))}
            
            {/* Previous day sensor lines */}
            {sensorIds.map(sensorId => (
              <Line 
                key={`${sensorId}-previous`}
                type="monotone" 
                dataKey={`${sensorId}_prev`}
                stroke={getColorForSensor(sensorId, false)}
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
                name={`${sensorId} (Ayer)`}
              />
            ))}
            
            {/* Current day AEMET line */}
            <Line 
              type="monotone" 
              dataKey="aemet"
              stroke={aaemetColor.current}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={true}
              name="AEMET (Hoy)"
            />
            
            {/* Previous day AEMET line */}
            <Line 
              type="monotone" 
              dataKey="aemet_prev"
              stroke={aaemetColor.previous}
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
              connectNulls={true}
              name="AEMET (Ayer)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CombinedChart;
