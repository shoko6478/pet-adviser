import type { DailyRecord } from "@/domain/models/daily-record";

export type AnomalyLevel = "normal" | "warning" | "alert";
export type AnomalyMetric = "weight" | "food" | "toilet";

export interface AnomalySignal {
  metric: AnomalyMetric;
  level: Exclude<AnomalyLevel, "normal">;
  message: string;
}

export interface AnomalyResult {
  level: AnomalyLevel;
  message: string;
  signals: AnomalySignal[];
  averages: {
    weight: number | null;
    food: number | null;
    toilet: number | null;
  };
}

function average(values: Array<number | null>): number | null {
  const normalized = values.filter((value): value is number => value !== null);
  if (normalized.length === 0) return null;
  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function pickStrongerLevel(current: AnomalyLevel, next: AnomalyLevel): AnomalyLevel {
  const order: Record<AnomalyLevel, number> = {
    normal: 0,
    warning: 1,
    alert: 2,
  };

  return order[next] > order[current] ? next : current;
}

export class AnomalyService {
  evaluate(records: DailyRecord[], targetDate: string): AnomalyResult {
    const current = records.find((record) => record.date === targetDate) ?? null;

    if (!current) {
      return {
        level: "normal",
        message: "今日の記録を保存すると、異常判定を表示します。",
        signals: [],
        averages: { weight: null, food: null, toilet: null },
      };
    }

    const previousRecords = records
      .filter((record) => record.date < targetDate)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);

    const averages = {
      weight: average(previousRecords.map((record) => record.weight)),
      food: average(previousRecords.map((record) => record.food)),
      toilet: average(previousRecords.map((record) => record.toilet)),
    };

    if (current.weight === null && current.food === null && current.toilet === null) {
      return {
        level: "normal",
        message: "この日は追加観察項目のみ記録されています。主要な健康指標を入力すると比較できます。",
        signals: [],
        averages,
      };
    }

    if (previousRecords.length === 0) {
      return {
        level: "normal",
        message: "比較用の過去データがまだありません。3日分たまると比較できます。",
        signals: [],
        averages,
      };
    }

    let level: AnomalyLevel = "normal";
    const signals: AnomalySignal[] = [];

    if (averages.food !== null && current.food !== null && current.food < averages.food * 0.8) {
      level = pickStrongerLevel(level, "warning");
      signals.push({
        metric: "food",
        level: "warning",
        message: "食事量が過去3日平均より少なめです。",
      });
    }

    if (averages.toilet !== null && current.toilet !== null && current.toilet > averages.toilet * 1.5) {
      level = pickStrongerLevel(level, "warning");
      signals.push({
        metric: "toilet",
        level: "warning",
        message: "トイレ回数が過去3日平均より多めです。",
      });
    }

    if (averages.weight !== null && current.weight !== null && current.weight < averages.weight * 0.95) {
      level = pickStrongerLevel(level, "alert");
      signals.push({
        metric: "weight",
        level: "alert",
        message: "体重が過去3日平均より大きく減っています。",
      });
    }

    return {
      level,
      message: signals[0]?.message ?? "過去3日平均と比べて大きな変化はありません。",
      signals,
      averages,
    };
  }
}
