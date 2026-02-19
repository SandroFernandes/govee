import React from "react";
import { useEffect, useState } from "react";

export default function App() {
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

  return (
    <main>
      <h1>Govee Frontend</h1>
      <p>Django backend health: {status}</p>
    </main>
  );
}
