import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows backend healthy status when API succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("/api/health/")) {
        return {
          ok: true,
          json: async () => ({ status: "ok" }),
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

    expect(screen.getByText("Govee Frontend")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Django backend health: ok")).toBeInTheDocument();
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
      expect(screen.getByText("Django backend health: unreachable")).toBeInTheDocument();
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

      throw new Error("history down");
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("History: history-unreachable")).toBeInTheDocument();
    });
  });
});
