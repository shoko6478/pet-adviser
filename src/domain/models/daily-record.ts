import type { PetId } from "./pet";

export type DailyRecordId = string;
export type RecordDate = string;
export type SchemaVersion = 1;

export interface DailyRecord {
  id: DailyRecordId;
  petId: PetId;
  date: RecordDate;
  weight: number | null;
  food: number | null;
  toilet: number | null;
  createdAt: string;
  updatedAt: string;
  schemaVersion: SchemaVersion;
}
