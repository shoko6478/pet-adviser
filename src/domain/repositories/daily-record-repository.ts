import type { DailyRecord, DailyRecordId, RecordDate } from "@/domain/models/daily-record";
import type { PetId } from "@/domain/models/pet";

export interface DailyRecordRepository {
  findById(id: DailyRecordId): Promise<DailyRecord | null>;
  findByPetId(petId: PetId): Promise<DailyRecord[]>;
  findByPetIdAndDate(petId: PetId, date: RecordDate): Promise<DailyRecord | null>;
  save(record: DailyRecord): Promise<void>;
  delete(id: DailyRecordId): Promise<void>;
}
