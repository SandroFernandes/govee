import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows login by default and disables non-login menu when logged out", async () => {
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

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Historical Data" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Device Names" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Logout" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "About" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByLabelText("theme-mode-system")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("backend-status-ok")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });

  it("cycles theme mode icon from system to light to dark", async () => {
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

    const toggle = screen.getByLabelText("theme-mode-system");
    fireEvent.click(toggle);
    expect(screen.getByLabelText("theme-mode-light")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("theme-mode-light"));
    expect(screen.getByLabelText("theme-mode-dark")).toBeInTheDocument();
  });

  it("shows unreachable status when API request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText("backend-status-unreachable")).toBeInTheDocument();
    });
  });

  it("keeps user on login when logged out and clicking other menu items", async () => {
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

      if (String(url).includes("/api/history/")) {
        return {
          ok: true,
          json: async () => ({ points: [] }),
        };
      }

      throw new Error("unexpected request");
    });

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Historical Data" }));

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sandro" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByLabelText("login-submit"));
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
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "sandro" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByLabelText("login-submit"));
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

    expect(screen.getByRole("button", { name: "Historical Data" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Device Names" })).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "About" })).not.toHaveAttribute("aria-disabled", "true");

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Historical Data" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Device Names" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "About" })).toHaveAttribute("aria-disabled", "true");
  });
});
