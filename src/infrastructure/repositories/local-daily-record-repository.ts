import type { DailyRecord, DailyRecordId, RecordDate } from "@/domain/models/daily-record";
import type { PetId } from "@/domain/models/pet";
import type { DailyRecordRepository } from "@/domain/repositories/daily-record-repository";
import { sortByDateDesc } from "@/lib/utils/date";

const DAILY_RECORDS_KEY = "pet-adviser/daily-records/v1";

function normalizeRecord(value: unknown): DailyRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<DailyRecord> & { id?: unknown; petId?: unknown; catId?: unknown };
  const petId = typeof raw.petId === "string" ? raw.petId : typeof raw.catId === "string" ? raw.catId : null;

  if (
    typeof raw.id !== "string" ||
    typeof petId !== "string" ||
    typeof raw.date !== "string" ||
    typeof raw.weight !== "number" ||
    typeof raw.food !== "number" ||
    typeof raw.toilet !== "number"
  ) {
    return null;
  }

  return {
    id: raw.id,
    petId,
    date: raw.date,
    weight: raw.weight,
    food: raw.food,
    toilet: raw.toilet,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    schemaVersion: 1,
  };
}

function parseDailyRecords(raw: string | null): DailyRecord[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(normalizeRecord).filter((record): record is DailyRecord => record !== null)
      : [];
  } catch {
    return [];
  }
}

export class LocalDailyRecordRepository implements DailyRecordRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private readAll(): DailyRecord[] {
    return parseDailyRecords(this.storage?.getItem(DAILY_RECORDS_KEY) ?? null);
  }

  private writeAll(records: DailyRecord[]): void {
    this.storage?.setItem(DAILY_RECORDS_KEY, JSON.stringify(records));
  }

  async findById(id: DailyRecordId): Promise<DailyRecord | null> {
    return this.readAll().find((record) => record.id === id) ?? null;
  }

  async findByPetId(petId: PetId): Promise<DailyRecord[]> {
    return sortByDateDesc(this.readAll().filter((record) => record.petId === petId));
  }

  async findByPetIdAndDate(petId: PetId, date: RecordDate): Promise<DailyRecord | null> {
    return this.readAll().find((record) => record.petId === petId && record.date === date) ?? null;
  }

  async save(record: DailyRecord): Promise<void> {
    const records = this.readAll();
    const index = records.findIndex((item) => item.id === record.id);

    if (index >= 0) {
      records[index] = record;
    } else {
      records.push(record);
    }

    this.writeAll(records);
  }

  async delete(id: DailyRecordId): Promise<void> {
    this.writeAll(this.readAll().filter((record) => record.id !== id));
  }
}
