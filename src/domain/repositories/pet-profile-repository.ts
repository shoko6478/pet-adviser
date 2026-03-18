import type { PetId } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";

export interface PetProfileRepository {
  findByPetId(petId: PetId): Promise<PetProfile | null>;
  save(profile: PetProfile): Promise<void>;
}
