"use client";

import { useMemo, useState } from "react";
import type { DailyRecord } from "@/domain/models/daily-record";
import { addDays, diffDays, formatShortDateLabel, getTodayDateString } from "@/lib/utils/date";

interface RecordChartsProps {
  records: DailyRecord[];
}

type ChartMetric = {
  key: "weight" | "food" | "toilet";
  label: string;
  color: string;
  unit: string;
  precision: number;
};

type Tick = {
  value: number;
  label: string;
};

type RangeOption = 7 | 30;

const METRICS: ChartMetric[] = [
  { key: "weight", label: "体重", color: "#5b7cfa", unit: "kg", precision: 1 },
  { key: "food", label: "食事量", color: "#34b27b", unit: "g", precision: 0 },
  { key: "toilet", label: "トイレ回数", color: "#ff9f43", unit: "回", precision: 0 },
];

function createTicks(values: number[], precision: number): Tick[] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const base = min === 0 ? 1 : Math.abs(min) * 0.2;
    const start = Math.max(0, min - base);
    const end = max + base;

    return [start, (start + end) / 2, end].map((value) => ({
      value,
      label: value.toFixed(precision),
    }));
  }

  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const value = min + ((max - min) / steps) * index;
    return {
      value,
      label: value.toFixed(precision),
    };
  }).reverse();
}

function getPointY(value: number, ticks: Tick[], topPadding: number, chartHeight: number, bottomPadding: number) {
  const max = ticks[0]?.value ?? value;
  const min = ticks[ticks.length - 1]?.value ?? value;
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const range = max - min || 1;
  return topPadding + ((max - value) / range) * innerHeight;
}

function formatMetricValue(metric: ChartMetric, value: number) {
  return `${value.toFixed(metric.precision)}${metric.unit}`;
}

export function RecordCharts({ records }: RecordChartsProps) {
  const [selectedRange, setSelectedRange] = useState<RangeOption>(7);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.date.localeCompare(b.date)),
    [records],
  );

  const rangeWindow = useMemo(() => {
    const endDate = sortedRecords[sortedRecords.length - 1]?.date ?? getTodayDateString();
    const startDate = addDays(endDate, -(selectedRange - 1));
    const filteredRecords = sortedRecords.filter((record) => record.date >= startDate && record.date <= endDate);

    return { endDate, startDate, filteredRecords };
  }, [selectedRange, sortedRecords]);

  return (
    <section className="card">
      <div className="section-header chart-header-row">
        <div>
          <h2>推移グラフ</h2>
          <p>直近7日 / 30日を実日付ベースで表示し、日付差に応じて横位置が変わるようにしました。</p>
        </div>

        <div className="range-toggle" role="tablist" aria-label="表示期間">
          <button
            type="button"
            className={`range-toggle-button${selectedRange === 7 ? " active" : ""}`}
            onClick={() => setSelectedRange(7)}
          >
            7日
          </button>
          <button
            type="button"
            className={`range-toggle-button${selectedRange === 30 ? " active" : ""}`}
            onClick={() => setSelectedRange(30)}
          >
            30日
          </button>
        </div>
      </div>

      {sortedRecords.length === 0 ? (
        <p className="empty-text">記録が増えるとグラフで推移を確認できます。</p>
      ) : (
        <div className="metric-chart-list">
          {METRICS.map((metric) => {
            const windowRecords = rangeWindow.filteredRecords;
            const values = windowRecords.map((point) => point[metric.key]);

            if (values.length === 0) {
              return (
                <section key={metric.key} className="metric-chart-card">
                  <div className="metric-chart-header">
                    <div>
                      <h3>{metric.label}</h3>
                      <p>選択期間内の記録がありません。</p>
                    </div>
                    <span className="mini-chart-dot" style={{ backgroundColor: metric.color }} />
                  </div>
                </section>
              );
            }

            const ticks = createTicks(values, metric.precision);
            const chartHeight = 260;
            const leftPadding = 52;
            const rightPadding = 18;
            const topPadding = 16;
            const bottomPadding = 42;
            const dayCount = selectedRange;
            const innerWidth = Math.max(320, (dayCount - 1) * 44);
            const chartWidth = leftPadding + rightPadding + innerWidth;
            const labelStep = selectedRange === 30 ? 5 : 1;
            const points = windowRecords.map((point) => ({
              x: leftPadding + (innerWidth / Math.max(dayCount - 1, 1)) * diffDays(rangeWindow.startDate, point.date),
              y: getPointY(point[metric.key], ticks, topPadding, chartHeight, bottomPadding),
              value: point[metric.key],
              label: formatShortDateLabel(point.date),
              fullDate: point.date,
            }));
            const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
            const latestValue = values[values.length - 1];

            return (
              <section key={metric.key} className="metric-chart-card">
                <div className="metric-chart-header">
                  <div>
                    <h3>{metric.label}</h3>
                    <p>最新値: {formatMetricValue(metric, latestValue)}</p>
                  </div>
                  <span className="mini-chart-dot" style={{ backgroundColor: metric.color }} />
                </div>

                <div className="chart-scroll-area">
                  <svg
                    width={chartWidth}
                    height={chartHeight}
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="metric-chart-svg"
                    role="img"
                    aria-label={`${metric.label} の推移グラフ`}
                  >
                    {ticks.map((tick) => {
                      const y = getPointY(tick.value, ticks, topPadding, chartHeight, bottomPadding);
                      return (
                        <g key={`${metric.key}-${tick.value}`}>
                          <line
                            x1={leftPadding}
                            y1={y}
                            x2={chartWidth - rightPadding}
                            y2={y}
                            className="chart-grid-line"
                          />
                          <text x={leftPadding - 8} y={y + 4} textAnchor="end" className="chart-tick-label">
                            {tick.label}
                          </text>
                        </g>
                      );
                    })}

                    {Array.from({ length: dayCount }, (_, index) => {
                      const date = addDays(rangeWindow.startDate, index);
                      const x = leftPadding + (innerWidth / Math.max(dayCount - 1, 1)) * index;
                      const showLabel = index === 0 || index === dayCount - 1 || index % labelStep === 0;
                      return (
                        <g key={`${metric.key}-${date}`}>
                          <line
                            x1={x}
                            y1={topPadding}
                            x2={x}
                            y2={chartHeight - bottomPadding}
                            className="chart-vertical-line"
                          />
                          {showLabel ? (
                            <text x={x} y={chartHeight - 14} textAnchor="middle" className="chart-date-label">
                              {formatShortDateLabel(date)}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}

                    <line
                      x1={leftPadding}
                      y1={chartHeight - bottomPadding}
                      x2={chartWidth - rightPadding}
                      y2={chartHeight - bottomPadding}
                      className="chart-axis"
                    />

                    {points.length > 1 ? (
                      <polyline
                        fill="none"
                        stroke={metric.color}
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={polylinePoints}
                      />
                    ) : null}

                    {points.map((point) => (
                      <g key={`${metric.key}-${point.fullDate}`}>
                        <circle cx={point.x} cy={point.y} r="4" fill={metric.color} />
                        <title>{`${point.fullDate}: ${formatMetricValue(metric, point.value)}`}</title>
                      </g>
                    ))}
                  </svg>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
