export function buildChart(points) {
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
