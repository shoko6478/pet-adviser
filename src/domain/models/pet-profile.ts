import type { PetId } from "@/domain/models/pet";

export type PetSex = "male" | "female" | "unknown";

export interface PetProfile {
  petId: PetId;
  birthMonth?: string;
  sex?: PetSex;
  sterilized?: boolean;
  breed?: string;
  photoDataUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
