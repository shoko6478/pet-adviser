import type { Pet, PetId } from "@/domain/models/pet";

export interface PetRepository {
  findAll(): Promise<Pet[]>;
  findById(id: PetId): Promise<Pet | null>;
  save(pet: Pet): Promise<void>;
  delete(id: PetId): Promise<void>;
}
