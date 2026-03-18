import type { CatId } from "@/domain/models/cat";
import type {
  DailyRecord,
  DailyRecordId,
  RecordDate,
} from "@/domain/models/daily-record";

export interface DailyRecordRepository {
  findById(id: DailyRecordId): Promise<DailyRecord | null>;
  findByCatId(catId: CatId): Promise<DailyRecord[]>;
  findByCatIdAndDate(
    catId: CatId,
    date: RecordDate,
  ): Promise<DailyRecord | null>;
  save(record: DailyRecord): Promise<void>;
}
