import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    async function loadHealth() {
      try {
        const response = await fetch("/api/health/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setStatus(data.status || "unknown");
      } catch {
        setStatus("unreachable");
      }
    }

    loadHealth();
  }, []);

  return (
    <main>
      <h1>Govee Frontend</h1>
      <p>Django backend health: {status}</p>
    </main>
  );
}
