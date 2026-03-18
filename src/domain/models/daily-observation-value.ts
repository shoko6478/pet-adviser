import type { DailyRecordId } from "@/domain/models/daily-record";
import type { ObservationFieldDefinitionId } from "@/domain/models/observation-field-definition";
import type { PetId } from "@/domain/models/pet";

export type DailyObservationValueId = string;
export type ObservationValue = string | boolean;

export interface DailyObservationValue {
  id: DailyObservationValueId;
  petId: PetId;
  recordId: DailyRecordId;
  fieldDefinitionId: ObservationFieldDefinitionId;
  value: ObservationValue;
  createdAt: string;
  updatedAt: string;
}
