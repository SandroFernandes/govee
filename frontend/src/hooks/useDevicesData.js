import { useEffect, useState } from "react";

export default function useDevicesData(showMessage) {
  const [devicesState, setDevicesState] = useState({ loading: true, error: "", devices: [] });
  const [aliasInputs, setAliasInputs] = useState({});
  const [savingState, setSavingState] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function loadDevices() {
      try {
        const response = await fetch("/api/devices/");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const devices = Array.isArray(data.devices) ? data.devices : [];
        if (isMounted) {
          setDevicesState({ loading: false, error: "", devices });
          setAliasInputs((previous) => {
            const next = { ...previous };
            for (const device of devices) {
              if (typeof next[device.address] !== "string") {
                next[device.address] = device.alias || "";
              }
            }
            return next;
          });
        }
      } catch {
        if (isMounted) {
          setDevicesState({ loading: false, error: "devices-unreachable", devices: [] });
        }
      }
    }

    loadDevices();
    const timerId = setInterval(loadDevices, 60000);

    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, []);

  async function saveAlias(address) {
    const alias = (aliasInputs[address] || "").trim();
    setSavingState((previous) => ({ ...previous, [address]: "saving" }));

    try {
      const response = await fetch("/api/devices/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, alias }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const updated = await response.json();
      setDevicesState((previous) => ({
        ...previous,
        devices: previous.devices.map((device) =>
          device.address === address
            ? {
                ...device,
                alias: updated.alias,
                detected_name: updated.detected_name,
                display_name: updated.display_name,
                updated_at: updated.updated_at,
              }
            : device
        ),
      }));
      setSavingState((previous) => ({ ...previous, [address]: "saved" }));
      showMessage("Alias saved");
    } catch {
      setSavingState((previous) => ({ ...previous, [address]: "error" }));
      showMessage("Alias save failed");
    }
  }

  return {
    devicesState,
    aliasInputs,
    setAliasInputs,
    savingState,
    saveAlias,
  };
}
