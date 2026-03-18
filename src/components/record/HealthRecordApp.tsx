"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PetCreateFormValues } from "@/components/pet/PetCreateForm";
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

function createEmptyPetCreateForm(): PetCreateFormValues {
  return {
    name: "",
    type: "cat",
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

function getPetHref(petId: string, section: "profile" | "records") {
  return section === "records" ? `/pets/${petId}/records` : `/pets/${petId}`;
}

interface PetWorkspaceProps {
  petId?: string;
  section: "profile" | "records";
}

export function PetHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const pets = await healthRecordService.getOrCreatePets();
      if (!isMounted) return;

      const firstPet = pets[0];
      if (firstPet) {
        router.replace(getPetHref(firstPet.id, "records"));
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main className="page-shell">
      <p className="status-text">ペット情報を読み込んでいます...</p>
    </main>
  );
}

export function PetWorkspace({ petId, section }: PetWorkspaceProps) {
  const router = useRouter();
  const today = getTodayDateString();
  const [pets, setPets] = useState<Pet[]>([]);
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
  const [petCreateFormValues, setPetCreateFormValues] = useState<PetCreateFormValues>(() =>
    createEmptyPetCreateForm(),
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
  const [isCreatingPet, setIsCreatingPet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function load(targetPetId?: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextPets = await healthRecordService.getOrCreatePets();
      const nextPet = nextPets.find((pet) => pet.id === targetPetId) ?? nextPets[0] ?? null;

      if (!nextPet) {
        throw new Error("ペット情報の初期化に失敗しました。");
      }

      if (!targetPetId || targetPetId !== nextPet.id) {
        router.replace(getPetHref(nextPet.id, section));
      }

      const snapshot = await healthRecordService.getPetSnapshot(nextPet.id);
      if (!snapshot) {
        throw new Error("選択中のペット情報を読み込めませんでした。");
      }

      const dailyRecords = section === "records" ? await healthRecordService.getDailyRecords(nextPet.id) : [];
      const todayRecord = dailyRecords.find((record) => record.date === today) ?? null;

      setPets(nextPets);
      setSelectedPet(snapshot.pet);
      setSelectedProfile(snapshot.profile);
      setProfileFormValues(toProfileFormValues(snapshot.pet, snapshot.profile));
      setRecords(dailyRecords);
      setRecordFormValues(todayRecord ? toRecordFormValues(todayRecord) : createEmptyRecordForm(today));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "データの読み込みに失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(petId);
  }, [petId, section, today]);

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
        <p className="status-text">ペット情報を表示できませんでした。</p>
      </main>
    );
  }

  const hasRecordForDate = records.some((record) => record.date === recordFormValues.date);

  return (
    <main className="page-shell app-layout">
      <PetSidebar
        pets={pets}
        selectedPetId={selectedPet.id}
        currentSection={section}
        isCreatingPet={isCreatingPet}
        createValues={petCreateFormValues}
        onSelect={(nextPetId) => {
          setSuccessMessage(null);
          router.push(getPetHref(nextPetId, section));
        }}
        onCreateValuesChange={(values) => {
          setSuccessMessage(null);
          setPetCreateFormValues(values);
        }}
        onCreatePet={async (values) => {
          setIsCreatingPet(true);
          setErrorMessage(null);
          setSuccessMessage(null);

          try {
            const snapshot = await healthRecordService.createPet(values);
            const nextPets = await healthRecordService.getOrCreatePets();
            setPets(nextPets);
            setPetCreateFormValues(createEmptyPetCreateForm());
            setSuccessMessage(`${snapshot.pet.name} を追加しました。`);
            router.push(getPetHref(snapshot.pet.id, section));
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "ペットの追加に失敗しました。");
          } finally {
            setIsCreatingPet(false);
          }
        }}
      />

      <div className="content-column">
        <section className="hero card hero-card">
          <div>
            <p className="eyebrow">Pet Adviser</p>
            <h1>{selectedPet.name}</h1>
            <p className="hero-copy">
              {section === "records"
                ? "日次記録・異常判定・推移グラフ・履歴を確認できます。"
                : "名前や種別、誕生月、メモなどの基本情報を管理できます。"}
            </p>
          </div>
        </section>

        <nav className="card section-tabs" aria-label="ペットページ切り替え">
          <Link
            href={getPetHref(selectedPet.id, "profile")}
            className={`section-tab${section === "profile" ? " active" : ""}`}
          >
            基本情報
          </Link>
          <Link
            href={getPetHref(selectedPet.id, "records")}
            className={`section-tab${section === "records" ? " active" : ""}`}
          >
            健康記録
          </Link>
        </nav>

        {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
        {successMessage ? <div className="feedback success">{successMessage}</div> : null}

        {section === "profile" ? (
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
        ) : (
          <>
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
          </>
        )}
      </div>
    </main>
  );
}
