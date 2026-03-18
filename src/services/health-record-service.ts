import type { DailyRecord } from "@/domain/models/daily-record";
import type { Pet, PetId, PetType } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import type { DailyRecordRepository } from "@/domain/repositories/daily-record-repository";
import type { PetProfileRepository } from "@/domain/repositories/pet-profile-repository";
import type { PetRepository } from "@/domain/repositories/pet-repository";
import { createId } from "@/lib/utils/id";

const DEFAULT_PETS: Array<{ name: string; type: PetType }> = [
  { type: "cat", name: "みけ" },
  { type: "cat", name: "くろ" },
  { type: "dog", name: "たろう" },
];

export interface SaveDailyRecordInput {
  petId: PetId;
  date: string;
  weight: number;
  food: number;
  toilet: number;
}

export interface SavePetProfileInput {
  petId: PetId;
  name: string;
  type: PetType;
  birthMonth?: string;
  notes?: string;
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
  ) {}

  async getOrCreatePets(): Promise<Pet[]> {
    const existingPets = await this.petRepository.findAll();
    if (existingPets.length > 0) {
      return existingPets;
    }

    const now = new Date().toISOString();
    const createdPets = await Promise.all(
      DEFAULT_PETS.map(async (defaultPet) => {
        const pet: Pet = {
          id: createId(defaultPet.type),
          type: defaultPet.type,
          name: defaultPet.name,
          createdAt: now,
          updatedAt: now,
        };

        await this.petRepository.save(pet);
        await this.petProfileRepository.save({
          petId: pet.id,
          createdAt: now,
          updatedAt: now,
          notes: "",
        });

        return pet;
      }),
    );

    return createdPets;
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

  async saveDailyRecord(input: SaveDailyRecordInput): Promise<DailyRecord> {
    this.validateRecordInput(input);

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

  private validateRecordInput(input: SaveDailyRecordInput): void {
    if (!input.date) {
      throw new Error("日付を入力してください。");
    }

    if (input.date > new Date().toISOString().slice(0, 10)) {
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
