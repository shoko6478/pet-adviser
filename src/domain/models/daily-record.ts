import type { CatId } from "./cat";

export type DailyRecordId = string;
export type RecordDate = string;
export type SchemaVersion = 1;

export interface DailyRecord {
  id: DailyRecordId;
  catId: CatId;
  date: RecordDate;
  weight: number;
  food: number;
  toilet: number;
  createdAt: string;
  updatedAt: string;
  schemaVersion: SchemaVersion;
}
