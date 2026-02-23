import React from "react";
import { Box, Paper, Stack, TextField, Typography } from "@mui/material";
import "./HistorySection.css";

export default function HistorySection({ historyState, chart, historyLimit, setHistoryLimit }) {
  const width = 700;
  const height = 240;
  const padding = 16;

  function handleLimitChange(event) {
    const nextValue = Number.parseInt(event.target.value, 10);
    if (Number.isNaN(nextValue)) {
      return;
    }
    setHistoryLimit(Math.max(1, Math.min(10000, nextValue)));
  }

  function renderAxes(minValue, maxValue, unitSuffix) {
    const tickCount = 4;
    const labels = [];

    for (let tick = 0; tick <= tickCount; tick += 1) {
      const ratio = tick / tickCount;
      const y = height - padding - ratio * (height - padding * 2);
      const value = minValue + ratio * (maxValue - minValue);
      labels.push(
        <g key={`tick-${unitSuffix}-${tick}`}>
          <line x1={padding - 4} y1={y} x2={padding} y2={y} stroke="currentColor" opacity="0.55" />
          <text x={padding - 8} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.75">
            {value.toFixed(1)}{unitSuffix}
          </text>
        </g>
      );
    }

    return (
      <>
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" opacity="0.45" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" opacity="0.45" />
        {labels}
      </>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Historical Data</Typography>
      <Box>
        <TextField
          label="Points"
          type="number"
          value={historyLimit}
          onChange={handleLimitChange}
          inputProps={{ min: 1, max: 10000, step: 100 }}
          size="small"
        />
      </Box>
      {historyState.loading && <Typography>Loading history…</Typography>}
      {!historyState.loading && historyState.error && <Typography>History: {historyState.error}</Typography>}
      {!historyState.loading && !historyState.error && historyState.points.length === 0 && <Typography>No history data yet.</Typography>}
      {!historyState.loading && !historyState.error && historyState.points.length > 0 && (
        <Paper className="history-paper">
          <Typography>Points: {historyState.points.length}</Typography>
          <Typography variant="subtitle2" className="history-chart-title">Temperature</Typography>
          <Box className="history-chart-wrap">
            <svg viewBox="0 0 700 240" role="img" aria-label="Temperature history chart">
              {renderAxes(chart.tempMin, chart.tempMax, "°C")}
              <polyline points={chart.temperatureLine} fill="none" stroke="#cc2936" strokeWidth="2" />
            </svg>
          </Box>
          <Typography variant="subtitle2" className="history-chart-title">Humidity</Typography>
          <Box className="history-chart-wrap">
            <svg viewBox="0 0 700 240" role="img" aria-label="Humidity history chart">
              {renderAxes(chart.humidityMin, chart.humidityMax, "%")}
              <polyline points={chart.humidityLine} fill="none" stroke="#1f77b4" strokeWidth="2" />
            </svg>
          </Box>
          <Typography>Temp range: {chart.tempMin.toFixed(1)}°C → {chart.tempMax.toFixed(1)}°C</Typography>
          <Typography>Humidity range: {chart.humidityMin.toFixed(1)}% → {chart.humidityMax.toFixed(1)}%</Typography>
        </Paper>
      )}
    </Stack>
  );
}
