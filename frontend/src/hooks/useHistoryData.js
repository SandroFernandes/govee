import { useEffect, useState } from "react";

export default function useHistoryData(limit) {
  const [historyState, setHistoryState] = useState({ loading: true, error: "", points: [] });

  useEffect(() => {
    let isMounted = true;
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(10000, Math.floor(limit))) : 1000;

    async function loadHistory() {
      try {
        const recentResponse = await fetch(`/api/history/?hours=168&limit=${normalizedLimit}`);
        if (!recentResponse.ok) {
          throw new Error(`HTTP ${recentResponse.status}`);
        }

        const recentData = await recentResponse.json();
        const recentPoints = Array.isArray(recentData.points) ? recentData.points : [];

        let points = recentPoints;
        if (recentPoints.length === 0) {
          const allResponse = await fetch(`/api/history/?limit=${normalizedLimit}`);
          if (!allResponse.ok) {
            throw new Error(`HTTP ${allResponse.status}`);
          }

          const allData = await allResponse.json();
          points = Array.isArray(allData.points) ? allData.points : [];
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
  }, [limit]);

  return historyState;
}
