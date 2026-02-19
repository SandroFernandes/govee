import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows backend healthy status when API succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    });

    render(<App />);

    expect(screen.getByText("Govee Frontend")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Django backend health: ok")).toBeInTheDocument();
    });
  });

  it("shows unreachable status when API request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Django backend health: unreachable")).toBeInTheDocument();
    });
  });
});
