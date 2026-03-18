"use client";

import { useEffect, useMemo, useState } from "react";
import { AnomalySummary } from "@/components/record/AnomalySummary";
import { DailyRecordForm, type DailyRecordFormValues } from "@/components/record/DailyRecordForm";
import { DailyRecordList } from "@/components/record/DailyRecordList";
import { PetProfileForm, type PetProfileFormValues } from "@/components/record/PetProfileForm";
import { PetSidebar } from "@/components/record/PetSidebar";
import { RecordCharts } from "@/components/record/RecordCharts";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import { LocalDailyRecordRepository } from "@/infrastructure/repositories/local-daily-record-repository";
import { LocalPetProfileRepository } from "@/infrastructure/repositories/local-pet-profile-repository";
import { LocalPetRepository } from "@/infrastructure/repositories/local-pet-repository";
import { getTodayDateString } from "@/lib/utils/date";
import { AnomalyService } from "@/services/anomaly-service";
import { HealthRecordService } from "@/services/health-record-service";

const petRepository = new LocalPetRepository();
const petProfileRepository = new LocalPetProfileRepository();
const dailyRecordRepository = new LocalDailyRecordRepository();
const healthRecordService = new HealthRecordService(
  petRepository,
  petProfileRepository,
  dailyRecordRepository,
);
const anomalyService = new AnomalyService();

function createEmptyRecordForm(date: string): DailyRecordFormValues {
  return {
    date,
    weight: "",
    food: "",
    toilet: "",
  };
}

function toRecordFormValues(record: DailyRecord): DailyRecordFormValues {
  return {
    date: record.date,
    weight: String(record.weight),
    food: String(record.food),
    toilet: String(record.toilet),
  };
}

function toProfileFormValues(pet: Pet, profile: PetProfile): PetProfileFormValues {
  return {
    name: pet.name,
    type: pet.type,
    birthMonth: profile.birthMonth ?? "",
    notes: profile.notes ?? "",
  };
}

export function HealthRecordApp() {
  const today = getTodayDateString();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PetProfile | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [recordFormValues, setRecordFormValues] = useState<DailyRecordFormValues>(() =>
    createEmptyRecordForm(today),
  );
  const [profileFormValues, setProfileFormValues] = useState<PetProfileFormValues>({
    name: "",
    type: "cat",
    birthMonth: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load(petId?: string | null) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextPets = await healthRecordService.getOrCreatePets();
      const activePetId = petId ?? selectedPetId ?? nextPets[0]?.id ?? null;

      if (!activePetId) {
        throw new Error("ペット情報の初期化に失敗しました。");
      }

      const snapshot = await healthRecordService.getPetSnapshot(activePetId);
      if (!snapshot) {
        throw new Error("選択中のペット情報を読み込めませんでした。");
      }

      const dailyRecords = await healthRecordService.getDailyRecords(activePetId);
      const todayRecord = dailyRecords.find((record) => record.date === today) ?? null;

      setPets(nextPets);
      setSelectedPetId(activePetId);
      setSelectedPet(snapshot.pet);
      setSelectedProfile(snapshot.profile);
      setProfileFormValues(toProfileFormValues(snapshot.pet, snapshot.profile));
      setRecords(dailyRecords);
      setRecordFormValues(todayRecord ? toRecordFormValues(todayRecord) : createEmptyRecordForm(today));
    } catch {
      setErrorMessage("データの読み込みに失敗しました。ブラウザを再読み込みしてください。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const anomalyResult = useMemo(() => {
    return anomalyService.evaluate(records, recordFormValues.date);
  }, [recordFormValues.date, records]);

  function syncRecordFormWithDate(date: string, dailyRecords: DailyRecord[]) {
    const matched = dailyRecords.find((record) => record.date === date) ?? null;
    setRecordFormValues(matched ? toRecordFormValues(matched) : createEmptyRecordForm(date));
  }

  if (isLoading) {
    return (
      <main className="page-shell">
        <p className="status-text">読み込み中...</p>
      </main>
    );
  }

  if (!selectedPet || !selectedProfile) {
    return (
      <main className="page-shell">
        <p className="status-text">ペットプロフィールを作成できませんでした。</p>
      </main>
    );
  }

  const hasRecordForDate = records.some((record) => record.date === recordFormValues.date);

  return (
    <main className="page-shell app-layout">
      <PetSidebar
        pets={pets}
        selectedPetId={selectedPetId}
        onSelect={(petId) => {
          setSuccessMessage(null);
          void load(petId);
        }}
      />

      <div className="content-column">
        <section className="hero card hero-card">
          <div>
            <p className="eyebrow">Pet Adviser</p>
            <h1>{selectedPet.name} の健康記録</h1>
            <p className="hero-copy">
              ペットごとに日次記録・異常判定・基本情報・推移グラフをまとめて確認できます。
            </p>
          </div>
        </section>

        {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
        {successMessage ? <div className="feedback success">{successMessage}</div> : null}

        <PetProfileForm
          values={profileFormValues}
          isSaving={isSavingProfile}
          onChange={(nextValues) => {
            setSuccessMessage(null);
            setProfileFormValues(nextValues);
          }}
          onSubmit={async (values) => {
            setIsSavingProfile(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            try {
              const snapshot = await healthRecordService.savePetProfile({
                petId: selectedPet.id,
                name: values.name,
                type: values.type,
                birthMonth: values.birthMonth,
                notes: values.notes,
              });
              const nextPets = await healthRecordService.getOrCreatePets();
              setPets(nextPets);
              setSelectedPet(snapshot.pet);
              setSelectedProfile(snapshot.profile);
              setProfileFormValues(toProfileFormValues(snapshot.pet, snapshot.profile));
              setSuccessMessage(`${snapshot.pet.name} の基本情報を保存しました。`);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : "基本情報の保存に失敗しました。");
            } finally {
              setIsSavingProfile(false);
            }
          }}
        />

        <DailyRecordForm
          values={recordFormValues}
          isSaving={isSavingRecord}
          submitLabel={hasRecordForDate ? "記録を更新" : "記録を保存"}
          onChange={(nextValues) => {
            setSuccessMessage(null);
            setRecordFormValues((current) => {
              if (current.date === nextValues.date) {
                return nextValues;
              }

              const matched = records.find((record) => record.date === nextValues.date) ?? null;
              return matched ? toRecordFormValues(matched) : createEmptyRecordForm(nextValues.date);
            });
          }}
          onSubmit={async (values) => {
            setIsSavingRecord(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            try {
              const saved = await healthRecordService.saveDailyRecord({
                petId: selectedPet.id,
                date: values.date,
                weight: Number(values.weight),
                food: Number(values.food),
                toilet: Number(values.toilet),
              });

              const nextRecords = await healthRecordService.getDailyRecords(selectedPet.id);
              setRecords(nextRecords);
              syncRecordFormWithDate(saved.date, nextRecords);
              setSuccessMessage(`${selectedPet.name} の ${saved.date} の記録を保存しました。`);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
            } finally {
              setIsSavingRecord(false);
            }
          }}
        />

        <AnomalySummary result={anomalyResult} targetDate={recordFormValues.date} />
        <RecordCharts records={records} />
        <DailyRecordList records={records} />
      </div>
    </main>
  );
}
