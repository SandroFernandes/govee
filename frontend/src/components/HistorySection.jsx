import React from "react";
import { Box, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./HistorySection.css";

export default function HistorySection({ historyState, historyInterval, setHistoryInterval }) {
  const chartData = historyState.points.map((point, index) => ({
    id: `${point.address || "device"}-${point.measured_at || index}`,
    measuredAt: point.measured_at || "",
    measuredAtMs: Date.parse(point.measured_at || ""),
    temperature_c: Number(point.temperature_c),
    humidity_pct: Number(point.humidity_pct),
  })).filter((point) => Number.isFinite(point.measuredAtMs));

  const temperatures = chartData.map((point) => point.temperature_c);
  const humidities = chartData.map((point) => point.humidity_pct);
  const tempMin = temperatures.length ? Math.min(...temperatures) : 0;
  const tempMax = temperatures.length ? Math.max(...temperatures) : 0;
  const humidityMin = humidities.length ? Math.min(...humidities) : 0;
  const humidityMax = humidities.length ? Math.max(...humidities) : 0;

  const latestTimestampMs = chartData.length ? chartData[chartData.length - 1].measuredAtMs : null;
  let xDomain = ["dataMin", "dataMax"];
  if (historyInterval === "days" && Number.isFinite(latestTimestampMs)) {
    const latestDate = new Date(latestTimestampMs);
    const dayStart = new Date(latestDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(latestDate);
    dayEnd.setHours(23, 59, 59, 999);
    xDomain = [dayStart.getTime(), dayEnd.getTime()];
  }

  function handleIntervalChange(event) {
    setHistoryInterval(event.target.value);
  }

  function formatTimestamp(value) {
    if (!Number.isFinite(value)) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Historical Data</Typography>
      <Box>
        <TextField
          label="Interval"
          select
          value={historyInterval}
          onChange={handleIntervalChange}
          size="small"
          className="history-interval-field"
        >
          <MenuItem value="days">Days</MenuItem>
          <MenuItem value="weeks">Weeks</MenuItem>
          <MenuItem value="months">Months</MenuItem>
          <MenuItem value="years">Years</MenuItem>
        </TextField>
      </Box>
      {historyState.loading && <Typography>Loading history…</Typography>}
      {!historyState.loading && historyState.error && <Typography>History: {historyState.error}</Typography>}
      {!historyState.loading && !historyState.error && historyState.points.length === 0 && <Typography>No history data yet.</Typography>}
      {!historyState.loading && !historyState.error && historyState.points.length > 0 && (
        <Paper className="history-paper">
          <Typography>Points: {historyState.points.length}</Typography>
          <Typography variant="subtitle2" className="history-chart-title">Temperature</Typography>
          <Box className="history-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="measuredAtMs"
                  type="number"
                  scale="time"
                  domain={xDomain}
                  tickFormatter={formatTimestamp}
                  minTickGap={36}
                />
                <YAxis unit="°C" domain={["auto", "auto"]} />
                <Tooltip labelFormatter={formatTimestamp} formatter={(value) => [`${Number(value).toFixed(1)}°C`, "Temperature"]} />
                <Line type="monotone" dataKey="temperature_c" stroke="#cc2936" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Typography variant="subtitle2" className="history-chart-title">Humidity</Typography>
          <Box className="history-chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="measuredAtMs"
                  type="number"
                  scale="time"
                  domain={xDomain}
                  tickFormatter={formatTimestamp}
                  minTickGap={36}
                />
                <YAxis unit="%" domain={["auto", "auto"]} />
                <Tooltip labelFormatter={formatTimestamp} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Humidity"]} />
                <Line type="monotone" dataKey="humidity_pct" stroke="#1f77b4" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Typography>Temp range: {tempMin.toFixed(1)}°C → {tempMax.toFixed(1)}°C</Typography>
          <Typography>Humidity range: {humidityMin.toFixed(1)}% → {humidityMax.toFixed(1)}%</Typography>
        </Paper>
      )}
    </Stack>
  );
}
