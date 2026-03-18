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
import type { MedicalHistoryCategory, MedicalHistoryItem } from "@/domain/models/medical-history-item";
import { LocalDailyObservationValueRepository } from "@/infrastructure/repositories/local-daily-observation-value-repository";
import { LocalDailyRecordRepository } from "@/infrastructure/repositories/local-daily-record-repository";
import { LocalMedicalHistoryItemRepository } from "@/infrastructure/repositories/local-medical-history-item-repository";
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
const medicalHistoryItemRepository = new LocalMedicalHistoryItemRepository();

export const healthRecordService = new HealthRecordService(
  petRepository,
  petProfileRepository,
  dailyRecordRepository,
  observationFieldDefinitionRepository,
  dailyObservationValueRepository,
  medicalHistoryItemRepository,
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

function toNullableFieldValue(value: number | null): string {
  return value === null ? "" : String(value);
}

export function toRecordFormValues(record: DailyRecord): DailyRecordFormValues {
  return {
    date: record.date,
    weight: toNullableFieldValue(record.weight),
    food: toNullableFieldValue(record.food),
    toilet: toNullableFieldValue(record.toilet),
  };
}

export function toProfileFormValues(pet: Pet, profile: PetProfile): PetProfileFormValues {
  return {
    name: pet.name,
    type: pet.type,
    birthMonth: profile.birthMonth ?? "",
    sex: profile.sex ?? "unknown",
    sterilized: profile.sterilized ?? false,
    breed: profile.breed ?? "",
    photoDataUrl: profile.photoDataUrl ?? "",
    notes: profile.notes ?? "",
  };
}

export function getPetHref(petId: string, section: "profile" | "records") {
  return section === "records" ? `/pets/${petId}/records` : `/pets/${petId}`;
}

export interface MedicalHistoryFormValues {
  category: MedicalHistoryCategory;
  title: string;
  detail: string;
  startedAt: string;
  endedAt: string;
  isOngoing: boolean;
  hospitalName: string;
}

export const MEDICAL_HISTORY_CATEGORY_OPTIONS: MedicalHistoryCategory[] = [
  "病気",
  "ケガ",
  "手術",
  "アレルギー",
  "投薬歴",
  "その他",
];

export function createEmptyMedicalHistoryForm(): MedicalHistoryFormValues {
  return {
    category: "病気",
    title: "",
    detail: "",
    startedAt: "",
    endedAt: "",
    isOngoing: false,
    hospitalName: "",
  };
}

export function toMedicalHistoryFormValues(item: MedicalHistoryItem): MedicalHistoryFormValues {
  return {
    category: item.category,
    title: item.title,
    detail: item.detail ?? "",
    startedAt: item.startedAt ?? "",
    endedAt: item.endedAt ?? "",
    isOngoing: item.isOngoing,
    hospitalName: item.hospitalName ?? "",
  };
}
