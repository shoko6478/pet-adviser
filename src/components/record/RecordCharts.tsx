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

type RangeOption = 7 | 30;

type ValueDomain = {
  min: number;
  max: number;
};

type Tick = {
  value: number;
  label: string;
};

type ObservationMarker =
  | {
      date: string;
      kind: "checkbox";
    }
  | {
      date: string;
      kind: "text";
      note: string;
    };

const RANGE_OPTIONS: RangeOption[] = [7, 30];
const GRID_STEPS = 4;

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
  return Array.from({ length: GRID_STEPS + 1 }, (_, index) => {
    const value = domain.min + ((domain.max - domain.min) / GRID_STEPS) * index;
    return {
      value,
      label: value.toFixed(precision),
    };
  }).reverse();
}

function getPointY(value: number, domain: ValueDomain, topPadding: number, chartHeight: number) {
  const range = domain.max - domain.min || 1;
  return topPadding + ((domain.max - value) / range) * chartHeight;
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
  const [selectedTextMarkerKey, setSelectedTextMarkerKey] = useState<string | null>(null);

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

    return { startDate, endDate, filteredRecords };
  }, [selectedRange, sortedRecords]);

  const geometry = useMemo(() => {
    const leftPadding = 84;
    const rightPadding = 78;
    const dayCount = selectedRange;
    const innerWidth = Math.max(340, (dayCount - 1) * 52);
    const chartWidth = leftPadding + rightPadding + innerWidth;
    const graphTop = 16;
    const graphHeight = 224;
    const rowHeight = 34;
    const rowsTop = graphTop + graphHeight + 28;
    const rowsHeight = Math.max(sortedObservationFields.length, 1) * rowHeight;
    const dateAxisHeight = 32;
    const totalHeight = rowsTop + rowsHeight + dateAxisHeight;
    const labelStep = selectedRange === 30 ? 5 : 1;

    return {
      leftPadding,
      rightPadding,
      dayCount,
      innerWidth,
      chartWidth,
      graphTop,
      graphHeight,
      rowsTop,
      rowHeight,
      rowsHeight,
      totalHeight,
      labelStep,
      getX(date: string) {
        return leftPadding + (innerWidth / Math.max(dayCount - 1, 1)) * diffDays(rangeWindow.startDate, date);
      },
    };
  }, [rangeWindow.startDate, selectedRange, sortedObservationFields.length]);

  const weightValues = rangeWindow.filteredRecords.map((record) => record.weight);
  const foodValues = rangeWindow.filteredRecords.map((record) => record.food);
  const weightDomain = weightValues.length > 0 ? createValueDomain(weightValues, 0) : null;
  const foodDomain = foodValues.length > 0 ? createValueDomain(foodValues, 0) : null;
  const weightTicks = weightDomain ? createTicks(weightDomain, 1) : [];
  const foodTicks = foodDomain ? createTicks(foodDomain, 0) : [];

  const weightPoints = rangeWindow.filteredRecords.map((record) => ({
    date: record.date,
    value: record.weight,
    x: geometry.getX(record.date),
    y: weightDomain ? getPointY(record.weight, weightDomain, geometry.graphTop, geometry.graphHeight) : 0,
  }));

  const foodPoints = rangeWindow.filteredRecords.map((record) => ({
    date: record.date,
    value: record.food,
    x: geometry.getX(record.date),
    y: foodDomain ? getPointY(record.food, foodDomain, geometry.graphTop, geometry.graphHeight) : 0,
  }));

  const observationRows = useMemo(() => {
    return sortedObservationFields.map((field) => {
      const markers = rangeWindow.filteredRecords.reduce<ObservationMarker[]>((accumulator, record) => {
        const observationValue = getObservationValue(observationValuesByRecordId, record.id, field.id);
        if (!observationValue) {
          return accumulator;
        }

        if (field.type === "checkbox") {
          if (observationValue.value === true) {
            accumulator.push({ date: record.date, kind: "checkbox" });
          }
          return accumulator;
        }

        const note = typeof observationValue.value === "string" ? observationValue.value.trim() : "";
        if (note) {
          accumulator.push({ date: record.date, kind: "text", note });
        }

        return accumulator;
      }, []);

      return { field, markers };
    });
  }, [observationValuesByRecordId, rangeWindow.filteredRecords, sortedObservationFields]);

  const textMarkers = useMemo(() => {
    return observationRows.flatMap((row) =>
      row.markers.flatMap((marker) =>
        marker.kind === "text"
          ? [
              {
                key: `${row.field.id}-${marker.date}`,
                date: marker.date,
                label: row.field.label,
                note: marker.note,
              },
            ]
          : [],
      ),
    );
  }, [observationRows]);

  const selectedTextMarker =
    textMarkers.find((marker) => marker.key === selectedTextMarkerKey) ?? textMarkers[0] ?? null;

  const verticalLineBottom = geometry.rowsTop + geometry.rowsHeight;

  return (
    <section className="card chart-section-card">
      <div className="section-header chart-header-row">
        <div>
          <h2>推移グラフ</h2>
          <p>体重と食事量を1つの時系列表に重ね、下段に観察項目タイムラインを統合しました。</p>
        </div>

        <div className="chart-header-tools">
          <div className="chart-legend" aria-label="グラフ凡例">
            <span className="chart-legend-item">
              <span className="chart-legend-line weight" />体重
            </span>
            <span className="chart-legend-item">
              <span className="chart-legend-line food" />食事量
            </span>
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
      </div>

      {sortedRecords.length === 0 ? (
        <p className="empty-text">記録が増えると統合グラフで推移を確認できます。</p>
      ) : (
        <>
          <div className="chart-scroll-frame">
            <svg
              width={geometry.chartWidth}
              height={geometry.totalHeight}
              viewBox={`0 0 ${geometry.chartWidth} ${geometry.totalHeight}`}
              className="integrated-chart-svg"
              role="img"
              aria-label="体重と食事量、および観察項目の統合時系列グラフ"
            >
              <rect
                x={geometry.leftPadding}
                y={geometry.graphTop}
                width={geometry.innerWidth}
                height={geometry.graphHeight}
                className="chart-plot-background"
              />

              {Array.from({ length: geometry.dayCount }, (_, index) => {
                const date = addDays(rangeWindow.startDate, index);
                const x = geometry.leftPadding + (geometry.innerWidth / Math.max(geometry.dayCount - 1, 1)) * index;
                const showLabel = index === 0 || index === geometry.dayCount - 1 || index % geometry.labelStep === 0;
                return (
                  <g key={`day-${date}`}>
                    <line
                      x1={x}
                      y1={geometry.graphTop}
                      x2={x}
                      y2={verticalLineBottom}
                      className="chart-vertical-line"
                    />
                    {showLabel ? (
                      <text
                        x={x}
                        y={geometry.totalHeight - 8}
                        textAnchor="middle"
                        className="chart-date-label"
                      >
                        {formatShortDateLabel(date)}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {weightTicks.map((tick, index) => {
                const y = geometry.graphTop + (geometry.graphHeight / GRID_STEPS) * index;
                return (
                  <g key={`grid-${tick.value}`}>
                    <line
                      x1={geometry.leftPadding}
                      y1={y}
                      x2={geometry.chartWidth - geometry.rightPadding}
                      y2={y}
                      className="chart-grid-line"
                    />
                    <text
                      x={geometry.leftPadding - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="chart-tick-label weight-axis-label"
                    >
                      {tick.label}
                    </text>
                    {foodTicks[index] ? (
                      <text
                        x={geometry.chartWidth - geometry.rightPadding + 10}
                        y={y + 4}
                        textAnchor="start"
                        className="chart-tick-label food-axis-label"
                      >
                        {foodTicks[index].label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              <text
                x={geometry.leftPadding - 10}
                y={geometry.graphTop - 6}
                textAnchor="end"
                className="chart-axis-title weight-axis-label"
              >
                体重(kg)
              </text>
              <text
                x={geometry.chartWidth - geometry.rightPadding + 10}
                y={geometry.graphTop - 6}
                textAnchor="start"
                className="chart-axis-title food-axis-label"
              >
                食事量(g)
              </text>

              {weightPoints.length > 1 ? (
                <polyline
                  fill="none"
                  stroke="#5b7cfa"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={weightPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                />
              ) : null}
              {foodPoints.length > 1 ? (
                <polyline
                  fill="none"
                  stroke="#34b27b"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={foodPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                />
              ) : null}

              {weightPoints.map((point) => (
                <g key={`weight-${point.date}`}>
                  <circle cx={point.x} cy={point.y} r="5" className="chart-point weight-point" />
                  <title>{`${point.date} 体重 ${point.value.toFixed(1)}kg`}</title>
                </g>
              ))}
              {foodPoints.map((point) => (
                <g key={`food-${point.date}`}>
                  <circle cx={point.x} cy={point.y} r="5" className="chart-point food-point" />
                  <title>{`${point.date} 食事量 ${point.value.toFixed(0)}g`}</title>
                </g>
              ))}

              <line
                x1={geometry.leftPadding}
                y1={geometry.rowsTop - 12}
                x2={geometry.chartWidth - geometry.rightPadding}
                y2={geometry.rowsTop - 12}
                className="chart-section-divider"
              />

              {observationRows.length > 0 ? (
                observationRows.map((row, index) => {
                  const y = geometry.rowsTop + geometry.rowHeight * index + geometry.rowHeight / 2;
                  return (
                    <g key={row.field.id}>
                      <text
                        x={geometry.leftPadding - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="chart-tick-label observation-row-label"
                      >
                        {row.field.label}
                      </text>
                      <line
                        x1={geometry.leftPadding}
                        y1={y}
                        x2={geometry.chartWidth - geometry.rightPadding}
                        y2={y}
                        className="observation-row-line"
                      />

                      {row.markers.map((marker) => {
                        const x = geometry.getX(marker.date);
                        return marker.kind === "checkbox" ? (
                          <g key={`${row.field.id}-${marker.date}`}>
                            <circle cx={x} cy={y} r="8" className="observation-marker observation-marker-checkbox" />
                            <text x={x} y={y + 4} textAnchor="middle" className="observation-marker-label">
                              ✓
                            </text>
                            <title>{`${row.field.label}: ${marker.date}`}</title>
                          </g>
                        ) : (
                          <g
                            key={`${row.field.id}-${marker.date}`}
                            role="button"
                            tabIndex={0}
                            className="text-observation-marker-group"
                            onClick={() => setSelectedTextMarkerKey(`${row.field.id}-${marker.date}`)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedTextMarkerKey(`${row.field.id}-${marker.date}`);
                              }
                            }}
                          >
                            <rect
                              x={x - 9}
                              y={y - 9}
                              width="18"
                              height="18"
                              rx="4"
                              className={`observation-marker observation-marker-text${selectedTextMarkerKey === `${row.field.id}-${marker.date}` ? " active" : ""}`}
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
                })
              ) : (
                <text
                  x={geometry.leftPadding}
                  y={geometry.rowsTop + 14}
                  className="chart-tick-label"
                >
                  観察項目はまだありません。
                </text>
              )}
            </svg>
          </div>

          {textMarkers.length > 0 ? (
            <div className="chart-note-detail">
              <p className="chart-note-detail-title">選択中のメモ</p>
              {selectedTextMarker ? (
                <div className="chart-note-detail-body">
                  <strong>
                    {selectedTextMarker.date} / {selectedTextMarker.label}
                  </strong>
                  <p>{selectedTextMarker.note}</p>
                </div>
              ) : (
                <p className="observation-empty">メモ印を選ぶと内容を表示します。</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
