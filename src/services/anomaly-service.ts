import type { DailyRecord } from "@/domain/models/daily-record";

export type AnomalyLevel = "normal" | "warning" | "alert";

export interface AnomalyResult {
  level: AnomalyLevel;
  message: string;
  averages: {
    weight: number | null;
    food: number | null;
    toilet: number | null;
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pickStrongerLevel(
  current: AnomalyLevel,
  next: AnomalyLevel,
): AnomalyLevel {
  const order: Record<AnomalyLevel, number> = {
    normal: 0,
    warning: 1,
    alert: 2,
  };

  return order[next] > order[current] ? next : current;
}

export class AnomalyService {
  evaluate(records: DailyRecord[], targetDate: string): AnomalyResult {
    const current =
      records.find((record) => record.date === targetDate) ?? null;

    if (!current) {
      return {
        level: "normal",
        message: "今日の記録を保存すると、異常判定を表示します。",
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

    if (previousRecords.length === 0) {
      return {
        level: "normal",
        message:
          "比較用の過去データがまだありません。3日分たまると比較できます。",
        averages,
      };
    }

    let level: AnomalyLevel = "normal";
    const messages: string[] = [];

    if (averages.food !== null && current.food < averages.food * 0.8) {
      level = pickStrongerLevel(level, "warning");
      messages.push("食事量が過去3日平均より少なめです。");
    }

    if (averages.toilet !== null && current.toilet > averages.toilet * 1.5) {
      level = pickStrongerLevel(level, "warning");
      messages.push("トイレ回数が過去3日平均より多めです。");
    }

    if (averages.weight !== null && current.weight < averages.weight * 0.95) {
      level = pickStrongerLevel(level, "alert");
      messages.push("体重が過去3日平均より大きく減っています。");
    }

    return {
      level,
      message: messages[0] ?? "過去3日平均と比べて大きな変化はありません。",
      averages,
    };
  }
}
