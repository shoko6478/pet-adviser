import type { Pet, PetId, PetType } from "@/domain/models/pet";
import type { PetRepository } from "@/domain/repositories/pet-repository";

const PETS_KEY = "pet-adviser/pets/v1";
const LEGACY_CATS_KEY = "pet-adviser/cats/v1";

function isPetType(value: unknown): value is PetType {
  return value === "cat" || value === "dog";
}

function normalizePet(value: unknown): Pet | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<Pet> & { id?: unknown; name?: unknown; type?: unknown };

  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    return null;
  }

  return {
    id: raw.id,
    type: isPetType(raw.type) ? raw.type : "cat",
    name: raw.name,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function parsePets(raw: string | null): Pet[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizePet).filter((pet): pet is Pet => pet !== null)
      : [];
  } catch {
    return [];
  }
}

export class LocalPetRepository implements PetRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private readAll(): Pet[] {
    const storage = this.storage;
    if (!storage) return [];

    const pets = parsePets(storage.getItem(PETS_KEY));
    if (pets.length > 0) {
      return pets;
    }

    const legacyCats = parsePets(storage.getItem(LEGACY_CATS_KEY));
    if (legacyCats.length > 0) {
      storage.setItem(PETS_KEY, JSON.stringify(legacyCats));
      return legacyCats;
    }

    return [];
  }

  private writeAll(pets: Pet[]): void {
    this.storage?.setItem(PETS_KEY, JSON.stringify(pets));
  }

  async findAll(): Promise<Pet[]> {
    return this.readAll();
  }

  async findById(id: PetId): Promise<Pet | null> {
    return this.readAll().find((pet) => pet.id === id) ?? null;
  }

  async save(pet: Pet): Promise<void> {
    const pets = this.readAll();
    const index = pets.findIndex((item) => item.id === pet.id);

    if (index >= 0) {
      pets[index] = pet;
    } else {
      pets.push(pet);
    }

    this.writeAll(pets);
  }

  async delete(id: PetId): Promise<void> {
    this.writeAll(this.readAll().filter((pet) => pet.id !== id));
  }
}
