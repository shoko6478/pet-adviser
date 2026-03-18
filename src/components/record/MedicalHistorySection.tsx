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

type SortDirection = "asc" | "desc";
type SortKey = "category" | "title" | "startedAt" | "endedAt" | "isOngoing" | "hospitalName";
type ColumnKey =
  | "category"
  | "title"
  | "startedAt"
  | "endedAt"
  | "isOngoing"
  | "hospitalName"
  | "detail"
  | "actions";

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const DETAIL_PREVIEW_LENGTH = 50;
const COLUMN_WIDTHS_STORAGE_KEY = "pet-adviser/medical-history-table-widths/v1";
const DEFAULT_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  category: 120,
  title: 220,
  startedAt: 120,
  endedAt: 120,
  isOngoing: 96,
  hospitalName: 180,
  detail: 320,
  actions: 140,
};
const MIN_COLUMN_WIDTHS: Record<ColumnKey, number> = {
  category: 96,
  title: 160,
  startedAt: 110,
  endedAt: 110,
  isOngoing: 88,
  hospitalName: 140,
  detail: 220,
  actions: 120,
};

function loadPersistedColumnWidths(): Partial<Record<ColumnKey, number>> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, unknown>>;
    return Object.fromEntries(
      Object.entries(DEFAULT_COLUMN_WIDTHS).flatMap(([key]) => {
        const width = parsed[key as ColumnKey];
        return typeof width === "number" && Number.isFinite(width) ? [[key, width]] : [];
      }),
    ) as Partial<Record<ColumnKey, number>>;
  } catch {
    return {};
  }
}

function savePersistedColumnWidths(widths: Record<ColumnKey, number>): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
}

function formatDate(value?: string): string {
  return value || "—";
}

function truncateDetail(value: string): string {
  return value.length > DETAIL_PREVIEW_LENGTH ? `${value.slice(0, DETAIL_PREVIEW_LENGTH)}...` : value;
}

function compareNullableText(left?: string, right?: string): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, "ja");
}

function compareNullableDate(left?: string, right?: string): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
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
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<MedicalHistoryItem | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => ({
    ...DEFAULT_COLUMN_WIDTHS,
    ...loadPersistedColumnWidths(),
  }));

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingItemId) ?? null,
    [editingItemId, items],
  );

  const sortedItems = useMemo(() => {
    if (!sortState) {
      return items;
    }

    const sorted = [...items].sort((left, right) => {
      switch (sortState.key) {
        case "category":
          return compareNullableText(left.category, right.category);
        case "title":
          return compareNullableText(left.title, right.title);
        case "startedAt":
          return compareNullableDate(left.startedAt, right.startedAt);
        case "endedAt":
          return compareNullableDate(left.endedAt, right.endedAt);
        case "isOngoing":
          return Number(left.isOngoing) - Number(right.isOngoing);
        case "hospitalName":
          return compareNullableText(left.hospitalName, right.hospitalName);
        default:
          return 0;
      }
    });

    return sortState.direction === "asc" ? sorted : sorted.reverse();
  }, [items, sortState]);

  useEffect(() => {
    if (!editingItem) {
      return;
    }

    setFormValues(toMedicalHistoryFormValues(editingItem));
  }, [editingItem]);

  useEffect(() => {
    if (!detailModalItem) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDetailModalItem(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailModalItem]);

  useEffect(() => {
    savePersistedColumnWidths(columnWidths);
  }, [columnWidths]);

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

  function toggleSort(key: SortKey) {
    setSortState((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }

      return null;
    });
  }

  function getSortIndicator(key: SortKey): string {
    if (!sortState || sortState.key !== key) {
      return "↕";
    }

    return sortState.direction === "asc" ? "▲" : "▼";
  }

  function startColumnResize(columnKey: ColumnKey, startX: number) {
    const startWidth = columnWidths[columnKey];

    function handleMouseMove(event: MouseEvent) {
      const deltaX = event.clientX - startX;
      const nextWidth = Math.max(MIN_COLUMN_WIDTHS[columnKey], startWidth + deltaX);
      setColumnWidths((current) => ({
        ...current,
        [columnKey]: nextWidth,
      }));
    }

    function handleMouseUp() {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
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
            <colgroup>
              <col style={{ width: `${columnWidths.category}px` }} />
              <col style={{ width: `${columnWidths.title}px` }} />
              <col style={{ width: `${columnWidths.startedAt}px` }} />
              <col style={{ width: `${columnWidths.endedAt}px` }} />
              <col style={{ width: `${columnWidths.isOngoing}px` }} />
              <col style={{ width: `${columnWidths.hospitalName}px` }} />
              <col style={{ width: `${columnWidths.detail}px` }} />
              <col style={{ width: `${columnWidths.actions}px` }} />
            </colgroup>
            <thead>
              <tr>
                <th className="medical-history-col-category">
                  <button type="button" className="table-sort-button" onClick={() => toggleSort("category")}>
                    <span>カテゴリ</span>
                    <span className="sort-indicator">{getSortIndicator("category")}</span>
                  </button>
                  <button
                    type="button"
                    className="column-resize-handle"
                    aria-label="カテゴリ列の幅を調整"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("category", event.clientX);
                    }}
                  />
                </th>
                <th className="medical-history-col-title">
                  <button type="button" className="table-sort-button" onClick={() => toggleSort("title")}>
                    <span>タイトル</span>
                    <span className="sort-indicator">{getSortIndicator("title")}</span>
                  </button>
                  <button
                    type="button"
                    className="column-resize-handle"
                    aria-label="タイトル列の幅を調整"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("title", event.clientX);
                    }}
                  />
                </th>
                <th className="medical-history-col-startedAt">
                  <button type="button" className="table-sort-button" onClick={() => toggleSort("startedAt")}>
                    <span>開始</span>
                    <span className="sort-indicator">{getSortIndicator("startedAt")}</span>
                  </button>
                  <button
                    type="button"
                    className="column-resize-handle"
                    aria-label="開始列の幅を調整"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("startedAt", event.clientX);
                    }}
                  />
                </th>
                <th className="medical-history-col-endedAt">
                  <button type="button" className="table-sort-button" onClick={() => toggleSort("endedAt")}>
                    <span>終了</span>
                    <span className="sort-indicator">{getSortIndicator("endedAt")}</span>
                  </button>
                  <button
                    type="button"
                    className="column-resize-handle"
                    aria-label="終了列の幅を調整"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("endedAt", event.clientX);
                    }}
                  />
                </th>
                <th className="medical-history-col-isOngoing">
                  <button type="button" className="table-sort-button" onClick={() => toggleSort("isOngoing")}>
                    <span>継続中</span>
                    <span className="sort-indicator">{getSortIndicator("isOngoing")}</span>
                  </button>
                </th>
                <th className="medical-history-col-hospitalName">
                  <button type="button" className="table-sort-button" onClick={() => toggleSort("hospitalName")}>
                    <span>病院名</span>
                    <span className="sort-indicator">{getSortIndicator("hospitalName")}</span>
                  </button>
                  <button
                    type="button"
                    className="column-resize-handle"
                    aria-label="病院名列の幅を調整"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("hospitalName", event.clientX);
                    }}
                  />
                </th>
                <th className="medical-history-col-detail">
                  <span>メモ</span>
                  <button
                    type="button"
                    className="column-resize-handle"
                    aria-label="メモ列の幅を調整"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      startColumnResize("detail", event.clientX);
                    }}
                  />
                </th>
                <th className="medical-history-col-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="カテゴリ" className="medical-history-col-category">{item.category}</td>
                  <td data-label="タイトル" className="medical-history-col-title">{item.title}</td>
                  <td data-label="開始" className="medical-history-col-startedAt">{formatDate(item.startedAt)}</td>
                  <td data-label="終了" className="medical-history-col-endedAt">{item.isOngoing ? "—" : formatDate(item.endedAt)}</td>
                  <td data-label="継続中" className="medical-history-col-isOngoing">{item.isOngoing ? "はい" : "いいえ"}</td>
                  <td data-label="病院名" className="medical-history-col-hospitalName">{item.hospitalName || "—"}</td>
                  <td data-label="メモ" className="medical-history-col-detail">
                    {item.detail ? (
                      <div className="medical-history-note-cell">
                        <span>{truncateDetail(item.detail)}</span>
                        {item.detail.length > DETAIL_PREVIEW_LENGTH ? (
                          <button
                            type="button"
                            className="ghost-button small-button"
                            onClick={() => setDetailModalItem(item)}
                            disabled={isSaving}
                          >
                            詳細
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td data-label="操作" className="medical-history-col-actions">
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

      {detailModalItem ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDetailModalItem(null);
            }
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="medical-history-detail-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">既往歴メモ</p>
                <h3 id="medical-history-detail-title">{detailModalItem.title}</h3>
              </div>
              <button
                type="button"
                className="ghost-button small-button"
                onClick={() => setDetailModalItem(null)}
              >
                閉じる
              </button>
            </div>
            <div className="modal-body">
              <p>{detailModalItem.detail}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
