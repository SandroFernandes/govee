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
        const response = await fetch(`/api/history/?hours=${intervalHours}&limit=10000`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const points = Array.isArray(data.points) ? data.points : [];

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
