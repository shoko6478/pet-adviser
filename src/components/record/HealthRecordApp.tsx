"use client";

import { useEffect, useMemo, useState } from "react";
import { AnomalySummary } from "@/components/record/AnomalySummary";
import {
  DailyRecordForm,
  type DailyRecordFormValues,
} from "@/components/record/DailyRecordForm";
import { DailyRecordList } from "@/components/record/DailyRecordList";
import type { Cat } from "@/domain/models/cat";
import type { DailyRecord } from "@/domain/models/daily-record";
import { LocalCatRepository } from "@/infrastructure/repositories/local-cat-repository";
import { LocalDailyRecordRepository } from "@/infrastructure/repositories/local-daily-record-repository";
import { getTodayDateString } from "@/lib/utils/date";
import { AnomalyService } from "@/services/anomaly-service";
import { HealthRecordService } from "@/services/health-record-service";

const catRepository = new LocalCatRepository();
const dailyRecordRepository = new LocalDailyRecordRepository();
const healthRecordService = new HealthRecordService(
  catRepository,
  dailyRecordRepository,
);
const anomalyService = new AnomalyService();

function createEmptyForm(date: string): DailyRecordFormValues {
  return {
    date,
    weight: "",
    food: "",
    toilet: "",
  };
}

function toFormValues(record: DailyRecord): DailyRecordFormValues {
  return {
    date: record.date,
    weight: String(record.weight),
    food: String(record.food),
    toilet: String(record.toilet),
  };
}

export function HealthRecordApp() {
  const today = getTodayDateString();
  const [cat, setCat] = useState<Cat | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [formValues, setFormValues] = useState<DailyRecordFormValues>(() =>
    createEmptyForm(today),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const defaultCat = await healthRecordService.getOrCreateDefaultCat();
      const dailyRecords = await healthRecordService.getDailyRecords(
        defaultCat.id,
      );
      const todayRecord =
        dailyRecords.find((record) => record.date === today) ?? null;

      setCat(defaultCat);
      setRecords(dailyRecords);
      setFormValues(
        todayRecord ? toFormValues(todayRecord) : createEmptyForm(today),
      );
    } catch {
      setErrorMessage(
        "データの読み込みに失敗しました。ブラウザを再読み込みしてください。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [today]);

  const anomalyResult = useMemo(() => {
    return anomalyService.evaluate(records, formValues.date);
  }, [formValues.date, records]);

  function syncFormWithDate(date: string, dailyRecords: DailyRecord[]) {
    const matched = dailyRecords.find((record) => record.date === date) ?? null;
    setFormValues(matched ? toFormValues(matched) : createEmptyForm(date));
  }

  if (isLoading) {
    return (
      <main className="page-shell">
        <p className="status-text">読み込み中...</p>
      </main>
    );
  }

  if (!cat) {
    return (
      <main className="page-shell">
        <p className="status-text">猫プロフィールを作成できませんでした。</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Pet Adviser</p>
          <h1>{cat.name} の健康記録</h1>
          <p className="hero-copy">
            体重・食事量・トイレ回数を毎日記録して、ちょっとした変化に気づけるMVPです。
          </p>
        </div>
      </section>

      {errorMessage ? (
        <div className="feedback error">{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className="feedback success">{successMessage}</div>
      ) : null}

      <DailyRecordForm
        values={formValues}
        isSaving={isSaving}
        onChange={(nextValues) => {
          setSuccessMessage(null);
          setFormValues((current) => {
            if (current.date === nextValues.date) {
              return nextValues;
            }

            const matched =
              records.find((record) => record.date === nextValues.date) ?? null;
            return matched
              ? toFormValues(matched)
              : createEmptyForm(nextValues.date);
          });
        }}
        onSubmit={async (values) => {
          setIsSaving(true);
          setErrorMessage(null);
          setSuccessMessage(null);

          try {
            const saved = await healthRecordService.saveDailyRecord({
              catId: cat.id,
              date: values.date,
              weight: Number(values.weight),
              food: Number(values.food),
              toilet: Number(values.toilet),
            });

            const nextRecords = await healthRecordService.getDailyRecords(
              cat.id,
            );
            setRecords(nextRecords);
            syncFormWithDate(saved.date, nextRecords);
            setSuccessMessage(`${saved.date} の記録を保存しました。`);
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "記録の保存に失敗しました。",
            );
          } finally {
            setIsSaving(false);
          }
        }}
      />

      <AnomalySummary result={anomalyResult} targetDate={formValues.date} />
      <DailyRecordList records={records} />
    </main>
  );
}
