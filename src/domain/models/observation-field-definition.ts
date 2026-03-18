import type { PetId } from "@/domain/models/pet";

export type ObservationFieldDefinitionId = string;
export type ObservationFieldType = "checkbox" | "text";

export interface ObservationFieldDefinition {
  id: ObservationFieldDefinitionId;
  petId: PetId;
  label: string;
  type: ObservationFieldType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
