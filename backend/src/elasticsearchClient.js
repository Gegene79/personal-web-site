const { Client } = require("@elastic/elasticsearch");
const { elasticsearchUrl } = require("./config");

const client = new Client({ node: elasticsearchUrl });
const indexName = "sensor_readings";

async function ensureIndex() {
  const exists = await client.indices.exists({ index: indexName });
  if (!exists.body) {
    try {
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              sensor_id: { type: "keyword" },
              temperature: { type: "double" },
              humidity: { type: "double" },
              timestamp: { type: "date" }
            }
          }
        }
      });
    } catch (err) {
      // If another process created the index concurrently, ignore the error
      const errType = err && err.meta && err.meta.body && err.meta.body.error && err.meta.body.error.type;
      if (errType === 'resource_already_exists_exception') {
        return;
      }
      throw err;
    }
  }
}

async function createSensorReading(sensorId, temperature, humidity, timestamp = null) {
  await ensureIndex();

  const documentTimestamp = timestamp
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();

  await client.index({
    index: indexName,
    document: {
      sensor_id: sensorId,
      temperature,
      humidity,
      timestamp: documentTimestamp
    }
  });
}

async function getLatestSensorReadings() {
  await ensureIndex();

  const result = await client.search({
    index: indexName,
    size: 0,
    aggs: {
      sensors: {
        terms: { field: "sensor_id", size: 20 },
        aggs: {
          latest: {
            top_hits: {
              sort: [{ timestamp: { order: "desc" } }],
              _source: { includes: ["sensor_id", "temperature", "humidity", "timestamp"] },
              size: 1
            }
          }
        }
      }
    }
  });

  return result.aggregations.sensors.buckets.map((bucket) => {
    const hit = bucket.latest.hits.hits[0]._source;
    return {
      sensorId: hit.sensor_id,
      temperature: hit.temperature,
      humidity: hit.humidity,
      timestamp: hit.timestamp
    };
  });
}

async function getSensorSeries(sensorId, hours = 24) {
  await ensureIndex();

  const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const result = await client.search({
    index: indexName,
    size: 100,
    sort: [{ timestamp: "asc" }],
    query: {
      bool: {
        must: [
          { term: { sensor_id: sensorId } },
          { range: { timestamp: { gte: from } } }
        ]
      }
    }
  });

  return result.hits.hits.map((hit) => ({
    temperature: hit._source.temperature,
    humidity: hit._source.humidity,
    timestamp: hit._source.timestamp
  }));
}

async function getAllSensorSeriesWithPreviousDay() {
  await ensureIndex();

  // Get all latest readings to find all unique sensors
  const latestResult = await client.search({
    index: indexName,
    size: 0,
    aggs: {
      sensors: {
        terms: { field: "sensor_id", size: 20 }
      }
    }
  });

  const sensorIds = latestResult.aggregations.sensors.buckets.map(b => b.key);

  // For each sensor, get last 48 hours of data
  const result = {};
  
  for (const sensorId of sensorIds) {
    const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const data = await client.search({
      index: indexName,
      size: 1000,
      sort: [{ timestamp: "asc" }],
      query: {
        bool: {
          must: [
            { term: { sensor_id: sensorId } },
            { range: { timestamp: { gte: from } } }
          ]
        }
      }
    });

    result[sensorId] = data.hits.hits.map((hit) => ({
      temperature: hit._source.temperature,
      humidity: hit._source.humidity,
      timestamp: hit._source.timestamp,
      sensorId: hit._source.sensor_id
    }));
  }

  return result;
}

module.exports = { createSensorReading, getLatestSensorReadings, getSensorSeries, getAllSensorSeriesWithPreviousDay };
