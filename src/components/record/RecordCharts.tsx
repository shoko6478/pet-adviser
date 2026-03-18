"use client";

import { useMemo, useState } from "react";
import type { DailyObservationValue } from "@/domain/models/daily-observation-value";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import { addDays, diffDays, formatShortDateLabel, getTodayDateString } from "@/lib/utils/date";

interface RecordChartsProps {
  records: DailyRecord[];
  observationFields: ObservationFieldDefinition[];
  observationValuesByRecordId: Record<string, DailyObservationValue[]>;
}

type ChartMetric = {
  key: "weight" | "food" | "toilet";
  label: string;
  color: string;
  unit: string;
  precision: number;
  minValue: number;
};

type Tick = {
  value: number;
  label: string;
};

type RangeOption = 7 | 30;

type ValueDomain = {
  min: number;
  max: number;
};

type ObservationMarker = {
  date: string;
  kind: "checkbox" | "text";
  value: boolean | string;
};

const METRICS: ChartMetric[] = [
  { key: "weight", label: "体重", color: "#5b7cfa", unit: "kg", precision: 1, minValue: 0 },
  { key: "food", label: "食事量", color: "#34b27b", unit: "g", precision: 0, minValue: 0 },
  { key: "toilet", label: "トイレ回数", color: "#ff9f43", unit: "回", precision: 0, minValue: 0 },
];

const RANGE_OPTIONS: RangeOption[] = [7, 30];

function createValueDomain(values: number[], minValue: number): ValueDomain {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin;
  const fallbackPaddingBase = rawMax === 0 ? 1 : Math.abs(rawMax);
  const padding = rawRange > 0 ? rawRange * 0.2 : Math.max(fallbackPaddingBase * 0.2, 1);
  const min = Math.max(minValue, rawMin - padding);
  let max = rawMax + padding;

  if (max <= min) {
    max = min + Math.max(padding, 1);
  }

  return { min, max };
}

function createTicks(domain: ValueDomain, precision: number): Tick[] {
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, index) => {
    const value = domain.min + ((domain.max - domain.min) / steps) * index;
    return {
      value,
      label: value.toFixed(precision),
    };
  }).reverse();
}

function getPointY(value: number, domain: ValueDomain, topPadding: number, chartHeight: number, bottomPadding: number) {
  const innerHeight = chartHeight - topPadding - bottomPadding;
  const range = domain.max - domain.min || 1;
  return topPadding + ((domain.max - value) / range) * innerHeight;
}

function formatMetricValue(metric: ChartMetric, value: number) {
  return `${value.toFixed(metric.precision)}${metric.unit}`;
}

function getObservationValue(
  observationValuesByRecordId: Record<string, DailyObservationValue[]>,
  recordId: string,
  fieldDefinitionId: string,
): DailyObservationValue | null {
  return (
    observationValuesByRecordId[recordId]?.find((value) => value.fieldDefinitionId === fieldDefinitionId) ?? null
  );
}

export function RecordCharts({
  records,
  observationFields,
  observationValuesByRecordId,
}: RecordChartsProps) {
  const [selectedRange, setSelectedRange] = useState<RangeOption>(7);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => a.date.localeCompare(b.date)),
    [records],
  );

  const sortedObservationFields = useMemo(
    () =>
      [...observationFields].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
      ),
    [observationFields],
  );

  const rangeWindow = useMemo(() => {
    const endDate = sortedRecords[sortedRecords.length - 1]?.date ?? getTodayDateString();
    const startDate = addDays(endDate, -(selectedRange - 1));
    const filteredRecords = sortedRecords.filter((record) => record.date >= startDate && record.date <= endDate);

    return { endDate, startDate, filteredRecords };
  }, [selectedRange, sortedRecords]);

  const chartGeometry = useMemo(() => {
    const leftPadding = 68;
    const rightPadding = 20;
    const dayCount = selectedRange;
    const innerWidth = Math.max(320, (dayCount - 1) * 52);
    const chartWidth = leftPadding + rightPadding + innerWidth;
    const labelStep = selectedRange === 30 ? 5 : 1;

    return {
      leftPadding,
      rightPadding,
      dayCount,
      innerWidth,
      chartWidth,
      labelStep,
      getX(date: string) {
        return leftPadding + (innerWidth / Math.max(dayCount - 1, 1)) * diffDays(rangeWindow.startDate, date);
      },
    };
  }, [rangeWindow.startDate, selectedRange]);

  const observationRows = useMemo(() => {
    return sortedObservationFields.map((field) => {
      const markers = rangeWindow.filteredRecords.reduce<ObservationMarker[]>((accumulator, record) => {
        const observationValue = getObservationValue(observationValuesByRecordId, record.id, field.id);
        if (!observationValue) {
          return accumulator;
        }

        if (field.type === "checkbox") {
          if (observationValue.value === true) {
            accumulator.push({ date: record.date, kind: "checkbox", value: true });
          }
          return accumulator;
        }

        const textValue = typeof observationValue.value === "string" ? observationValue.value.trim() : "";
        if (textValue) {
          accumulator.push({ date: record.date, kind: "text", value: textValue });
        }

        return accumulator;
      }, []);

      return { field, markers };
    });
  }, [observationValuesByRecordId, rangeWindow.filteredRecords, sortedObservationFields]);

  const textObservationNotes = useMemo(() => {
    return observationRows.flatMap((row) =>
      row.field.type === "text"
        ? row.markers.map((marker) => ({
            date: marker.date,
            label: row.field.label,
            value: typeof marker.value === "string" ? marker.value : "",
          }))
        : [],
    );
  }, [observationRows]);

  return (
    <section className="card chart-section-card">
      <div className="section-header chart-header-row">
        <div>
          <h2>推移グラフ</h2>
          <p>実日付ベースの位置とY軸余白を持たせ、数値推移と観察項目を同じ日付軸で読めるようにしました。</p>
        </div>

        <div className="range-toggle" role="tablist" aria-label="表示期間">
          {RANGE_OPTIONS.map((rangeOption) => (
            <button
              key={rangeOption}
              type="button"
              className={`range-toggle-button${selectedRange === rangeOption ? " active" : ""}`}
              onClick={() => setSelectedRange(rangeOption)}
            >
              {rangeOption}日
            </button>
          ))}
        </div>
      </div>

      {sortedRecords.length === 0 ? (
        <p className="empty-text">記録が増えるとグラフで推移を確認できます。</p>
      ) : (
        <div className="chart-scroll-frame">
          <div className="chart-timeline-stack" style={{ width: chartGeometry.chartWidth }}>
            {METRICS.map((metric) => {
              const windowRecords = rangeWindow.filteredRecords;
              const values = windowRecords.map((point) => point[metric.key]);

              if (values.length === 0) {
                return (
                  <section key={metric.key} className="metric-chart-card chart-panel-card">
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

              const domain = createValueDomain(values, metric.minValue);
              const ticks = createTicks(domain, metric.precision);
              const chartHeight = 248;
              const topPadding = 18;
              const bottomPadding = 18;
              const points = windowRecords.map((point) => ({
                x: chartGeometry.getX(point.date),
                y: getPointY(point[metric.key], domain, topPadding, chartHeight, bottomPadding),
                value: point[metric.key],
                fullDate: point.date,
              }));
              const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
              const latestValue = values[values.length - 1];

              return (
                <section key={metric.key} className="metric-chart-card chart-panel-card">
                  <div className="metric-chart-header">
                    <div>
                      <h3>{metric.label}</h3>
                      <p>
                        最新値: {formatMetricValue(metric, latestValue)} / 表示範囲 {domain.min.toFixed(metric.precision)}〜{domain.max.toFixed(metric.precision)}
                      </p>
                    </div>
                    <span className="mini-chart-dot" style={{ backgroundColor: metric.color }} />
                  </div>

                  <svg
                    width={chartGeometry.chartWidth}
                    height={chartHeight}
                    viewBox={`0 0 ${chartGeometry.chartWidth} ${chartHeight}`}
                    className="metric-chart-svg"
                    role="img"
                    aria-label={`${metric.label} の推移グラフ`}
                  >
                    {Array.from({ length: chartGeometry.dayCount }, (_, index) => {
                      const date = addDays(rangeWindow.startDate, index);
                      const x = chartGeometry.leftPadding + (chartGeometry.innerWidth / Math.max(chartGeometry.dayCount - 1, 1)) * index;
                      return (
                        <line
                          key={`${metric.key}-v-${date}`}
                          x1={x}
                          y1={topPadding}
                          x2={x}
                          y2={chartHeight - bottomPadding}
                          className="chart-vertical-line"
                        />
                      );
                    })}

                    {ticks.map((tick) => {
                      const y = getPointY(tick.value, domain, topPadding, chartHeight, bottomPadding);
                      return (
                        <g key={`${metric.key}-${tick.value}`}>
                          <line
                            x1={chartGeometry.leftPadding}
                            y1={y}
                            x2={chartGeometry.chartWidth - chartGeometry.rightPadding}
                            y2={y}
                            className="chart-grid-line"
                          />
                          <text
                            x={chartGeometry.leftPadding - 10}
                            y={y + 4}
                            textAnchor="end"
                            className="chart-tick-label"
                          >
                            {tick.label}
                          </text>
                        </g>
                      );
                    })}

                    <line
                      x1={chartGeometry.leftPadding}
                      y1={chartHeight - bottomPadding}
                      x2={chartGeometry.chartWidth - chartGeometry.rightPadding}
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
                        <circle cx={point.x} cy={point.y} r="5" fill={metric.color} className="chart-point" />
                        <circle cx={point.x} cy={point.y} r="9" className="chart-point-hit" />
                        <title>{`${point.fullDate}: ${formatMetricValue(metric, point.value)}`}</title>
                      </g>
                    ))}
                  </svg>
                </section>
              );
            })}

            {sortedObservationFields.length > 0 ? (
              <section className="metric-chart-card chart-panel-card observation-timeline-card">
                <div className="metric-chart-header">
                  <div>
                    <h3>観察項目タイムライン</h3>
                    <p>checkbox は実施日、text はメモあり日を同じ日付軸で確認できます。</p>
                  </div>
                  <span className="observation-chart-caption">● checkbox / ■ text</span>
                </div>

                <svg
                  width={chartGeometry.chartWidth}
                  height={Math.max(120, 24 + observationRows.length * 34 + 38)}
                  viewBox={`0 0 ${chartGeometry.chartWidth} ${Math.max(120, 24 + observationRows.length * 34 + 38)}`}
                  className="metric-chart-svg"
                  role="img"
                  aria-label="観察項目タイムライン"
                >
                  {Array.from({ length: chartGeometry.dayCount }, (_, index) => {
                    const date = addDays(rangeWindow.startDate, index);
                    const x = chartGeometry.leftPadding + (chartGeometry.innerWidth / Math.max(chartGeometry.dayCount - 1, 1)) * index;
                    const showLabel = index === 0 || index === chartGeometry.dayCount - 1 || index % chartGeometry.labelStep === 0;
                    return (
                      <g key={`obs-date-${date}`}>
                        <line
                          x1={x}
                          y1={12}
                          x2={x}
                          y2={Math.max(120, 24 + observationRows.length * 34 + 38) - 26}
                          className="chart-vertical-line"
                        />
                        {showLabel ? (
                          <text
                            x={x}
                            y={Math.max(120, 24 + observationRows.length * 34 + 38) - 8}
                            textAnchor="middle"
                            className="chart-date-label"
                          >
                            {formatShortDateLabel(date)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}

                  {observationRows.map((row, index) => {
                    const y = 30 + index * 34;
                    return (
                      <g key={row.field.id}>
                        <text
                          x={chartGeometry.leftPadding - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="chart-tick-label"
                        >
                          {row.field.label}
                        </text>
                        <line
                          x1={chartGeometry.leftPadding}
                          y1={y}
                          x2={chartGeometry.chartWidth - chartGeometry.rightPadding}
                          y2={y}
                          className="chart-grid-line"
                        />

                        {row.markers.map((marker) => {
                          const x = chartGeometry.getX(marker.date);
                          return row.field.type === "checkbox" ? (
                            <g key={`${row.field.id}-${marker.date}`}>
                              <circle cx={x} cy={y} r="8" className="observation-marker observation-marker-checkbox" />
                              <text x={x} y={y + 4} textAnchor="middle" className="observation-marker-label">
                                ✓
                              </text>
                              <title>{`${row.field.label}: ${marker.date}`}</title>
                            </g>
                          ) : (
                            <g key={`${row.field.id}-${marker.date}`}>
                              <rect
                                x={x - 9}
                                y={y - 9}
                                width="18"
                                height="18"
                                rx="4"
                                className="observation-marker observation-marker-text"
                              />
                              <text x={x} y={y + 4} textAnchor="middle" className="observation-marker-label">
                                メ
                              </text>
                              <title>{`${row.field.label}: ${marker.date}`}</title>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {textObservationNotes.length > 0 ? (
                  <div className="observation-note-panel">
                    <p className="observation-note-title">期間内メモ</p>
                    <ul className="observation-note-list">
                      {textObservationNotes.map((note) => (
                        <li key={`${note.label}-${note.date}-${note.value}`}>
                          <strong>{note.date}</strong>
                          <span>{note.label}</span>
                          <p>{note.value}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="observation-empty">選択期間内のテキスト観察メモはありません。</p>
                )}
              </section>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
