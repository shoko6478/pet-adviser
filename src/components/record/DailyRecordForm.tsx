"use client";

export interface DailyRecordFormValues {
  date: string;
  weight: string;
  food: string;
  toilet: string;
}

interface DailyRecordFormProps {
  values: DailyRecordFormValues;
  isSaving: boolean;
  onChange: (nextValues: DailyRecordFormValues) => void;
  onSubmit: (values: DailyRecordFormValues) => Promise<void>;
}

export function DailyRecordForm({
  values,
  isSaving,
  onChange,
  onSubmit,
}: DailyRecordFormProps) {
  function updateValue<K extends keyof DailyRecordFormValues>(
    key: K,
    value: DailyRecordFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
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
        <h2>今日の記録</h2>
        <p>
          日次の体調メモを残します。日付を切り替えると既存記録の編集もできます。
        </p>
      </div>

      <label className="field">
        <span>日付</span>
        <input
          type="date"
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
          required
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
          required
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
          required
        />
      </label>

      <button type="submit" className="primary-button" disabled={isSaving}>
        {isSaving ? "保存中..." : "記録を保存"}
      </button>
    </form>
  );
}
