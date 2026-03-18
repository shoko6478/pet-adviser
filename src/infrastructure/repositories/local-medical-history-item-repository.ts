import type {
  MedicalHistoryCategory,
  MedicalHistoryItem,
} from "@/domain/models/medical-history-item";
import type { PetId } from "@/domain/models/pet";
import type { MedicalHistoryItemRepository } from "@/domain/repositories/medical-history-item-repository";

const MEDICAL_HISTORY_ITEMS_KEY = "pet-adviser/medical-history-items/v1";
const MEDICAL_HISTORY_CATEGORIES: MedicalHistoryCategory[] = [
  "病気",
  "ケガ",
  "手術",
  "アレルギー",
  "投薬歴",
  "その他",
];

function isMedicalHistoryCategory(value: unknown): value is MedicalHistoryCategory {
  return typeof value === "string" && MEDICAL_HISTORY_CATEGORIES.includes(value as MedicalHistoryCategory);
}

function normalizeMedicalHistoryItem(value: unknown): MedicalHistoryItem | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<MedicalHistoryItem> & {
    id?: unknown;
    petId?: unknown;
    title?: unknown;
    category?: unknown;
  };

  if (
    typeof raw.id !== "string" ||
    typeof raw.petId !== "string" ||
    typeof raw.title !== "string" ||
    !isMedicalHistoryCategory(raw.category)
  ) {
    return null;
  }

  return {
    id: raw.id,
    petId: raw.petId,
    category: raw.category,
    title: raw.title,
    detail: typeof raw.detail === "string" ? raw.detail : undefined,
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : undefined,
    endedAt: typeof raw.endedAt === "string" ? raw.endedAt : undefined,
    isOngoing: typeof raw.isOngoing === "boolean" ? raw.isOngoing : false,
    hospitalName: typeof raw.hospitalName === "string" ? raw.hospitalName : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    schemaVersion: raw.schemaVersion === 1 ? 1 : 1,
  };
}

function parseMedicalHistoryItems(raw: string | null): MedicalHistoryItem[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeMedicalHistoryItem)
          .filter((item): item is MedicalHistoryItem => item !== null)
      : [];
  } catch {
    return [];
  }
}

export class LocalMedicalHistoryItemRepository implements MedicalHistoryItemRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private readAll(): MedicalHistoryItem[] {
    return parseMedicalHistoryItems(this.storage?.getItem(MEDICAL_HISTORY_ITEMS_KEY) ?? null);
  }

  private writeAll(items: MedicalHistoryItem[]): void {
    this.storage?.setItem(MEDICAL_HISTORY_ITEMS_KEY, JSON.stringify(items));
  }

  async findByPetId(petId: PetId): Promise<MedicalHistoryItem[]> {
    return this.readAll().filter((item) => item.petId === petId);
  }

  async findById(id: string): Promise<MedicalHistoryItem | null> {
    return this.readAll().find((item) => item.id === id) ?? null;
  }

  async save(item: MedicalHistoryItem): Promise<void> {
    const items = this.readAll();
    const index = items.findIndex((current) => current.id === item.id);

    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }

    this.writeAll(items);
  }

  async delete(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((item) => item.id !== id));
  }

  async deleteByPetId(petId: PetId): Promise<void> {
    this.writeAll(this.readAll().filter((item) => item.petId !== petId));
  }
}
