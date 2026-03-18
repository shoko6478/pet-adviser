import type {
  DailyObservationValue,
  DailyObservationValueId,
  ObservationValue,
} from "@/domain/models/daily-observation-value";
import type { DailyRecordId } from "@/domain/models/daily-record";
import type { PetId } from "@/domain/models/pet";
import type { DailyObservationValueRepository } from "@/domain/repositories/daily-observation-value-repository";

const DAILY_OBSERVATION_VALUES_KEY = "pet-adviser/daily-observation-values/v1";

function isObservationValue(value: unknown): value is ObservationValue {
  return typeof value === "string" || typeof value === "boolean";
}

function normalizeDailyObservationValue(value: unknown): DailyObservationValue | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<DailyObservationValue>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.petId !== "string" ||
    typeof raw.recordId !== "string" ||
    typeof raw.fieldDefinitionId !== "string" ||
    !isObservationValue(raw.value)
  ) {
    return null;
  }

  return {
    id: raw.id,
    petId: raw.petId,
    recordId: raw.recordId,
    fieldDefinitionId: raw.fieldDefinitionId,
    value: raw.value,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function parseDailyObservationValues(raw: string | null): DailyObservationValue[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeDailyObservationValue).filter((item): item is DailyObservationValue => item !== null)
      : [];
  } catch {
    return [];
  }
}

export class LocalDailyObservationValueRepository implements DailyObservationValueRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private readAll(): DailyObservationValue[] {
    return parseDailyObservationValues(this.storage?.getItem(DAILY_OBSERVATION_VALUES_KEY) ?? null);
  }

  private writeAll(values: DailyObservationValue[]): void {
    this.storage?.setItem(DAILY_OBSERVATION_VALUES_KEY, JSON.stringify(values));
  }

  async findByRecordId(recordId: DailyRecordId): Promise<DailyObservationValue[]> {
    return this.readAll().filter((value) => value.recordId === recordId);
  }

  async findById(id: DailyObservationValueId): Promise<DailyObservationValue | null> {
    return this.readAll().find((value) => value.id === id) ?? null;
  }

  async save(value: DailyObservationValue): Promise<void> {
    const values = this.readAll();
    const index = values.findIndex((item) => item.id === value.id);

    if (index >= 0) {
      values[index] = value;
    } else {
      values.push(value);
    }

    this.writeAll(values);
  }

  async delete(id: DailyObservationValueId): Promise<void> {
    this.writeAll(this.readAll().filter((value) => value.id !== id));
  }

  async deleteByRecordId(recordId: DailyRecordId): Promise<void> {
    this.writeAll(this.readAll().filter((value) => value.recordId !== recordId));
  }

  async deleteByPetId(petId: PetId): Promise<void> {
    this.writeAll(this.readAll().filter((value) => value.petId !== petId));
  }
}
