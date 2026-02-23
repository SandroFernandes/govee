import { useEffect, useState } from "react";

function readCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift() || "";
  }
  return "";
}

export default function useDevicesData(showMessage) {
  const [devicesState, setDevicesState] = useState({ loading: true, error: "", devices: [] });
  const [aliasInputs, setAliasInputs] = useState({});
  const [savingState, setSavingState] = useState({});

  async function ensureCsrfToken() {
    const existing = readCookie("csrftoken");
    if (existing) {
      return existing;
    }

    const response = await fetch("/api/auth/csrf/", { credentials: "include" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    const token = readCookie("csrftoken");
    if (token) {
      return token;
    }

    if (payload?.csrfToken) {
      return String(payload.csrfToken);
    }

    throw new Error("missing-csrf-token");
  }

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
      const csrfToken = await ensureCsrfToken();
      const response = await fetch("/api/devices/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
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
