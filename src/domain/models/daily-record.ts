import type { PetId } from "./pet";

export type DailyRecordId = string;
export type RecordDate = string;
export type SchemaVersion = 1;

export interface DailyRecord {
  id: DailyRecordId;
  petId: PetId;
  date: RecordDate;
  weight: number;
  food: number;
  toilet: number;
  createdAt: string;
  updatedAt: string;
  schemaVersion: SchemaVersion;
}
