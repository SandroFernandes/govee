import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("renders drawer menu and history section by default", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url).includes("/api/health/")) {
        return {
          ok: true,
          json: async () => ({ status: "ok" }),
        };
      }

      if (String(url).includes("/api/devices/") && (!options || !options.method)) {
        return {
          ok: true,
          json: async () => ({
            devices: [
              {
                address: "aa:bb:cc:dd:ee:01",
                alias: "",
                detected_name: "H5075_A",
                display_name: "H5075_A",
                updated_at: "2026-02-21T00:00:00+00:00",
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          points: [
            {
              address: "AA:BB:CC:DD:EE:01",
              name: "H5075_A",
              measured_at: "2026-02-20T10:00:00+00:00",
              temperature_c: 21.1,
              humidity_pct: 45.2,
            },
            {
              address: "AA:BB:CC:DD:EE:01",
              name: "H5075_A",
              measured_at: "2026-02-20T11:00:00+00:00",
              temperature_c: 21.4,
              humidity_pct: 44.8,
            },
          ],
        }),
      };
    });

    render(<App />);

    expect(screen.getByRole("heading", { name: "Historical Data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Device Names" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("backend-status-ok")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("Points: 2")).toBeInTheDocument();
    });

    expect(screen.getByRole("img", { name: "Temperature and humidity history chart" })).toBeInTheDocument();
  });

  it("shows unreachable status when API request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText("backend-status-unreachable")).toBeInTheDocument();
    });
  });

  it("shows history error when history request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/health/")) {
        return {
          ok: true,
          json: async () => ({ status: "ok" }),
        };
      }

      if (String(url).includes("/api/devices/")) {
        return {
          ok: true,
          json: async () => ({ devices: [] }),
        };
      }

      throw new Error("history down");
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("History: history-unreachable")).toBeInTheDocument();
    });
  });

  it("switches to device names section from drawer", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/health/")) {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (String(url).includes("/api/history/")) {
        return { ok: true, json: async () => ({ points: [] }) };
      }
      if (String(url).includes("/api/devices/")) {
        return {
          ok: true,
          json: async () => ({
            devices: [
              {
                address: "aa:bb:cc:dd:ee:01",
                alias: "",
                detected_name: "H5075_A",
                display_name: "H5075_A",
                updated_at: "2026-02-21T00:00:00+00:00",
              },
            ],
          }),
        };
      }
      throw new Error("unexpected request");
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Device Names" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "alias-aa:bb:cc:dd:ee:01" })).toBeInTheDocument();
    });
  });

  it("saves alias from device table", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, options) => {
      if (String(url).includes("/api/health/")) {
        return {
          ok: true,
          json: async () => ({ status: "ok" }),
        };
      }

      if (String(url).includes("/api/history/")) {
        return {
          ok: true,
          json: async () => ({ points: [] }),
        };
      }

      if (String(url).includes("/api/devices/") && (!options || !options.method)) {
        return {
          ok: true,
          json: async () => ({
            devices: [
              {
                address: "aa:bb:cc:dd:ee:01",
                alias: "",
                detected_name: "H5075_A",
                display_name: "H5075_A",
                updated_at: "2026-02-21T00:00:00+00:00",
              },
            ],
          }),
        };
      }

      if (String(url).includes("/api/devices/") && options?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            address: "aa:bb:cc:dd:ee:01",
            alias: "Bedroom",
            detected_name: "H5075_A",
            display_name: "Bedroom",
            updated_at: "2026-02-21T00:01:00+00:00",
          }),
        };
      }

      throw new Error("unexpected request");
    });

    render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Device Names" }));

    const input = await screen.findByRole("textbox", { name: "alias-aa:bb:cc:dd:ee:01" });
    fireEvent.change(input, { target: { value: "Bedroom" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("saved")).toBeInTheDocument();
    });
  });

  it("supports login and logout menu flow", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/health/")) {
        return { ok: true, json: async () => ({ status: "ok" }) };
      }
      if (String(url).includes("/api/history/")) {
        return { ok: true, json: async () => ({ points: [] }) };
      }
      if (String(url).includes("/api/devices/")) {
        return { ok: true, json: async () => ({ devices: [] }) };
      }
      throw new Error("unexpected request");
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sandro" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByLabelText("login-submit"));

    await waitFor(() => {
      expect(screen.getByText("Logged in as sandro")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });
  });
});
