import type { Cat } from "@/domain/models/cat";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { CatRepository } from "@/domain/repositories/cat-repository";
import type { DailyRecordRepository } from "@/domain/repositories/daily-record-repository";
import { createId } from "@/lib/utils/id";

export interface SaveDailyRecordInput {
  catId: string;
  date: string;
  weight: number;
  food: number;
  toilet: number;
}

export class HealthRecordService {
  constructor(
    private readonly catRepository: CatRepository,
    private readonly dailyRecordRepository: DailyRecordRepository,
  ) {}

  async getOrCreateDefaultCat(): Promise<Cat> {
    const cats = await this.catRepository.findAll();
    const existing = cats[0];

    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const cat: Cat = {
      id: createId("cat"),
      name: "うちの猫",
      createdAt: now,
      updatedAt: now,
    };

    await this.catRepository.save(cat);
    return cat;
  }

  async getDailyRecords(catId: string): Promise<DailyRecord[]> {
    return this.dailyRecordRepository.findByCatId(catId);
  }

  async saveDailyRecord(input: SaveDailyRecordInput): Promise<DailyRecord> {
    this.validateInput(input);

    const existing = await this.dailyRecordRepository.findByCatIdAndDate(
      input.catId,
      input.date,
    );
    const now = new Date().toISOString();

    const record: DailyRecord = existing
      ? {
          ...existing,
          date: input.date,
          weight: input.weight,
          food: input.food,
          toilet: input.toilet,
          updatedAt: now,
        }
      : {
          id: createId("record"),
          catId: input.catId,
          date: input.date,
          weight: input.weight,
          food: input.food,
          toilet: input.toilet,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        };

    await this.dailyRecordRepository.save(record);
    return record;
  }

  private validateInput(input: SaveDailyRecordInput): void {
    if (!input.date) {
      throw new Error("日付を入力してください。");
    }

    if (input.weight <= 0 || Number.isNaN(input.weight)) {
      throw new Error("体重は0より大きい数値を入力してください。");
    }

    if (input.food <= 0 || Number.isNaN(input.food)) {
      throw new Error("食事量は0より大きい数値を入力してください。");
    }

    if (input.toilet < 0 || Number.isNaN(input.toilet)) {
      throw new Error("トイレ回数は0以上の数値を入力してください。");
    }
  }
}
