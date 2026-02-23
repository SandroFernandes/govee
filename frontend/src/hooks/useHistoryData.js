import { useEffect, useState } from "react";

const INTERVAL_HOURS = {
  days: 24,
  weeks: 24 * 7,
  months: 24 * 30,
  years: 24 * 365,
};

export default function useHistoryData(intervalUnit) {
  const [historyState, setHistoryState] = useState({ loading: true, error: "", points: [] });

  useEffect(() => {
    let isMounted = true;
    const normalizedIntervalUnit = Object.prototype.hasOwnProperty.call(INTERVAL_HOURS, intervalUnit) ? intervalUnit : "weeks";
    const intervalHours = INTERVAL_HOURS[normalizedIntervalUnit];

    async function loadHistory() {
      try {
        let points = [];

        if (normalizedIntervalUnit === "days") {
          const dayResponse = await fetch("/api/history/?hours=24&limit=10000");
          if (!dayResponse.ok) {
            throw new Error(`HTTP ${dayResponse.status}`);
          }

          const dayData = await dayResponse.json();
          const dayPoints = Array.isArray(dayData.points) ? dayData.points : [];

          if (dayPoints.length > 0) {
            points = dayPoints;
          } else {
            const fallbackResponse = await fetch("/api/history/?limit=10000");
            if (!fallbackResponse.ok) {
              throw new Error(`HTTP ${fallbackResponse.status}`);
            }

            const fallbackData = await fallbackResponse.json();
            const fallbackPoints = Array.isArray(fallbackData.points) ? fallbackData.points : [];

            if (fallbackPoints.length > 0) {
              const latestTimestampMs = Date.parse(fallbackPoints[fallbackPoints.length - 1].measured_at);

              if (Number.isFinite(latestTimestampMs)) {
                const windowStartMs = latestTimestampMs - 24 * 60 * 60 * 1000;
                points = fallbackPoints.filter((point) => {
                  const pointTimestampMs = Date.parse(point.measured_at);
                  return Number.isFinite(pointTimestampMs) && pointTimestampMs >= windowStartMs && pointTimestampMs <= latestTimestampMs;
                });
              }
            }
          }
        } else {
          const response = await fetch(`/api/history/?hours=${intervalHours}&limit=10000`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          points = Array.isArray(data.points) ? data.points : [];
        }

        if (isMounted) {
          setHistoryState({
            loading: false,
            error: "",
            points,
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
  }, [intervalUnit]);

  return historyState;
}
