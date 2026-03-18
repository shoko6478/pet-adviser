import type { PetId } from "./pet";

export type MedicalHistoryItemId = string;
export type MedicalHistoryCategory =
  | "病気"
  | "ケガ"
  | "手術"
  | "アレルギー"
  | "投薬歴"
  | "その他";
export type MedicalHistorySchemaVersion = 1;

export interface MedicalHistoryItem {
  id: MedicalHistoryItemId;
  petId: PetId;
  category: MedicalHistoryCategory;
  title: string;
  detail?: string;
  startedAt?: string;
  endedAt?: string;
  isOngoing: boolean;
  hospitalName?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: MedicalHistorySchemaVersion;
}
