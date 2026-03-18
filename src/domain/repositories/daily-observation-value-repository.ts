import type {
  DailyObservationValue,
  DailyObservationValueId,
} from "@/domain/models/daily-observation-value";
import type { DailyRecordId } from "@/domain/models/daily-record";
import type { PetId } from "@/domain/models/pet";

export interface DailyObservationValueRepository {
  findByRecordId(recordId: DailyRecordId): Promise<DailyObservationValue[]>;
  findById(id: DailyObservationValueId): Promise<DailyObservationValue | null>;
  save(value: DailyObservationValue): Promise<void>;
  delete(id: DailyObservationValueId): Promise<void>;
  deleteByRecordId(recordId: DailyRecordId): Promise<void>;
  deleteByPetId(petId: PetId): Promise<void>;
}
