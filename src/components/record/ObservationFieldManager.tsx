"use client";

import { useMemo, useState } from "react";
import type {
  ObservationFieldDefinition,
  ObservationFieldType,
} from "@/domain/models/observation-field-definition";

interface ObservationFieldManagerProps {
  definitions: ObservationFieldDefinition[];
  isSaving: boolean;
  onCreate: (input: { label: string; type: ObservationFieldType }) => Promise<boolean>;
  onMove: (definitionId: string, direction: "up" | "down") => Promise<void>;
  onDelete: (definitionId: string) => Promise<void>;
}

export function ObservationFieldManager({
  definitions,
  isSaving,
  onCreate,
  onMove,
  onDelete,
}: ObservationFieldManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ObservationFieldType>("checkbox");

  const sortedDefinitions = useMemo(
    () => [...definitions].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [definitions],
  );

  function startCreate() {
    setIsCreating(true);
  }

  function cancelCreate() {
    setIsCreating(false);
    setLabel("");
    setType("checkbox");
  }

  return (
    <section className="card">
      <div className="section-header observation-manager-header">
        <div>
          <h2>観察項目</h2>
          <p>ペットごとに、健康記録へ追加表示するチェック項目や自由記述メモを管理できます。</p>
        </div>
        {sortedDefinitions.length > 0 && !isCreating ? (
          <button type="button" className="secondary-button observation-manager-add-button" onClick={startCreate}>
            観察項目を追加
          </button>
        ) : null}
      </div>

      {sortedDefinitions.length === 0 ? (
        <div className="empty-action-stack">
          <p className="empty-text">まだ観察項目はありません。必要な項目を追加してください。</p>
          {!isCreating ? (
            <button type="button" className="secondary-button section-empty-add-button" onClick={startCreate}>
              観察項目を追加
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="observation-definition-list">
          {sortedDefinitions.map((definition, index) => (
            <li key={definition.id} className="observation-definition-item">
              <div>
                <strong>{definition.label}</strong>
                <p>
                  type: {definition.type} / sortOrder: {definition.sortOrder}
                </p>
              </div>

              <div className="observation-definition-actions">
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isSaving || index === 0}
                  onClick={async () => onMove(definition.id, "up")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isSaving || index === sortedDefinitions.length - 1}
                  onClick={async () => onMove(definition.id, "down")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={isSaving}
                  onClick={async () => onDelete(definition.id)}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isCreating ? (
        <form
          className="observation-manager-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const created = await onCreate({ label, type });
            if (created) {
              cancelCreate();
            }
          }}
        >
          <div className="form-grid two-columns">
            <label className="field compact-field">
              <span>項目名</span>
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="例: 散歩に行ったか"
                required
              />
            </label>

            <label className="field compact-field">
              <span>入力形式</span>
              <select value={type} onChange={(event) => setType(event.target.value as ObservationFieldType)}>
                <option value="checkbox">checkbox</option>
                <option value="text">text</option>
              </select>
            </label>
          </div>

          <div className="button-row">
            <button type="submit" className="secondary-button" disabled={isSaving}>
              {isSaving ? "追加中..." : "追加する"}
            </button>
            <button type="button" className="ghost-button" onClick={cancelCreate} disabled={isSaving}>
              キャンセル
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
