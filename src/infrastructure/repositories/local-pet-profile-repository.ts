import type { PetId } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import type { PetProfileRepository } from "@/domain/repositories/pet-profile-repository";

const PET_PROFILES_KEY = "pet-adviser/pet-profiles/v1";

function normalizeProfile(value: unknown): PetProfile | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<PetProfile> & { petId?: unknown };
  if (typeof raw.petId !== "string") {
    return null;
  }

  return {
    petId: raw.petId,
    birthMonth: typeof raw.birthMonth === "string" ? raw.birthMonth : undefined,
    sex:
      raw.sex === "male" || raw.sex === "female" || raw.sex === "unknown"
        ? raw.sex
        : undefined,
    breed: typeof raw.breed === "string" ? raw.breed : undefined,
    notes: typeof raw.notes === "string" ? raw.notes : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function parseProfiles(raw: string | null): PetProfile[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeProfile).filter((profile): profile is PetProfile => profile !== null)
      : [];
  } catch {
    return [];
  }
}

export class LocalPetProfileRepository implements PetProfileRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private readAll(): PetProfile[] {
    return parseProfiles(this.storage?.getItem(PET_PROFILES_KEY) ?? null);
  }

  private writeAll(profiles: PetProfile[]): void {
    this.storage?.setItem(PET_PROFILES_KEY, JSON.stringify(profiles));
  }

  async findByPetId(petId: PetId): Promise<PetProfile | null> {
    return this.readAll().find((profile) => profile.petId === petId) ?? null;
  }

  async save(profile: PetProfile): Promise<void> {
    const profiles = this.readAll();
    const index = profiles.findIndex((item) => item.petId === profile.petId);

    if (index >= 0) {
      profiles[index] = profile;
    } else {
      profiles.push(profile);
    }

    this.writeAll(profiles);
  }
}
