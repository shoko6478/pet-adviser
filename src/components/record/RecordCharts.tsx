"use client";

import { useEffect, useMemo, useState } from "react";
import type { DailyObservationValue } from "@/domain/models/daily-observation-value";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import {
  addDays,
  diffDays,
  formatShortDateLabel,
  getDayOfWeek,
  getTodayDateString,
} from "@/lib/utils/date";

interface RecordChartsProps {
  records: DailyRecord[];
  observationFields: ObservationFieldDefinition[];
  observationValuesByRecordId: Record<string, DailyObservationValue[]>;
}

type RangeOption = 7 | 30;

type ValueDomain = {
  min: number;
  max: number;
  step: number;
};

type Tick = {
  value: number;
  label: string;
};

type ObservationMarker = {
  date: string;
  kind: "checkbox";
};

type MemoMarker = {
  date: string;
  notes: Array<{
    label: string;
    note: string;
  }>;
};

const RANGE_OPTIONS: RangeOption[] = [7, 30];
const GRID_STEPS = 4;
const EXTRA_FUTURE_DAYS = 2;
const SLOT_WIDTH = 56;

function createValueDomain(values: number[], minValue: number): ValueDomain {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin;
  const padding = rawRange > 0 ? rawRange * 0.15 : Math.max(rawMax * 0.1, 0.5);
  const paddedMin = Math.max(minValue, rawMin - padding);
  const paddedMax = rawMax + padding;
  const step = getNiceStep((paddedMax - paddedMin) / GRID_STEPS);
  const min = Math.floor(paddedMin / step) * step;
  let max = Math.ceil(paddedMax / step) * step;

  if (max <= min) {
    max = min + step * GRID_STEPS;
  }

  return { min, max, step };
}

function getNiceStep(roughStep: number): number {
  if (!Number.isFinite(roughStep) || roughStep <= 0) {
    return 0.5;
  }

  const exponent = Math.floor(Math.log10(roughStep));
  const base = 10 ** exponent;
  const normalized = roughStep / base;

  if (normalized <= 1) return 1 * base;
  if (normalized <= 2) return 2 * base;
  if (normalized <= 2.5) return 2.5 * base;
  if (normalized <= 5) return 5 * base;
  return 10 * base;
}

function getTickPrecision(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.5) return 1;
  return 2;
}

function createTicks(domain: ValueDomain): Tick[] {
  const tickCount = Math.round((domain.max - domain.min) / domain.step);
  const precision = getTickPrecision(domain.step);

  return Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = domain.min + domain.step * index;
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

function formatTooltipDateLabel(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${month}月${day}日`;
}

function formatMetricValue(value: number | null, unit: string, digits: number) {
  return value === null ? "—" : `${value.toFixed(digits)}${unit}`;
}

export function RecordCharts({
  records,
  observationFields,
  observationValuesByRecordId,
}: RecordChartsProps) {
  const [selectedRange, setSelectedRange] = useState<RangeOption>(7);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [selectedMemoDate, setSelectedMemoDate] = useState<string | null>(null);

  const today = getTodayDateString();

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
    const anchorEndDate = [sortedRecords[sortedRecords.length - 1]?.date ?? today, today].sort().at(-1) ?? today;
    const startDate = addDays(anchorEndDate, -(selectedRange - 1));
    const displayEndDate = addDays(anchorEndDate, EXTRA_FUTURE_DAYS);
    const displayDayCount = diffDays(startDate, displayEndDate) + 1;
    const slots = Array.from({ length: displayDayCount }, (_, index) => addDays(startDate, index));
    const filteredRecords = sortedRecords.filter((record) => record.date >= startDate && record.date <= displayEndDate);

    return { startDate, anchorEndDate, displayEndDate, displayDayCount, slots, filteredRecords };
  }, [selectedRange, sortedRecords, today]);

  const recordsByDate = useMemo(
    () => Object.fromEntries(rangeWindow.filteredRecords.map((record) => [record.date, record])),
    [rangeWindow.filteredRecords],
  );

  const checkboxObservationFields = useMemo(
    () => sortedObservationFields.filter((field) => field.type === "checkbox"),
    [sortedObservationFields],
  );

  const textObservationFields = useMemo(
    () => sortedObservationFields.filter((field) => field.type === "text"),
    [sortedObservationFields],
  );

  const memoMarkers = useMemo(() => {
    return rangeWindow.filteredRecords.reduce<MemoMarker[]>((accumulator, record) => {
      const notes = textObservationFields.flatMap((field) => {
        const observationValue = getObservationValue(observationValuesByRecordId, record.id, field.id);
        const note = typeof observationValue?.value === "string" ? observationValue.value.trim() : "";
        return note ? [{ label: field.label, note }] : [];
      });

      if (notes.length > 0) {
        accumulator.push({
          date: record.date,
          notes,
        });
      }

      return accumulator;
    }, []);
  }, [observationValuesByRecordId, rangeWindow.filteredRecords, textObservationFields]);

  const geometry = useMemo(() => {
    const fixedLeftWidth = 124;
    const fixedRightWidth = 88;
    const graphTop = 18;
    const graphHeight = 220;
    const rowHeight = 34;
    const rowsTop = graphTop + graphHeight + 26;
    const rowCount = Math.max(checkboxObservationFields.length + (memoMarkers.length > 0 ? 1 : 0), 1);
    const rowsHeight = rowCount * rowHeight;
    const dateAxisHeight = 44;
    const totalHeight = rowsTop + rowsHeight + dateAxisHeight;
    const plotWidth = rangeWindow.displayDayCount * SLOT_WIDTH;

    return {
      fixedLeftWidth,
      fixedRightWidth,
      graphTop,
      graphHeight,
      rowHeight,
      rowsTop,
      rowsHeight,
      totalHeight,
      plotWidth,
      getSlotX(date: string) {
        return diffDays(rangeWindow.startDate, date) * SLOT_WIDTH;
      },
      getSlotCenter(date: string) {
        return diffDays(rangeWindow.startDate, date) * SLOT_WIDTH + SLOT_WIDTH / 2;
      },
    };
  }, [checkboxObservationFields.length, memoMarkers.length, rangeWindow.displayDayCount, rangeWindow.startDate]);

  const weightValues = rangeWindow.filteredRecords.flatMap((record) => (record.weight === null ? [] : [record.weight]));
  const foodValues = rangeWindow.filteredRecords.flatMap((record) => (record.food === null ? [] : [record.food]));
  const weightDomain = weightValues.length > 0 ? createValueDomain(weightValues, 0) : null;
  const foodDomain = foodValues.length > 0 ? createValueDomain(foodValues, 0) : null;
  const weightTicks = weightDomain ? createTicks(weightDomain) : [];
  const foodTicks = foodDomain ? createTicks(foodDomain) : [];

  const weightPoints = rangeWindow.filteredRecords.flatMap((record) => {
    if (record.weight === null || !weightDomain) return [];
    return [{
      date: record.date,
      value: record.weight,
      x: geometry.getSlotCenter(record.date),
      y: getPointY(record.weight, weightDomain, geometry.graphTop, geometry.graphHeight),
    }];
  });

  const foodPoints = rangeWindow.filteredRecords.flatMap((record) => {
    if (record.food === null || !foodDomain) return [];
    return [{
      date: record.date,
      value: record.food,
      x: geometry.getSlotCenter(record.date),
      y: getPointY(record.food, foodDomain, geometry.graphTop, geometry.graphHeight),
    }];
  });

  const observationRows = useMemo(() => {
    return checkboxObservationFields.map((field) => {
      const markers = rangeWindow.filteredRecords.reduce<ObservationMarker[]>((accumulator, record) => {
        const observationValue = getObservationValue(observationValuesByRecordId, record.id, field.id);
        if (!observationValue) {
          return accumulator;
        }

        if (observationValue.value === true) {
          accumulator.push({ date: record.date, kind: "checkbox" });
        }

        return accumulator;
      }, []);

      return { field, markers };
    });
  }, [checkboxObservationFields, observationValuesByRecordId, rangeWindow.filteredRecords]);

  const activeRecord = activeDate ? recordsByDate[activeDate] ?? null : null;
  const activeObservationSummary = activeDate
    ? observationRows.flatMap((row) => {
        const marker = row.markers.find((item) => item.date === activeDate);
        if (!marker) {
          return [];
        }

        return [
          row.field.type === "checkbox"
            ? `${row.field.label}: 実施あり`
            : `${row.field.label}: メモあり`,
        ];
      })
    : [];
  const activeMemoSummary =
    activeDate && memoMarkers.some((marker) => marker.date === activeDate) ? ["健康メモ: あり"] : [];

  const selectedMemoMarker = selectedMemoDate
    ? memoMarkers.find((marker) => marker.date === selectedMemoDate) ?? null
    : null;

  const hasMemoRow = memoMarkers.length > 0;
  const memoRowY = hasMemoRow
    ? geometry.rowsTop + geometry.rowHeight * observationRows.length + geometry.rowHeight / 2
    : null;

  const activeDateX = activeDate ? geometry.getSlotCenter(activeDate) : null;
  const todayX = rangeWindow.slots.includes(today) ? geometry.getSlotX(today) : null;
  const gridBottom = geometry.rowsTop + geometry.rowsHeight;

  useEffect(() => {
    if (!selectedMemoDate) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedMemoDate(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMemoDate]);

  useEffect(() => {
    if (selectedMemoDate && !memoMarkers.some((marker) => marker.date === selectedMemoDate)) {
      setSelectedMemoDate(null);
    }
  }, [memoMarkers, selectedMemoDate]);

  return (
    <section className="card chart-section-card">
      <div className="section-header chart-header-row compact-chart-header">
        <h2>推移グラフ</h2>

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
        <p className="empty-text">記録が増えるとグラフで推移を確認できます。</p>
      ) : (
        <>
          <div className="fixed-axis-chart-shell">
            <div className="fixed-axis-chart-left" aria-hidden="true">
              <svg width={geometry.fixedLeftWidth} height={geometry.totalHeight} className="fixed-axis-svg">
                {weightTicks.map((tick) => {
                  const y = weightDomain
                    ? getPointY(tick.value, weightDomain, geometry.graphTop, geometry.graphHeight)
                    : geometry.graphTop;
                  return (
                    <g key={`left-${tick.value}`}>
                      <text
                        x={geometry.fixedLeftWidth - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="chart-tick-label weight-axis-label"
                      >
                        {tick.label}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={geometry.fixedLeftWidth - 12}
                  y={geometry.graphTop - 6}
                  textAnchor="end"
                  className="chart-axis-title weight-axis-label"
                >
                  体重(kg)
                </text>

                {observationRows.length > 0 || hasMemoRow ? (
                  observationRows.map((row, index) => {
                    const y = geometry.rowsTop + geometry.rowHeight * index + geometry.rowHeight / 2;
                    return (
                      <text
                        key={row.field.id}
                        x={geometry.fixedLeftWidth - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="chart-tick-label observation-row-label"
                      >
                        {row.field.label}
                      </text>
                    );
                  }).concat(
                    hasMemoRow && memoRowY !== null
                      ? [
                          <text
                            key="memo-row-label"
                            x={geometry.fixedLeftWidth - 12}
                            y={memoRowY + 4}
                            textAnchor="end"
                            className="chart-tick-label observation-row-label"
                          >
                            メモ
                          </text>,
                        ]
                      : [],
                  )
                ) : (
                  <text
                    x={geometry.fixedLeftWidth - 12}
                    y={geometry.rowsTop + 14}
                    textAnchor="end"
                    className="chart-tick-label"
                  >
                    観察項目
                  </text>
                )}
              </svg>
            </div>

            <div className="fixed-axis-chart-scroll" role="presentation">
              <div className="chart-scroll-frame">
                <div className="plot-scroll-inner" style={{ width: geometry.plotWidth }}>
                  {activeDate && activeDateX !== null ? (
                    <div
                      className="chart-tooltip"
                      style={{ left: Math.min(Math.max(activeDateX + 12, 8), geometry.plotWidth - 196) }}
                    >
                      <strong>{formatTooltipDateLabel(activeDate)}</strong>
                      <span>体重: {formatMetricValue(activeRecord?.weight ?? null, "kg", 1)}</span>
                      <span>食事量: {formatMetricValue(activeRecord?.food ?? null, "g", 0)}</span>
                      <span>トイレ回数: {formatMetricValue(activeRecord?.toilet ?? null, "回", 0)}</span>
                      {activeObservationSummary.map((summary) => (
                        <span key={summary}>{summary}</span>
                      ))}
                      {activeMemoSummary.map((summary) => (
                        <span key={summary}>{summary}</span>
                      ))}
                    </div>
                  ) : null}

                  <svg
                    width={geometry.plotWidth}
                    height={geometry.totalHeight}
                    viewBox={`0 0 ${geometry.plotWidth} ${geometry.totalHeight}`}
                    className="integrated-chart-svg"
                    role="img"
                    aria-label="体重と食事量、および観察項目の統合時系列グラフ"
                  >
                    <rect
                      x={0}
                      y={geometry.graphTop}
                      width={geometry.plotWidth}
                      height={geometry.graphHeight}
                      className="chart-plot-background"
                    />

                    {todayX !== null ? (
                      <rect
                        x={todayX}
                        y={geometry.graphTop}
                        width={SLOT_WIDTH}
                        height={gridBottom - geometry.graphTop}
                        className="today-column-highlight"
                      />
                    ) : null}

                    {weightTicks.map((tick) => {
                      const y = weightDomain
                        ? getPointY(tick.value, weightDomain, geometry.graphTop, geometry.graphHeight)
                        : geometry.graphTop;
                      return (
                        <line
                          key={`grid-${tick.value}`}
                          x1={0}
                          y1={y}
                          x2={geometry.plotWidth}
                          y2={y}
                          className="chart-grid-line"
                        />
                      );
                    })}

                    {rangeWindow.slots.map((date, index) => {
                      const slotX = index * SLOT_WIDTH;
                      const centerX = slotX + SLOT_WIDTH / 2;
                      const isToday = date === today;
                      const isMajorTick = selectedRange === 30 ? getDayOfWeek(date) === 0 : true;
                      return (
                        <g key={date}>
                          <line
                            x1={centerX}
                            y1={geometry.graphTop}
                            x2={centerX}
                            y2={gridBottom}
                            className={`chart-vertical-line${isToday ? " today" : ""}`}
                          />
                          <line
                            x1={centerX}
                            y1={gridBottom + 4}
                            x2={centerX}
                            y2={gridBottom + (isMajorTick ? 12 : 8)}
                            className={`chart-date-tick${isMajorTick ? " major" : " minor"}${isToday ? " today" : ""}`}
                          />
                          {isMajorTick ? (
                            <text
                              x={centerX}
                              y={geometry.totalHeight - 8}
                              textAnchor="middle"
                              className={`chart-date-label${isToday ? " today" : ""}`}
                            >
                              {formatShortDateLabel(date)}
                            </text>
                          ) : null}
                        </g>
                      );
                    })}

                    {activeDateX !== null ? (
                      <line
                        x1={activeDateX}
                        y1={geometry.graphTop}
                        x2={activeDateX}
                        y2={gridBottom}
                        className="chart-hover-line"
                      />
                    ) : null}

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
                      <circle key={`weight-${point.date}`} cx={point.x} cy={point.y} r="5" className="chart-point weight-point" />
                    ))}
                    {foodPoints.map((point) => (
                      <circle key={`food-${point.date}`} cx={point.x} cy={point.y} r="5" className="chart-point food-point" />
                    ))}

                    <line
                      x1={0}
                      y1={geometry.rowsTop - 12}
                      x2={geometry.plotWidth}
                      y2={geometry.rowsTop - 12}
                      className="chart-section-divider"
                    />

                    {observationRows.length > 0
                      ? observationRows.map((row, index) => {
                          const y = geometry.rowsTop + geometry.rowHeight * index + geometry.rowHeight / 2;
                          return (
                            <g key={row.field.id}>
                              <line
                                x1={0}
                                y1={y}
                                x2={geometry.plotWidth}
                                y2={y}
                                className="observation-row-line"
                              />

                              {row.markers.map((marker) => {
                                const x = geometry.getSlotCenter(marker.date);
                                return (
                                  <g key={`${row.field.id}-${marker.date}`}>
                                    <circle cx={x} cy={y} r="8" className="observation-marker observation-marker-checkbox" />
                                    <text x={x} y={y + 4} textAnchor="middle" className="observation-marker-label">
                                      ✓
                                    </text>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })
                      : null}

                    {rangeWindow.slots.map((date) => (
                      <rect
                        key={`hover-${date}`}
                        x={geometry.getSlotX(date)}
                        y={0}
                        width={SLOT_WIDTH}
                        height={gridBottom}
                        className="chart-hover-hitbox"
                        onMouseEnter={() => setActiveDate(date)}
                        onMouseLeave={() => setActiveDate(null)}
                        onPointerDown={() => setActiveDate(date)}
                      />
                    ))}

                    {hasMemoRow && memoRowY !== null
                      ? memoMarkers.map((marker) => {
                          const x = geometry.getSlotCenter(marker.date);
                          const isSelected = selectedMemoDate === marker.date;
                          return (
                            <g
                              key={`memo-${marker.date}`}
                              role="button"
                              tabIndex={0}
                              className="chart-memo-marker-group"
                              onClick={() => setSelectedMemoDate(marker.date)}
                              onMouseEnter={() => setActiveDate(marker.date)}
                              onFocus={() => setActiveDate(marker.date)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedMemoDate(marker.date);
                                }
                              }}
                            >
                              <rect
                                x={x - 10}
                                y={memoRowY - 10}
                                width="20"
                                height="20"
                                rx="5"
                                className={`observation-marker chart-memo-marker${isSelected ? " active" : ""}`}
                              />
                              <text x={x} y={memoRowY + 4} textAnchor="middle" className="observation-marker-label">
                                メ
                              </text>
                            </g>
                          );
                        })
                      : null}
                  </svg>
                </div>
              </div>
            </div>

            <div className="fixed-axis-chart-right" aria-hidden="true">
              <svg width={geometry.fixedRightWidth} height={geometry.totalHeight} className="fixed-axis-svg">
                {foodTicks.map((tick) => {
                  const y = foodDomain
                    ? getPointY(tick.value, foodDomain, geometry.graphTop, geometry.graphHeight)
                    : geometry.graphTop;
                  return (
                    <text
                      key={`right-${tick.value}`}
                      x={12}
                      y={y + 4}
                      textAnchor="start"
                      className="chart-tick-label food-axis-label"
                    >
                      {tick.label}
                    </text>
                  );
                })}

                <text
                  x={12}
                  y={geometry.graphTop - 6}
                  textAnchor="start"
                  className="chart-axis-title food-axis-label"
                >
                  食事量(g)
                </text>
              </svg>
            </div>
          </div>

          {selectedMemoMarker ? (
            <div
              className="modal-backdrop"
              role="presentation"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedMemoDate(null);
                }
              }}
            >
              <div className="modal-card chart-memo-modal" role="dialog" aria-modal="true" aria-labelledby="chart-memo-title">
                <div className="modal-header">
                  <div>
                    <p className="chart-note-detail-title">健康記録メモ</p>
                    <h3 id="chart-memo-title">{selectedMemoMarker.date}</h3>
                  </div>
                  <button type="button" className="ghost-button small-button" onClick={() => setSelectedMemoDate(null)}>
                    閉じる
                  </button>
                </div>
                <div className="modal-body chart-memo-modal-body">
                  {selectedMemoMarker.notes.map((item) => (
                    <section key={`${selectedMemoMarker.date}-${item.label}`} className="chart-memo-entry">
                      <strong>{item.label}</strong>
                      <p>{item.note}</p>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
