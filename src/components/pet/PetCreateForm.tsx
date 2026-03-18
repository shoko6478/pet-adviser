"use client";

import type { PetType } from "@/domain/models/pet";

export interface PetCreateFormValues {
  name: string;
  type: PetType;
}

interface PetCreateFormProps {
  values: PetCreateFormValues;
  isSaving: boolean;
  onChange: (values: PetCreateFormValues) => void;
  onSubmit: (values: PetCreateFormValues) => Promise<void>;
}

export function PetCreateForm({ values, isSaving, onChange, onSubmit }: PetCreateFormProps) {
  function update<K extends keyof PetCreateFormValues>(key: K, value: PetCreateFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      className="pet-create-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(values);
      }}
    >
      <div className="section-header compact-header">
        <h3>ペット追加</h3>
        <p>名前と種別だけで登録できます。</p>
      </div>

      <label className="field compact-field">
        <span>名前</span>
        <input
          type="text"
          value={values.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder="例: はな"
          required
        />
      </label>

      <label className="field compact-field">
        <span>種別</span>
        <select value={values.type} onChange={(event) => update("type", event.target.value as PetType)}>
          <option value="cat">猫</option>
          <option value="dog">犬</option>
        </select>
      </label>

      <button type="submit" className="secondary-button" disabled={isSaving}>
        {isSaving ? "追加中..." : "ペットを追加"}
      </button>
    </form>
  );
}
