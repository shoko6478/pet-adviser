"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createEmptyMedicalHistoryForm,
  MEDICAL_HISTORY_CATEGORY_OPTIONS,
  type MedicalHistoryFormValues,
  toMedicalHistoryFormValues,
} from "@/components/pet/pet-workspace-shared";
import type { MedicalHistoryItem } from "@/domain/models/medical-history-item";

interface MedicalHistorySectionProps {
  items: MedicalHistoryItem[];
  isSaving: boolean;
  onCreate: (values: MedicalHistoryFormValues) => Promise<void>;
  onUpdate: (id: string, values: MedicalHistoryFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatDate(value?: string): string {
  return value || "—";
}

function validateMedicalHistoryForm(values: MedicalHistoryFormValues): string | null {
  if (!values.category) {
    return "カテゴリを選択してください。";
  }

  if (!values.title.trim()) {
    return "タイトルを入力してください。";
  }

  if (values.startedAt && values.endedAt && !values.isOngoing && values.endedAt < values.startedAt) {
    return "終了日は開始日以降の日付を入力してください。";
  }

  return null;
}

export function MedicalHistorySection({
  items,
  isSaving,
  onCreate,
  onUpdate,
  onDelete,
}: MedicalHistorySectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<MedicalHistoryFormValues>(createEmptyMedicalHistoryForm);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? null,
    [editingItemId, items],
  );

  useEffect(() => {
    if (!editingItem) {
      return;
    }

    setFormValues(toMedicalHistoryFormValues(editingItem));
  }, [editingItem]);

  function updateValue<K extends keyof MedicalHistoryFormValues>(
    key: K,
    value: MedicalHistoryFormValues[K],
  ) {
    setInlineError(null);
    setFormValues((current) => {
      const nextValues = { ...current, [key]: value };
      if (key === "isOngoing" && value === true) {
        nextValues.endedAt = "";
      }
      return nextValues;
    });
  }

  function startCreate() {
    setInlineError(null);
    setEditingItemId(null);
    setFormValues(createEmptyMedicalHistoryForm());
    setIsCreating(true);
  }

  function startEdit(item: MedicalHistoryItem) {
    setInlineError(null);
    setIsCreating(false);
    setEditingItemId(item.id);
    setFormValues(toMedicalHistoryFormValues(item));
  }

  function cancelForm() {
    setInlineError(null);
    setIsCreating(false);
    setEditingItemId(null);
    setFormValues(createEmptyMedicalHistoryForm());
  }

  async function submitForm() {
    const validationError = validateMedicalHistoryForm(formValues);
    if (validationError) {
      setInlineError(validationError);
      return;
    }

    try {
      if (editingItemId) {
        await onUpdate(editingItemId, formValues);
      } else {
        await onCreate(formValues);
      }
      cancelForm();
    } catch {
      // 親コンポーネント側でエラー表示を行う
    }
  }

  return (
    <section className="card">
      <div className="section-header medical-history-header">
        <div>
          <h2>既往歴</h2>
          <p>病気や手術、アレルギー、通院歴などをペットごとにまとめて管理できます。</p>
        </div>
        {!isCreating && !editingItemId ? (
          <button type="button" className="secondary-button medical-history-add-button" onClick={startCreate}>
            既往歴を追加
          </button>
        ) : null}
      </div>

      {isCreating || editingItemId ? (
        <div className="medical-history-form-card">
          <div className="compact-header">
            <h3>{editingItemId ? "既往歴を編集" : "既往歴を追加"}</h3>
            <p>一覧には開始日の新しい順で表示されます。</p>
          </div>

          <div className="form-grid two-columns">
            <label className="field compact-field">
              <span>カテゴリ</span>
              <select
                value={formValues.category}
                onChange={(event) => updateValue("category", event.target.value as MedicalHistoryFormValues["category"])}
              >
                {MEDICAL_HISTORY_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="field compact-field">
              <span>タイトル</span>
              <input
                type="text"
                value={formValues.title}
                onChange={(event) => updateValue("title", event.target.value)}
                placeholder="例: 慢性腎臓病、去勢手術"
                required
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <label className="field compact-field">
              <span>開始</span>
              <input
                type="date"
                value={formValues.startedAt}
                onChange={(event) => updateValue("startedAt", event.target.value)}
              />
            </label>

            <label className="field compact-field">
              <span>終了</span>
              <input
                type="date"
                value={formValues.endedAt}
                onChange={(event) => updateValue("endedAt", event.target.value)}
                disabled={formValues.isOngoing}
              />
            </label>
          </div>

          <div className="form-grid two-columns">
            <div className="field compact-field checkbox-card-field">
              <span>継続状況</span>
              <label className="checkbox-field bordered">
                <input
                  type="checkbox"
                  checked={formValues.isOngoing}
                  onChange={(event) => updateValue("isOngoing", event.target.checked)}
                />
                <span>継続中</span>
              </label>
            </div>

            <label className="field compact-field">
              <span>病院名</span>
              <input
                type="text"
                value={formValues.hospitalName}
                onChange={(event) => updateValue("hospitalName", event.target.value)}
                placeholder="例: ○○動物病院"
              />
            </label>
          </div>

          <label className="field compact-field">
            <span>詳細</span>
            <textarea
              rows={3}
              value={formValues.detail}
              onChange={(event) => updateValue("detail", event.target.value)}
              placeholder="診断内容、経過、メモなど"
            />
          </label>

          {inlineError ? <p className="inline-error-text">{inlineError}</p> : null}

          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => void submitForm()} disabled={isSaving}>
              {isSaving ? "保存中..." : editingItemId ? "更新する" : "追加する"}
            </button>
            <button type="button" className="ghost-button" onClick={cancelForm} disabled={isSaving}>
              キャンセル
            </button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="empty-text">まだ既往歴は登録されていません。必要な情報を追加できます。</p>
      ) : (
        <div className="medical-history-table-wrap">
          <table className="medical-history-table">
            <thead>
              <tr>
                <th>カテゴリ</th>
                <th>タイトル</th>
                <th>開始</th>
                <th>終了</th>
                <th>継続中</th>
                <th>病院名</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="カテゴリ">{item.category}</td>
                  <td data-label="タイトル">
                    <div className="medical-history-title-cell">
                      <strong>{item.title}</strong>
                      {item.detail ? <p>{item.detail}</p> : null}
                    </div>
                  </td>
                  <td data-label="開始">{formatDate(item.startedAt)}</td>
                  <td data-label="終了">{item.isOngoing ? "—" : formatDate(item.endedAt)}</td>
                  <td data-label="継続中">{item.isOngoing ? "はい" : "いいえ"}</td>
                  <td data-label="病院名">{item.hospitalName || "—"}</td>
                  <td data-label="操作">
                    <div className="table-action-group">
                      <button
                        type="button"
                        className="ghost-button small-button"
                        onClick={() => startEdit(item)}
                        disabled={isSaving}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="danger-button small-button"
                        onClick={() => {
                          if (window.confirm(`「${item.title}」を削除します。よろしいですか？`)) {
                            void onDelete(item.id);
                          }
                        }}
                        disabled={isSaving}
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
