import React from "react";
import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("checking...");
  const [historyState, setHistoryState] = useState({ loading: true, error: "", points: [] });

  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setStatus(data.status || "unknown");
        }
      } catch {
        if (isMounted) {
          setStatus("unreachable");
        }
      }
    }

    loadHealth();

    const timerId = setInterval(loadHealth, 5000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      try {
        const response = await fetch("/api/history/?hours=168&limit=1000");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          setHistoryState({
            loading: false,
            error: "",
            points: Array.isArray(data.points) ? data.points : [],
          });
        }
      } catch {
        if (isMounted) {
          setHistoryState({ loading: false, error: "history-unreachable", points: [] });
        }
      }
    }

    loadHistory();
    const timerId = setInterval(loadHistory, 60000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, []);

  const chart = buildChart(historyState.points);

  return (
    <main>
      <h1>Govee Frontend</h1>
      <p>Django backend health: {status}</p>
      <h2>History (last 7 days)</h2>
      {historyState.loading && <p>Loading history…</p>}
      {!historyState.loading && historyState.error && <p>History: {historyState.error}</p>}
      {!historyState.loading && !historyState.error && historyState.points.length === 0 && <p>No history data yet.</p>}
      {!historyState.loading && !historyState.error && historyState.points.length > 0 && (
        <section>
          <p>Points: {historyState.points.length}</p>
          <svg viewBox="0 0 700 240" role="img" aria-label="Temperature and humidity history chart">
            <polyline points={chart.temperatureLine} fill="none" stroke="#cc2936" strokeWidth="2" />
            <polyline points={chart.humidityLine} fill="none" stroke="#1f77b4" strokeWidth="2" />
          </svg>
          <p>Temp range: {chart.tempMin.toFixed(1)}°C → {chart.tempMax.toFixed(1)}°C</p>
          <p>Humidity range: {chart.humidityMin.toFixed(1)}% → {chart.humidityMax.toFixed(1)}%</p>
        </section>
      )}
    </main>
  );
}

function buildChart(points) {
  const width = 700;
  const height = 240;
  const padding = 16;

  if (!points.length) {
    return {
      temperatureLine: "",
      humidityLine: "",
      tempMin: 0,
      tempMax: 0,
      humidityMin: 0,
      humidityMax: 0,
    };
  }

  const temperatures = points.map((point) => Number(point.temperature_c));
  const humidities = points.map((point) => Number(point.humidity_pct));

  const tempMin = Math.min(...temperatures);
  const tempMax = Math.max(...temperatures);
  const humidityMin = Math.min(...humidities);
  const humidityMax = Math.max(...humidities);

  const xForIndex = (index) => {
    if (points.length === 1) {
      return width / 2;
    }
    const ratio = index / (points.length - 1);
    return padding + ratio * (width - padding * 2);
  };

  const yForValue = (value, min, max) => {
    if (max === min) {
      return height / 2;
    }
    const ratio = (value - min) / (max - min);
    return height - padding - ratio * (height - padding * 2);
  };

  const temperatureLine = points
    .map((point, index) => `${xForIndex(index)},${yForValue(Number(point.temperature_c), tempMin, tempMax)}`)
    .join(" ");

  const humidityLine = points
    .map((point, index) => `${xForIndex(index)},${yForValue(Number(point.humidity_pct), humidityMin, humidityMax)}`)
    .join(" ");

  return {
    temperatureLine,
    humidityLine,
    tempMin,
    tempMax,
    humidityMin,
    humidityMax,
  };
}
