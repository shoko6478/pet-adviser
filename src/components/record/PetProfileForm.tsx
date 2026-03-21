"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { PetType } from "@/domain/models/pet";
import type { PetSex } from "@/domain/models/pet-profile";
import { formatDateForInput } from "@/lib/utils/date";
import { resizeImageFile } from "@/lib/utils/image";

export interface PetProfileFormValues {
  name: string;
  type: PetType;
  birthMonth: string;
  sex: PetSex;
  sterilized: boolean;
  breed: string;
  photoDataUrl: string;
  notes: string;
}

interface PetProfileFormProps {
  values: PetProfileFormValues;
  isSaving: boolean;
  isEditing: boolean;
  onChange: (nextValues: PetProfileFormValues) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSubmit: (values: PetProfileFormValues) => Promise<void>;
  approximateAgeLabel: string | null;
  humanAgeLabel: string | null;
}

export function PetProfileForm({
  values,
  isSaving,
  isEditing,
  onChange,
  onStartEditing,
  onCancelEditing,
  onSubmit,
  approximateAgeLabel,
  humanAgeLabel,
}: PetProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  function updateValue<K extends keyof PetProfileFormValues>(
    key: K,
    value: PetProfileFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageError(null);
    setIsProcessingImage(true);

    try {
      const resized = await resizeImageFile(file, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.8,
      });
      updateValue("photoDataUrl", resized);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "画像の処理に失敗しました。");
    } finally {
      setIsProcessingImage(false);
      event.target.value = "";
    }
  }

  return (
    <form
      className="card profile-section-card"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(values);
      }}
    >
      <div className="section-header basic-info-section-header">
        <div>
          <h2>基本情報</h2>
        </div>
        {!isEditing ? (
          <button type="button" className="ghost-button basic-info-edit-button" onClick={onStartEditing}>
            編集する
          </button>
        ) : null}
      </div>

      <div className="profile-photo-editor profile-basic-overview">
        <div className="profile-photo-preview large">
          {values.photoDataUrl ? (
            <img src={values.photoDataUrl} alt="プロフィール写真" className="profile-photo-image" />
          ) : (
            <span>写真なし</span>
          )}
        </div>

        <div className="profile-photo-actions">
          <div className="profile-name-block">
            <strong>{values.name.trim() || "名前未設定"}</strong>
            <span>{values.type === "cat" ? "猫" : "犬"}</span>
          </div>

          {isEditing ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={handlePhotoChange}
              />
              <div className="button-row profile-photo-button-row">
                <button
                  type="button"
                  className="secondary-button inline-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                >
                  {isProcessingImage ? "画像を調整中..." : "写真を選ぶ"}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => updateValue("photoDataUrl", "")}
                  disabled={!values.photoDataUrl || isProcessingImage}
                >
                  写真を削除
                </button>
              </div>
              <p className="helper-text">画像は保存前に縮小され、LocalStorageの使用量を抑えます。</p>
              {imageError ? <p className="inline-error-text">{imageError}</p> : null}
            </>
          ) : null}
        </div>
      </div>

      <dl className="profile-summary-grid">
        <div className="profile-summary-card">
          <dt>誕生月</dt>
          <dd>{values.birthMonth || "未設定"}</dd>
        </div>
        <div className="profile-summary-card">
          <dt>現在年齢</dt>
          <dd>{approximateAgeLabel ?? "誕生月を登録すると表示されます"}</dd>
        </div>
        <div className="profile-summary-card">
          <dt>人間年齢の概算</dt>
          <dd>{humanAgeLabel ?? "誕生月を登録すると表示されます"}</dd>
        </div>
        <div className="profile-summary-card">
          <dt>性別</dt>
          <dd>
            {values.sex === "male" ? "オス" : values.sex === "female" ? "メス" : "不明"}
          </dd>
        </div>
        <div className="profile-summary-card">
          <dt>去勢/避妊</dt>
          <dd>{values.sterilized ? "済み" : "未実施 / 不明"}</dd>
        </div>
        <div className="profile-summary-card">
          <dt>品種・種類メモ</dt>
          <dd>{values.breed.trim() || "未設定"}</dd>
        </div>
      </dl>

      {values.notes.trim() ? (
        <section id="profile-note-panel" className="profile-note-panel" aria-label="基本情報メモ">
          <div className="compact-header">
            <h3>基本情報メモ</h3>
          </div>
          <p>{values.notes}</p>
        </section>
      ) : null}

      {isEditing ? (
        <div id="profile-edit-section" className="profile-edit-section">
          <div className="compact-header">
            <h3>基本情報を編集</h3>
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
                max={formatDateForInput(new Date()).slice(0, 7)}
                onChange={(event) => updateValue("birthMonth", event.target.value)}
              />
            </label>

            <label className="field">
              <span>性別</span>
              <select value={values.sex} onChange={(event) => updateValue("sex", event.target.value as PetSex)}>
                <option value="unknown">不明</option>
                <option value="male">オス</option>
                <option value="female">メス</option>
              </select>
            </label>
          </div>

          <div className="form-grid two-columns">
            <div className="field checkbox-card-field">
              <span>去勢/避妊</span>
              <label className="checkbox-field bordered">
                <input
                  type="checkbox"
                  checked={values.sterilized}
                  onChange={(event) => updateValue("sterilized", event.target.checked)}
                />
                <span>去勢/避妊済み</span>
              </label>
            </div>

            <label className="field">
              <span>品種・種類メモ</span>
              <input
                type="text"
                value={values.breed}
                onChange={(event) => updateValue("breed", event.target.value)}
                placeholder="例: 雑種、柴犬、キジトラなど"
              />
            </label>
          </div>

          <label className="field">
            <span>基本情報メモ</span>
            <textarea
              value={values.notes}
              rows={5}
              onChange={(event) => updateValue("notes", event.target.value)}
              placeholder="生活習慣や気になることなどを自由に記録できます。"
            />
          </label>

          <div className="button-row">
            <button type="button" className="ghost-button" onClick={onCancelEditing} disabled={isSaving || isProcessingImage}>
              キャンセル
            </button>
            <button type="submit" className="secondary-button" disabled={isSaving || isProcessingImage}>
              {isSaving ? "保存中..." : "基本情報を保存"}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
