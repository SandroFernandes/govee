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
          const response = await fetch("/api/history/?limit=10000");
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          const allPoints = Array.isArray(data.points) ? data.points : [];

          if (allPoints.length > 0) {
            const latestTimestampMs = Date.parse(allPoints[allPoints.length - 1].measured_at);

            if (Number.isFinite(latestTimestampMs)) {
              const latestDate = new Date(latestTimestampMs);
              const dayStart = new Date(latestDate);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(latestDate);
              dayEnd.setHours(23, 59, 59, 999);

              const dayStartMs = dayStart.getTime();
              const dayEndMs = dayEnd.getTime();

              points = allPoints.filter((point) => {
                const pointTimestampMs = Date.parse(point.measured_at);
                return Number.isFinite(pointTimestampMs) && pointTimestampMs >= dayStartMs && pointTimestampMs <= dayEndMs;
              });
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
