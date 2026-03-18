import type { PetCreateFormValues } from "@/components/pet/PetCreateForm";
import type {
  DailyObservationFormValues,
  DailyRecordFormValues,
} from "@/components/record/DailyRecordForm";
import type { DailyObservationValue } from "@/domain/models/daily-observation-value";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import { LocalDailyObservationValueRepository } from "@/infrastructure/repositories/local-daily-observation-value-repository";
import { LocalDailyRecordRepository } from "@/infrastructure/repositories/local-daily-record-repository";
import { LocalObservationFieldDefinitionRepository } from "@/infrastructure/repositories/local-observation-field-definition-repository";
import { LocalPetProfileRepository } from "@/infrastructure/repositories/local-pet-profile-repository";
import { LocalPetRepository } from "@/infrastructure/repositories/local-pet-repository";
import { AnomalyService } from "@/services/anomaly-service";
import { HealthRecordService } from "@/services/health-record-service";
import type { PetProfileFormValues } from "@/components/record/PetProfileForm";

const petRepository = new LocalPetRepository();
const petProfileRepository = new LocalPetProfileRepository();
const dailyRecordRepository = new LocalDailyRecordRepository();
const observationFieldDefinitionRepository = new LocalObservationFieldDefinitionRepository();
const dailyObservationValueRepository = new LocalDailyObservationValueRepository();

export const healthRecordService = new HealthRecordService(
  petRepository,
  petProfileRepository,
  dailyRecordRepository,
  observationFieldDefinitionRepository,
  dailyObservationValueRepository,
);

export const anomalyService = new AnomalyService();

export function createEmptyObservationValues(
  definitions: ObservationFieldDefinition[],
): DailyObservationFormValues {
  return definitions.reduce<DailyObservationFormValues>((accumulator, definition) => {
    accumulator[definition.id] = definition.type === "checkbox" ? false : "";
    return accumulator;
  }, {});
}

export function mergeObservationValues(
  definitions: ObservationFieldDefinition[],
  values: DailyObservationValue[],
): DailyObservationFormValues {
  const defaults = createEmptyObservationValues(definitions);

  for (const value of values) {
    if (value.fieldDefinitionId in defaults) {
      defaults[value.fieldDefinitionId] = value.value;
    }
  }

  return defaults;
}

export function createEmptyRecordForm(date: string): DailyRecordFormValues {
  return {
    date,
    weight: "",
    food: "",
    toilet: "",
  };
}

export function createEmptyPetCreateForm(): PetCreateFormValues {
  return {
    name: "",
    type: "cat",
  };
}

export function toRecordFormValues(record: DailyRecord): DailyRecordFormValues {
  return {
    date: record.date,
    weight: String(record.weight),
    food: String(record.food),
    toilet: String(record.toilet),
  };
}

export function toProfileFormValues(pet: Pet, profile: PetProfile): PetProfileFormValues {
  return {
    name: pet.name,
    type: pet.type,
    birthMonth: profile.birthMonth ?? "",
    notes: profile.notes ?? "",
  };
}

export function getPetHref(petId: string, section: "profile" | "records") {
  return section === "records" ? `/pets/${petId}/records` : `/pets/${petId}`;
}
