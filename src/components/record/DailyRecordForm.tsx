"use client";

import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import { getTodayDateString } from "@/lib/utils/date";

export interface DailyRecordFormValues {
  date: string;
  weight: string;
  food: string;
  toilet: string;
}

export type DailyObservationFormValues = Record<string, string | boolean>;

interface DailyRecordFormProps {
  values: DailyRecordFormValues;
  observationFields: ObservationFieldDefinition[];
  observationValues: DailyObservationFormValues;
  isSaving: boolean;
  submitLabel: string;
  onChange: (nextValues: DailyRecordFormValues) => void;
  onObservationValuesChange: (nextValues: DailyObservationFormValues) => void;
  onSubmit: (values: DailyRecordFormValues) => Promise<void>;
}

export function DailyRecordForm({
  values,
  observationFields,
  observationValues,
  isSaving,
  submitLabel,
  onChange,
  onObservationValuesChange,
  onSubmit,
}: DailyRecordFormProps) {
  function updateValue<K extends keyof DailyRecordFormValues>(
    key: K,
    value: DailyRecordFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function updateObservationValue(fieldId: string, value: string | boolean) {
    onObservationValuesChange({ ...observationValues, [fieldId]: value });
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(values);
      }}
      className="card"
    >
      <div className="section-header">
        <h2>日次記録</h2>
        <p>体重・食事量・トイレ回数のどれか1つ、または追加観察項目を入力すると保存できます。</p>
      </div>

      <div className="form-grid three-columns">
        <label className="field">
          <span>日付</span>
          <input
            type="date"
            max={getTodayDateString()}
            value={values.date}
            onChange={(event) => updateValue("date", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>体重 (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={values.weight}
            onChange={(event) => updateValue("weight", event.target.value)}
            placeholder="未入力でも可"
          />
        </label>

        <label className="field">
          <span>食事量 (g)</span>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            min="0"
            value={values.food}
            onChange={(event) => updateValue("food", event.target.value)}
            placeholder="未入力でも可"
          />
        </label>

        <label className="field">
          <span>トイレ回数</span>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={values.toilet}
            onChange={(event) => updateValue("toilet", event.target.value)}
            placeholder="未入力でも可"
          />
        </label>
      </div>

      {observationFields.length > 0 ? (
        <section className="observation-input-section">
          <div className="compact-header">
            <h3>追加観察項目</h3>
            <p>追加観察項目だけの記録も保存できます。</p>
          </div>

          <div className="form-grid two-columns">
            {observationFields.map((field) =>
              field.type === "checkbox" ? (
                <label key={field.id} className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={Boolean(observationValues[field.id])}
                    onChange={(event) => updateObservationValue(field.id, event.target.checked)}
                  />
                  <span>{field.label}</span>
                </label>
              ) : (
                <label key={field.id} className="field">
                  <span>{field.label}</span>
                  <input
                    type="text"
                    value={String(typeof observationValues[field.id] === "string" ? observationValues[field.id] : "")}
                    onChange={(event) => updateObservationValue(field.id, event.target.value)}
                    placeholder="自由にメモを入力"
                  />
                </label>
              ),
            )}
          </div>
        </section>
      ) : null}

      <button type="submit" className="primary-button" disabled={isSaving}>
        {isSaving ? "保存中..." : submitLabel}
      </button>
    </form>
  );
}
