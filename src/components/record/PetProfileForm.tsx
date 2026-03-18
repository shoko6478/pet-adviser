"use client";

import type { PetType } from "@/domain/models/pet";

export interface PetProfileFormValues {
  name: string;
  type: PetType;
  birthMonth: string;
  notes: string;
}

interface PetProfileFormProps {
  values: PetProfileFormValues;
  isSaving: boolean;
  onChange: (nextValues: PetProfileFormValues) => void;
  onSubmit: (values: PetProfileFormValues) => Promise<void>;
}

export function PetProfileForm({ values, isSaving, onChange, onSubmit }: PetProfileFormProps) {
  function updateValue<K extends keyof PetProfileFormValues>(
    key: K,
    value: PetProfileFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      className="card"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(values);
      }}
    >
      <div className="section-header">
        <h2>ペット基本情報</h2>
        <p>将来の相談機能で使いやすいように、基本情報と自由記述メモを分けて管理します。</p>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>名前</span>
          <input
            type="text"
            value={values.name}
            onChange={(event) => updateValue("name", event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>種別</span>
          <select
            value={values.type}
            onChange={(event) => updateValue("type", event.target.value as PetType)}
          >
            <option value="cat">猫</option>
            <option value="dog">犬</option>
          </select>
        </label>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>誕生月</span>
          <input
            type="month"
            value={values.birthMonth}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(event) => updateValue("birthMonth", event.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span>メモ</span>
        <textarea
          value={values.notes}
          rows={4}
          onChange={(event) => updateValue("notes", event.target.value)}
          placeholder="既往歴の要約や生活メモなど、将来のLLM連携で参照したい内容を自由に記録できます。"
        />
      </label>

      <button type="submit" className="secondary-button" disabled={isSaving}>
        {isSaving ? "保存中..." : "基本情報を保存"}
      </button>
    </form>
  );
}
