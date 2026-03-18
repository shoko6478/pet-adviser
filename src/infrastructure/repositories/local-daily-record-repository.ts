import type { CatId } from "@/domain/models/cat";
import type {
  DailyRecord,
  DailyRecordId,
  RecordDate,
} from "@/domain/models/daily-record";
import type { DailyRecordRepository } from "@/domain/repositories/daily-record-repository";
import { sortByDateDesc } from "@/lib/utils/date";

const DAILY_RECORDS_KEY = "pet-adviser/daily-records/v1";

function parseDailyRecords(raw: string | null): DailyRecord[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DailyRecord[]) : [];
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

  async findByCatId(catId: CatId): Promise<DailyRecord[]> {
    return sortByDateDesc(
      this.readAll().filter((record) => record.catId === catId),
    );
  }

  async findByCatIdAndDate(
    catId: CatId,
    date: RecordDate,
  ): Promise<DailyRecord | null> {
    return (
      this.readAll().find(
        (record) => record.catId === catId && record.date === date,
      ) ?? null
    );
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
}
