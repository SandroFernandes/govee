import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const capturedXAxisProps = [];

vi.mock("recharts", () => ({
  CartesianGrid: () => <div data-testid="grid" />,
  Line: () => <div data-testid="line" />,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  XAxis: (props) => {
    capturedXAxisProps.push(props);
    return <div data-testid="x-axis" />;
  },
  YAxis: () => <div data-testid="y-axis" />,
}));

import HistorySection from "./HistorySection";

describe("HistorySection days axis", () => {
  beforeEach(() => {
    capturedXAxisProps.length = 0;
  });

  it("extends day domain by one day on both sides and formats edge labels as date", () => {
    const points = [
      {
        address: "AA:BB:CC:DD:EE:01",
        name: "Sensor",
        measured_at: "2026-02-10T06:00:00+00:00",
        temperature_c: 21.1,
        humidity_pct: 44.2,
      },
      {
        address: "AA:BB:CC:DD:EE:01",
        name: "Sensor",
        measured_at: "2026-02-10T18:00:00+00:00",
        temperature_c: 22.3,
        humidity_pct: 45.6,
      },
    ];

    render(
      <HistorySection
        historyState={{ loading: false, error: "", points }}
        historyInterval="days"
        setHistoryInterval={() => {}}
        historyAddress="AA:BB:CC:DD:EE:01"
        setHistoryAddress={() => {}}
        devices={[{ address: "AA:BB:CC:DD:EE:01", display_name: "Sensor" }]}
      />
    );

    expect(capturedXAxisProps.length).toBeGreaterThan(0);

    const dayAxis = capturedXAxisProps[0];
    const latestDate = new Date(points[points.length - 1].measured_at);
    const dayStart = new Date(latestDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(latestDate);
    dayEnd.setHours(23, 59, 59, 999);
    const oneDayMs = 24 * 60 * 60 * 1000;

    expect(dayAxis.domain).toEqual([dayStart.getTime() - oneDayMs, dayEnd.getTime() + oneDayMs]);

    const inDayLabel = dayAxis.tickFormatter(dayStart.getTime() + 60 * 60 * 1000);
    const beforeDayLabel = dayAxis.tickFormatter(dayStart.getTime() - 60 * 60 * 1000);
    const afterDayLabel = dayAxis.tickFormatter(dayEnd.getTime() + 60 * 60 * 1000);

    expect(inDayLabel).toMatch(":");
    expect(beforeDayLabel).not.toMatch(":");
    expect(afterDayLabel).not.toMatch(":");
  });
});
