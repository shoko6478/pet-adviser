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
};

const METRICS: ChartMetric[] = [
  { key: "weight", label: "体重", color: "#5b7cfa", unit: "kg" },
  { key: "food", label: "食事量", color: "#34b27b", unit: "g" },
  { key: "toilet", label: "トイレ回数", color: "#ff9f43", unit: "回" },
];

function buildPoints(values: number[], width: number, height: number): Array<{ x: number; y: number }> {
  if (values.length === 1) {
    return [{ x: width / 2, y: height / 2 }];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: Number((height - ((value - min) / range) * height).toFixed(2)),
  }));
}

function formatValue(metric: ChartMetric, value: number): string {
  if (metric.key === "weight") {
    return `${value.toFixed(1)}${metric.unit}`;
  }

  if (metric.key === "food") {
    return `${value.toFixed(0)}${metric.unit}`;
  }

  return `${value}${metric.unit}`;
}

export function RecordCharts({ records }: RecordChartsProps) {
  const chartData = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7)
    .map((record) => ({
      label: record.date.slice(5),
      weight: Number(record.weight.toFixed(1)),
      food: Number(record.food.toFixed(0)),
      toilet: record.toilet,
    }));

  return (
    <section className="card">
      <div className="section-header">
        <h2>直近の推移グラフ</h2>
        <p>体重・食事量・トイレ回数の直近7件を指標ごとに表示します。</p>
      </div>

      {chartData.length === 0 ? (
        <p className="empty-text">記録が増えるとグラフで推移を確認できます。</p>
      ) : (
        <div className="mini-chart-list">
          {METRICS.map((metric) => {
            const values = chartData.map((point) => point[metric.key]);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const latest = values[values.length - 1];
            const points = buildPoints(values, 300, 100);
            const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

            return (
              <section key={metric.key} className="mini-chart-card">
                <div className="mini-chart-header">
                  <div>
                    <h3>{metric.label}</h3>
                    <p>
                      {latest !== undefined ? formatValue(metric, latest) : "-"}
                      <span>
                        {` / 最小 ${formatValue(metric, min)} / 最大 ${formatValue(metric, max)}`}
                      </span>
                    </p>
                  </div>
                  <span className="mini-chart-dot" style={{ backgroundColor: metric.color }} />
                </div>

                <svg
                  viewBox="0 0 300 120"
                  className="mini-chart-svg"
                  role="img"
                  aria-label={`${metric.label} の推移`}
                >
                  <line x1="0" y1="100" x2="300" y2="100" className="chart-axis" />
                  <polyline
                    fill="none"
                    stroke={metric.color}
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={polylinePoints}
                  />
                  {points.map((point, index) => (
                    <circle
                      key={`${metric.key}-${chartData[index].label}`}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill={metric.color}
                    />
                  ))}
                </svg>

                <div className="mini-chart-labels">
                  {chartData.map((point) => (
                    <span key={`${metric.key}-${point.label}`}>{point.label}</span>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
