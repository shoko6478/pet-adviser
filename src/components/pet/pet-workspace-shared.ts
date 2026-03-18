import type { PetCreateFormValues } from "@/components/pet/PetCreateForm";
import type { DailyRecordFormValues } from "@/components/record/DailyRecordForm";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import { LocalDailyRecordRepository } from "@/infrastructure/repositories/local-daily-record-repository";
import { LocalPetProfileRepository } from "@/infrastructure/repositories/local-pet-profile-repository";
import { LocalPetRepository } from "@/infrastructure/repositories/local-pet-repository";
import { AnomalyService } from "@/services/anomaly-service";
import { HealthRecordService } from "@/services/health-record-service";
import type { PetProfileFormValues } from "@/components/record/PetProfileForm";

const petRepository = new LocalPetRepository();
const petProfileRepository = new LocalPetProfileRepository();
const dailyRecordRepository = new LocalDailyRecordRepository();

export const healthRecordService = new HealthRecordService(
  petRepository,
  petProfileRepository,
  dailyRecordRepository,
);

export const anomalyService = new AnomalyService();

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
