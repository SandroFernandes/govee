import { useEffect, useState } from "react";

export default function useHealthStatus() {
  const [status, setStatus] = useState("checking...");

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

  return status;
}
