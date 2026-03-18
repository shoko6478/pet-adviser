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
  isDeleting: boolean;
  onChange: (nextValues: PetProfileFormValues) => void;
  onSubmit: (values: PetProfileFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function PetProfileForm({
  values,
  isSaving,
  isDeleting,
  onChange,
  onSubmit,
  onDelete,
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
    <>
      <form
        className="card"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(values);
        }}
      >
        <div className="section-header">
          <h2>ペット基本情報</h2>
          <p>プロフィール写真や年齢の目安に使う項目をまとめて管理できます。</p>
        </div>

        <div className="profile-photo-editor">
          <div className="profile-photo-preview large">
            {values.photoDataUrl ? (
              <img src={values.photoDataUrl} alt="プロフィール写真" className="profile-photo-image" />
            ) : (
              <span>写真なし</span>
            )}
          </div>

          <div className="profile-photo-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={handlePhotoChange}
            />
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
            <p className="helper-text">画像は保存前に縮小され、LocalStorageの使用量を抑えます。</p>
            {imageError ? <p className="inline-error-text">{imageError}</p> : null}
          </div>
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
            <span>性別</span>
            <select value={values.sex} onChange={(event) => updateValue("sex", event.target.value as PetSex)}>
              <option value="unknown">不明</option>
              <option value="male">オス</option>
              <option value="female">メス</option>
            </select>
          </label>

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
        </div>

        <div className="form-grid two-columns">
          <label className="field">
            <span>品種・種類メモ</span>
            <input
              type="text"
              value={values.breed}
              onChange={(event) => updateValue("breed", event.target.value)}
              placeholder="例: 雑種、柴犬、キジトラなど"
            />
          </label>

          <label className="field">
            <span>誕生月</span>
            <input
              type="month"
              value={values.birthMonth}
              max={formatDateForInput(new Date()).slice(0, 7)}
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
            placeholder="生活習慣や気になることなどを自由に記録できます。"
          />
        </label>

        <button type="submit" className="secondary-button" disabled={isSaving || isDeleting || isProcessingImage}>
          {isSaving ? "保存中..." : "基本情報を保存"}
        </button>
      </form>

      <section className="card danger-zone-card">
        <div className="section-header">
          <h2>ペット削除</h2>
          <p>このペットの基本情報・既往歴・健康記録・追加観察項目をまとめて削除します。</p>
        </div>
        <button type="button" className="danger-button" onClick={() => void onDelete()} disabled={isDeleting || isSaving}>
          {isDeleting ? "削除中..." : "このペットを削除"}
        </button>
      </section>
    </>
  );
}
