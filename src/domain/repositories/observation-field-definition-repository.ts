import type {
  ObservationFieldDefinition,
  ObservationFieldDefinitionId,
} from "@/domain/models/observation-field-definition";
import type { PetId } from "@/domain/models/pet";

export interface ObservationFieldDefinitionRepository {
  findByPetId(petId: PetId): Promise<ObservationFieldDefinition[]>;
  findById(id: ObservationFieldDefinitionId): Promise<ObservationFieldDefinition | null>;
  save(definition: ObservationFieldDefinition): Promise<void>;
  delete(id: ObservationFieldDefinitionId): Promise<void>;
}
