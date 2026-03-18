import type {
  DailyObservationValue,
  ObservationValue,
} from "@/domain/models/daily-observation-value";
import type { DailyRecord } from "@/domain/models/daily-record";
import type {
  ObservationFieldDefinition,
  ObservationFieldDefinitionId,
  ObservationFieldType,
} from "@/domain/models/observation-field-definition";
import type { Pet, PetId, PetType } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import type { DailyObservationValueRepository } from "@/domain/repositories/daily-observation-value-repository";
import type { DailyRecordRepository } from "@/domain/repositories/daily-record-repository";
import type { ObservationFieldDefinitionRepository } from "@/domain/repositories/observation-field-definition-repository";
import type { PetProfileRepository } from "@/domain/repositories/pet-profile-repository";
import type { PetRepository } from "@/domain/repositories/pet-repository";
import { getTodayDateString } from "@/lib/utils/date";
import { createId } from "@/lib/utils/id";

const DEFAULT_PETS: Array<{ name: string; type: PetType }> = [
  { type: "cat", name: "みけ" },
  { type: "cat", name: "くろ" },
  { type: "dog", name: "たろう" },
];

export interface CreatePetInput {
  name: string;
  type: PetType;
}

export interface SaveObservationValueInput {
  fieldDefinitionId: ObservationFieldDefinitionId;
  value: ObservationValue;
}

export interface SaveDailyRecordInput {
  petId: PetId;
  date: string;
  weight: number;
  food: number;
  toilet: number;
  observationValues?: SaveObservationValueInput[];
}

export interface SavePetProfileInput {
  petId: PetId;
  name: string;
  type: PetType;
  birthMonth?: string;
  notes?: string;
}

export interface CreateObservationFieldDefinitionInput {
  petId: PetId;
  label: string;
  type: ObservationFieldType;
}

export interface UpdateObservationFieldDefinitionInput {
  id: ObservationFieldDefinitionId;
  label?: string;
  type?: ObservationFieldType;
  sortOrder?: number;
}

export interface PetSnapshot {
  pet: Pet;
  profile: PetProfile;
}

export class HealthRecordService {
  constructor(
    private readonly petRepository: PetRepository,
    private readonly petProfileRepository: PetProfileRepository,
    private readonly dailyRecordRepository: DailyRecordRepository,
    private readonly observationFieldDefinitionRepository: ObservationFieldDefinitionRepository,
    private readonly dailyObservationValueRepository: DailyObservationValueRepository,
  ) {}

  async getOrCreatePets(): Promise<Pet[]> {
    const existingPets = await this.petRepository.findAll();
    if (existingPets.length > 0) {
      return existingPets;
    }

    const createdPets = await Promise.all(DEFAULT_PETS.map((defaultPet) => this.createPet(defaultPet)));
    return createdPets.map((snapshot) => snapshot.pet);
  }

  async createPet(input: CreatePetInput): Promise<PetSnapshot> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error("ペット名を入力してください。");
    }

    const now = new Date().toISOString();
    const pet: Pet = {
      id: createId(input.type),
      type: input.type,
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
    };

    const profile: PetProfile = {
      petId: pet.id,
      createdAt: now,
      updatedAt: now,
      notes: "",
    };

    await this.petRepository.save(pet);
    await this.petProfileRepository.save(profile);

    return { pet, profile };
  }

  async getPetSnapshot(petId: PetId): Promise<PetSnapshot | null> {
    const pet = await this.petRepository.findById(petId);
    if (!pet) return null;

    const profile = await this.getOrCreatePetProfile(pet.id);
    return { pet, profile };
  }

  async savePetProfile(input: SavePetProfileInput): Promise<PetSnapshot> {
    const pet = await this.petRepository.findById(input.petId);
    if (!pet) {
      throw new Error("対象のペットが見つかりませんでした。");
    }

    if (!input.name.trim()) {
      throw new Error("ペット名を入力してください。");
    }

    if (input.birthMonth && !/^\d{4}-\d{2}$/.test(input.birthMonth)) {
      throw new Error("誕生月は YYYY-MM 形式で入力してください。");
    }

    const now = new Date().toISOString();
    const nextPet: Pet = {
      ...pet,
      name: input.name.trim(),
      type: input.type,
      updatedAt: now,
    };

    const existingProfile = await this.getOrCreatePetProfile(input.petId);
    const nextProfile: PetProfile = {
      ...existingProfile,
      birthMonth: input.birthMonth || undefined,
      notes: input.notes?.trim() ?? "",
      updatedAt: now,
    };

    await this.petRepository.save(nextPet);
    await this.petProfileRepository.save(nextProfile);

    return { pet: nextPet, profile: nextProfile };
  }

  async getDailyRecords(petId: PetId): Promise<DailyRecord[]> {
    return this.dailyRecordRepository.findByPetId(petId);
  }

  async getObservationFieldDefinitions(petId: PetId): Promise<ObservationFieldDefinition[]> {
    return this.observationFieldDefinitionRepository.findByPetId(petId);
  }

  async createObservationFieldDefinition(
    input: CreateObservationFieldDefinitionInput,
  ): Promise<ObservationFieldDefinition> {
    const trimmedLabel = input.label.trim();
    if (!trimmedLabel) {
      throw new Error("観察項目名を入力してください。");
    }

    const existingDefinitions = await this.getObservationFieldDefinitions(input.petId);
    const now = new Date().toISOString();
    const definition: ObservationFieldDefinition = {
      id: createId("obs-field"),
      petId: input.petId,
      label: trimmedLabel,
      type: input.type,
      sortOrder: existingDefinitions.reduce((maxSortOrder, definition) => Math.max(maxSortOrder, definition.sortOrder), -1) + 1,
      createdAt: now,
      updatedAt: now,
    };

    await this.observationFieldDefinitionRepository.save(definition);
    return definition;
  }

  async updateObservationFieldDefinition(
    input: UpdateObservationFieldDefinitionInput,
  ): Promise<ObservationFieldDefinition> {
    const existing = await this.observationFieldDefinitionRepository.findById(input.id);
    if (!existing) {
      throw new Error("観察項目が見つかりませんでした。");
    }

    const nextLabel = input.label !== undefined ? input.label.trim() : existing.label;
    if (!nextLabel) {
      throw new Error("観察項目名を入力してください。");
    }

    const nextDefinition: ObservationFieldDefinition = {
      ...existing,
      label: nextLabel,
      type: input.type ?? existing.type,
      sortOrder: input.sortOrder ?? existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };

    await this.observationFieldDefinitionRepository.save(nextDefinition);
    return nextDefinition;
  }

  async deleteObservationFieldDefinition(id: ObservationFieldDefinitionId): Promise<void> {
    await this.observationFieldDefinitionRepository.delete(id);
  }

  async getDailyObservationValues(recordId: string): Promise<DailyObservationValue[]> {
    return this.dailyObservationValueRepository.findByRecordId(recordId);
  }

  async saveDailyRecord(input: SaveDailyRecordInput): Promise<DailyRecord> {
    this.validateRecordInput(input);

    const definitions = await this.getObservationFieldDefinitions(input.petId);
    const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]));
    const existing = await this.dailyRecordRepository.findByPetIdAndDate(input.petId, input.date);
    const now = new Date().toISOString();

    const record: DailyRecord = existing
      ? {
          ...existing,
          date: input.date,
          weight: input.weight,
          food: input.food,
          toilet: input.toilet,
          updatedAt: now,
        }
      : {
          id: createId("record"),
          petId: input.petId,
          date: input.date,
          weight: input.weight,
          food: input.food,
          toilet: input.toilet,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        };

    await this.dailyRecordRepository.save(record);

    const existingObservationValues = await this.dailyObservationValueRepository.findByRecordId(record.id);

    for (const observationInput of input.observationValues ?? []) {
      const definition = definitionMap.get(observationInput.fieldDefinitionId);
      if (!definition) {
        continue;
      }

      const existingValue = existingObservationValues.find(
        (value) => value.fieldDefinitionId === observationInput.fieldDefinitionId,
      );

      const normalizedValue = this.normalizeObservationValue(observationInput.value, definition.type);
      const valueToSave: DailyObservationValue = existingValue
        ? {
            ...existingValue,
            value: normalizedValue,
            updatedAt: now,
          }
        : {
            id: createId("obs-value"),
            petId: input.petId,
            recordId: record.id,
            fieldDefinitionId: definition.id,
            value: normalizedValue,
            createdAt: now,
            updatedAt: now,
          };

      await this.dailyObservationValueRepository.save(valueToSave);
    }

    return record;
  }

  private async getOrCreatePetProfile(petId: PetId): Promise<PetProfile> {
    const existing = await this.petProfileRepository.findByPetId(petId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const profile: PetProfile = {
      petId,
      createdAt: now,
      updatedAt: now,
      notes: "",
    };

    await this.petProfileRepository.save(profile);
    return profile;
  }

  private normalizeObservationValue(value: ObservationValue, type: ObservationFieldType): ObservationValue {
    return type === "checkbox" ? Boolean(value) : String(value).trim();
  }

  private validateRecordInput(input: SaveDailyRecordInput): void {
    if (!input.date) {
      throw new Error("日付を入力してください。");
    }

    if (input.date > getTodayDateString()) {
      throw new Error("未来日の記録は保存できません。");
    }

    if (input.weight <= 0 || Number.isNaN(input.weight)) {
      throw new Error("体重は0より大きい数値を入力してください。");
    }

    if (input.food <= 0 || Number.isNaN(input.food)) {
      throw new Error("食事量は0より大きい数値を入力してください。");
    }

    if (input.toilet < 0 || Number.isNaN(input.toilet)) {
      throw new Error("トイレ回数は0以上の数値を入力してください。");
    }
  }
}
