"use client";

import type { DailyRecord } from "@/domain/models/daily-record";

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

function getPointX(index: number, total: number, chartWidth: number, leftPadding: number, rightPadding: number) {
  if (total <= 1) {
    return leftPadding + (chartWidth - leftPadding - rightPadding) / 2;
  }

  const innerWidth = chartWidth - leftPadding - rightPadding;
  return leftPadding + (innerWidth / (total - 1)) * index;
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
  const chartData = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => ({
      id: record.id,
      label: record.date.slice(5),
      fullDate: record.date,
      weight: Number(record.weight.toFixed(1)),
      food: Number(record.food.toFixed(0)),
      toilet: record.toilet,
    }));

  return (
    <section className="card">
      <div className="section-header">
        <h2>推移グラフ</h2>
        <p>縦軸に目盛りを表示し、日付ラベルを揃えたうえで横スクロールにも対応しました。</p>
      </div>

      {chartData.length === 0 ? (
        <p className="empty-text">記録が増えるとグラフで推移を確認できます。</p>
      ) : (
        <div className="metric-chart-list">
          {METRICS.map((metric) => {
            const values = chartData.map((point) => point[metric.key]);
            const ticks = createTicks(values, metric.precision);
            const chartWidth = Math.max(420, chartData.length * 88);
            const chartHeight = 260;
            const leftPadding = 52;
            const rightPadding = 16;
            const topPadding = 16;
            const bottomPadding = 42;
            const points = chartData.map((point, index) => ({
              x: getPointX(index, chartData.length, chartWidth, leftPadding, rightPadding),
              y: getPointY(point[metric.key], ticks, topPadding, chartHeight, bottomPadding),
              value: point[metric.key],
              label: point.label,
              fullDate: point.fullDate,
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

                    <line
                      x1={leftPadding}
                      y1={chartHeight - bottomPadding}
                      x2={chartWidth - rightPadding}
                      y2={chartHeight - bottomPadding}
                      className="chart-axis"
                    />

                    <polyline
                      fill="none"
                      stroke={metric.color}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={polylinePoints}
                    />

                    {points.map((point) => (
                      <g key={`${metric.key}-${point.fullDate}`}>
                        <circle cx={point.x} cy={point.y} r="4" fill={metric.color} />
                        <text
                          x={point.x}
                          y={chartHeight - 14}
                          textAnchor="middle"
                          className="chart-date-label"
                        >
                          {point.label}
                        </text>
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
