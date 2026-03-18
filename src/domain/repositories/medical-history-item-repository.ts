import type { PetId } from "@/domain/models/pet";
import type {
  MedicalHistoryItem,
  MedicalHistoryItemId,
} from "@/domain/models/medical-history-item";

export interface MedicalHistoryItemRepository {
  findByPetId(petId: PetId): Promise<MedicalHistoryItem[]>;
  findById(id: MedicalHistoryItemId): Promise<MedicalHistoryItem | null>;
  save(item: MedicalHistoryItem): Promise<void>;
  delete(id: MedicalHistoryItemId): Promise<void>;
  deleteByPetId(petId: PetId): Promise<void>;
}
