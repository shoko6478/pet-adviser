import type { PetId } from "@/domain/models/pet";

export type PetSex = "male" | "female" | "unknown";

export interface PetProfile {
  petId: PetId;
  birthMonth?: string;
  sex?: PetSex;
  breed?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
