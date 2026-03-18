import type {
  DailyObservationValue,
  DailyObservationValueId,
} from "@/domain/models/daily-observation-value";
import type { DailyRecordId } from "@/domain/models/daily-record";

export interface DailyObservationValueRepository {
  findByRecordId(recordId: DailyRecordId): Promise<DailyObservationValue[]>;
  findById(id: DailyObservationValueId): Promise<DailyObservationValue | null>;
  save(value: DailyObservationValue): Promise<void>;
}
