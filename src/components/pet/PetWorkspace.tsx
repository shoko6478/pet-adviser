"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { PetCreateFormValues } from "@/components/pet/PetCreateForm";
import {
  anomalyService,
  createEmptyObservationValues,
  createEmptyPetCreateForm,
  createEmptyRecordForm,
  getPetHref,
  healthRecordService,
  mergeObservationValues,
  toProfileFormValues,
  toRecordFormValues,
} from "@/components/pet/pet-workspace-shared";
import { AnomalySummary } from "@/components/record/AnomalySummary";
import {
  DailyRecordForm,
  type DailyObservationFormValues,
  type DailyRecordFormValues,
} from "@/components/record/DailyRecordForm";
import { DailyRecordList } from "@/components/record/DailyRecordList";
import { MedicalHistorySection } from "@/components/record/MedicalHistorySection";
import { ObservationFieldManager } from "@/components/record/ObservationFieldManager";
import { PetProfileForm, type PetProfileFormValues } from "@/components/record/PetProfileForm";
import { PetSidebar } from "@/components/record/PetSidebar";
import { RecordCharts } from "@/components/record/RecordCharts";
import type { DailyObservationValue } from "@/domain/models/daily-observation-value";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import type { MedicalHistoryItem } from "@/domain/models/medical-history-item";
import { getTodayDateString } from "@/lib/utils/date";
import {
  formatApproxAgeLabel,
  formatApproxHumanAgeLabel,
  getPetInitial,
  getPetSexLabel,
  getPetTypeLabel,
  getSterilizedLabel,
} from "@/lib/utils/pet-profile";

interface PetWorkspaceProps {
  petId?: string;
  section: "profile" | "records";
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function PetWorkspace({ petId, section }: PetWorkspaceProps) {
  const router = useRouter();
  const today = getTodayDateString();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PetProfile | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [recordObservationValuesByRecordId, setRecordObservationValuesByRecordId] = useState<Record<string, DailyObservationValue[]>>({});
  const [observationFieldDefinitions, setObservationFieldDefinitions] = useState<ObservationFieldDefinition[]>([]);
  const [medicalHistoryItems, setMedicalHistoryItems] = useState<MedicalHistoryItem[]>([]);
  const [recordFormValues, setRecordFormValues] = useState<DailyRecordFormValues>(() =>
    createEmptyRecordForm(today),
  );
  const [observationFormValues, setObservationFormValues] = useState<DailyObservationFormValues>({});
  const [profileEditorValues, setProfileEditorValues] = useState<PetProfileFormValues>({
    name: "",
    type: "cat",
    birthMonth: "",
    sex: "unknown",
    sterilized: false,
    breed: "",
    photoDataUrl: "",
    notes: "",
  });
  const [petCreateEditorValues, setPetCreateEditorValues] = useState<PetCreateFormValues>(() =>
    createEmptyPetCreateForm(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingObservationField, setIsSavingObservationField] = useState(false);
  const [isSavingMedicalHistory, setIsSavingMedicalHistory] = useState(false);
  const [isCreatingPet, setIsCreatingPet] = useState(false);
  const [isDeletingPet, setIsDeletingPet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadObservationValuesByRecordId(dailyRecords: DailyRecord[]) {
    const entries = await Promise.all(
      dailyRecords.map(async (record) => [record.id, await healthRecordService.getDailyObservationValues(record.id)] as const),
    );

    return Object.fromEntries(entries);
  }

  async function loadRecordEditor(
    date: string,
    dailyRecords: DailyRecord[],
    definitions: ObservationFieldDefinition[],
    observationValuesByRecordId: Record<string, DailyObservationValue[]>,
  ) {
    const matched = dailyRecords.find((record) => record.date === date) ?? null;
    setRecordFormValues(matched ? toRecordFormValues(matched) : createEmptyRecordForm(date));

    if (!matched) {
      setObservationFormValues(createEmptyObservationValues(definitions));
      return;
    }

    setObservationFormValues(mergeObservationValues(definitions, observationValuesByRecordId[matched.id] ?? []));
  }

  async function load(targetPetId?: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextPets = await healthRecordService.getOrCreatePets();
      const nextPet = nextPets.find((pet) => pet.id === targetPetId) ?? nextPets[0] ?? null;

      if (!nextPet) {
        setPets([]);
        setSelectedPet(null);
        setSelectedProfile(null);
        setRecords([]);
        setObservationFieldDefinitions([]);
        setMedicalHistoryItems([]);
        setObservationFormValues({});
        setRecordObservationValuesByRecordId({});
        setRecordFormValues(createEmptyRecordForm(today));
        return;
      }

      if (!targetPetId || targetPetId !== nextPet.id) {
        router.replace(getPetHref(nextPet.id, section));
      }

      const snapshot = await healthRecordService.getPetSnapshot(nextPet.id);
      if (!snapshot) {
        throw new Error("選択中のペット情報を読み込めませんでした。");
      }

      const definitions = await healthRecordService.getObservationFieldDefinitions(nextPet.id);
      const nextMedicalHistoryItems = await healthRecordService.getMedicalHistoryItems(nextPet.id);
      const dailyRecords = section === "records" ? await healthRecordService.getDailyRecords(nextPet.id) : [];
      const observationValuesByRecordId =
        section === "records" ? await loadObservationValuesByRecordId(dailyRecords) : {};

      setPets(nextPets);
      setSelectedPet(snapshot.pet);
      setSelectedProfile(snapshot.profile);
      setProfileEditorValues(toProfileFormValues(snapshot.pet, snapshot.profile));
      setObservationFieldDefinitions(definitions);
      setMedicalHistoryItems(nextMedicalHistoryItems);
      setRecords(dailyRecords);
      setRecordObservationValuesByRecordId(observationValuesByRecordId);

      if (section === "records") {
        await loadRecordEditor(today, dailyRecords, definitions, observationValuesByRecordId);
      } else {
        setRecordFormValues(createEmptyRecordForm(today));
        setRecordObservationValuesByRecordId({});
        setObservationFormValues(createEmptyObservationValues(definitions));
      }
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

  async function refreshObservationFieldDefinitions(targetPetId: string) {
    const definitions = await healthRecordService.getObservationFieldDefinitions(targetPetId);
    setObservationFieldDefinitions(definitions);
    return definitions;
  }

  async function refreshMedicalHistoryItems(targetPetId: string) {
    const items = await healthRecordService.getMedicalHistoryItems(targetPetId);
    setMedicalHistoryItems(items);
    return items;
  }

  async function handleDeletePet(targetPet: Pet) {
    const confirmed = window.confirm(
      `「${targetPet.name}」を削除します。基本情報・既往歴・健康記録・追加観察項目もすべて削除されます。よろしいですか？`,
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingPet(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await healthRecordService.deletePet(targetPet.id);
      const remainingPets = await healthRecordService.getPets();
      if (remainingPets.length > 0) {
        router.replace(getPetHref(remainingPets[0].id, "profile"));
      } else {
        router.replace("/");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ペットの削除に失敗しました。");
    } finally {
      setIsDeletingPet(false);
    }
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
      <main className="page-shell app-layout empty-workspace-layout">
        <div className="content-column">
          <section className="hero card hero-card">
            <div>
              <p className="eyebrow">Pet Adviser</p>
              <h1>ペットを登録してください</h1>
              <p className="hero-copy">登録すると、基本情報や健康記録をすぐに管理できます。</p>
            </div>
          </section>
          {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
        </div>

        <PetSidebar
          pets={pets}
          selectedPetId={null}
          currentSection={section}
          isCreatingPet={isCreatingPet}
          createValues={petCreateEditorValues}
          onSelect={(nextPetId) => {
            setSuccessMessage(null);
            router.push(getPetHref(nextPetId, section));
          }}
          onCreateValuesChange={(values) => {
            setSuccessMessage(null);
            setPetCreateEditorValues(values);
          }}
          onCreatePet={async (values) => {
            setIsCreatingPet(true);
            setErrorMessage(null);
            setSuccessMessage(null);

            try {
              const snapshot = await healthRecordService.createPet(values);
              const nextPets = await healthRecordService.getPets();
              setPets(nextPets);
              setPetCreateEditorValues(createEmptyPetCreateForm());
              router.push(getPetHref(snapshot.pet.id, section));
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : "ペットの追加に失敗しました。");
            } finally {
              setIsCreatingPet(false);
            }
          }}
        />
      </main>
    );
  }

  const hasRecordForDate = records.some((record) => record.date === recordFormValues.date);
  const approximateAge = formatApproxAgeLabel(selectedProfile.birthMonth);
  const humanAge = formatApproxHumanAgeLabel(selectedPet.type, selectedProfile.birthMonth);

  return (
    <main className="page-shell app-layout">
      <PetSidebar
        pets={pets}
        selectedPetId={selectedPet.id}
        currentSection={section}
        isCreatingPet={isCreatingPet}
        createValues={petCreateEditorValues}
        onSelect={(nextPetId) => {
          setSuccessMessage(null);
          router.push(getPetHref(nextPetId, section));
        }}
        onCreateValuesChange={(values) => {
          setSuccessMessage(null);
          setPetCreateEditorValues(values);
        }}
        onCreatePet={async (values) => {
          setIsCreatingPet(true);
          setErrorMessage(null);
          setSuccessMessage(null);

          try {
            const snapshot = await healthRecordService.createPet(values);
            const nextPets = await healthRecordService.getPets();
            setPets(nextPets);
            setPetCreateEditorValues(createEmptyPetCreateForm());
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
        <section className="hero card hero-card hero-profile-card">
          <div className="hero-profile-layout">
            <div className="hero-photo-wrap">
              <div className="profile-photo-preview hero-avatar">
                {selectedProfile.photoDataUrl ? (
                  <img src={selectedProfile.photoDataUrl} alt={`${selectedPet.name}の写真`} className="profile-photo-image" />
                ) : (
                  <span>{getPetInitial(selectedPet.name)}</span>
                )}
              </div>
            </div>

            <div className="hero-main">
              <p className="eyebrow">Pet Adviser</p>
              <h1>{selectedPet.name}</h1>
              {section === "records" ? (
                <p className="hero-copy">日次記録・異常判定・推移グラフ・履歴を確認できます。</p>
              ) : null}

              <div className="hero-chip-row">
                <span className="hero-chip">{getPetTypeLabel(selectedPet.type)}</span>
                <span className="hero-chip">性別: {getPetSexLabel(selectedProfile.sex)}</span>
                <span className="hero-chip">去勢/避妊: {getSterilizedLabel(selectedProfile.sterilized)}</span>
                {selectedProfile.breed ? <span className="hero-chip">{selectedProfile.breed}</span> : null}
              </div>

              <div className="hero-stat-grid">
                <div className="hero-stat-card">
                  <span>現在年齢</span>
                  <strong>{approximateAge ?? "誕生月を登録すると表示されます"}</strong>
                </div>
                <div className="hero-stat-card">
                  <span>人間年齢の概算</span>
                  <strong>{humanAge ?? "誕生月を登録すると表示されます"}</strong>
                </div>
              </div>
            </div>
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
          <>
            <PetProfileForm
              values={profileEditorValues}
              isSaving={isSavingProfile}
              onChange={(nextValues) => {
                setSuccessMessage(null);
                setProfileEditorValues(nextValues);
              }}
              approximateAgeLabel={approximateAge}
              humanAgeLabel={humanAge}
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
                    sex: values.sex,
                    sterilized: values.sterilized,
                    breed: values.breed,
                    photoDataUrl: values.photoDataUrl,
                    notes: values.notes,
                  });
                  const nextPets = await healthRecordService.getPets();
                  setPets(nextPets);
                  setSelectedPet(snapshot.pet);
                  setSelectedProfile(snapshot.profile);
                  setProfileEditorValues(toProfileFormValues(snapshot.pet, snapshot.profile));
                  setSuccessMessage(`${snapshot.pet.name} の基本情報を保存しました。`);
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "基本情報の保存に失敗しました。");
                } finally {
                  setIsSavingProfile(false);
                }
              }}
            />

            <MedicalHistorySection
              items={medicalHistoryItems}
              isSaving={isSavingMedicalHistory}
              onCreate={async (values) => {
                setIsSavingMedicalHistory(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  await healthRecordService.createMedicalHistoryItem({
                    petId: selectedPet.id,
                    category: values.category,
                    title: values.title,
                    detail: values.detail,
                    startedAt: values.startedAt,
                    endedAt: values.endedAt,
                    isOngoing: values.isOngoing,
                    hospitalName: values.hospitalName,
                  });
                  await refreshMedicalHistoryItems(selectedPet.id);
                  setSuccessMessage("既往歴を追加しました。");
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "既往歴の追加に失敗しました。");
                  throw error;
                } finally {
                  setIsSavingMedicalHistory(false);
                }
              }}
              onUpdate={async (itemId, values) => {
                setIsSavingMedicalHistory(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  await healthRecordService.updateMedicalHistoryItem({
                    id: itemId,
                    category: values.category,
                    title: values.title,
                    detail: values.detail,
                    startedAt: values.startedAt,
                    endedAt: values.endedAt,
                    isOngoing: values.isOngoing,
                    hospitalName: values.hospitalName,
                  });
                  await refreshMedicalHistoryItems(selectedPet.id);
                  setSuccessMessage("既往歴を更新しました。");
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "既往歴の更新に失敗しました。");
                  throw error;
                } finally {
                  setIsSavingMedicalHistory(false);
                }
              }}
              onDelete={async (itemId) => {
                setIsSavingMedicalHistory(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  await healthRecordService.deleteMedicalHistoryItem(itemId);
                  await refreshMedicalHistoryItems(selectedPet.id);
                  setSuccessMessage("既往歴を削除しました。");
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "既往歴の削除に失敗しました。");
                } finally {
                  setIsSavingMedicalHistory(false);
                }
              }}
            />

            <ObservationFieldManager
              definitions={observationFieldDefinitions}
              isSaving={isSavingObservationField}
              onCreate={async (input) => {
                setIsSavingObservationField(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  await healthRecordService.createObservationFieldDefinition({
                    petId: selectedPet.id,
                    label: input.label,
                    type: input.type,
                  });
                  const nextDefinitions = await refreshObservationFieldDefinitions(selectedPet.id);
                  setObservationFormValues((current) => ({
                    ...createEmptyObservationValues(nextDefinitions),
                    ...current,
                  }));
                  setSuccessMessage("観察項目を追加しました。");
                  return true;
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "観察項目の追加に失敗しました。");
                  return false;
                } finally {
                  setIsSavingObservationField(false);
                }
              }}
              onMove={async (definitionId, direction) => {
                setIsSavingObservationField(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  const sortedDefinitions = [...observationFieldDefinitions].sort(
                    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
                  );
                  const index = sortedDefinitions.findIndex((definition) => definition.id === definitionId);
                  const swapIndex = direction === "up" ? index - 1 : index + 1;

                  if (index < 0 || swapIndex < 0 || swapIndex >= sortedDefinitions.length) {
                    return;
                  }

                  const target = sortedDefinitions[index];
                  const swapTarget = sortedDefinitions[swapIndex];

                  await healthRecordService.updateObservationFieldDefinition({
                    id: target.id,
                    sortOrder: swapTarget.sortOrder,
                  });
                  await healthRecordService.updateObservationFieldDefinition({
                    id: swapTarget.id,
                    sortOrder: target.sortOrder,
                  });

                  await refreshObservationFieldDefinitions(selectedPet.id);
                  setSuccessMessage("観察項目の並び順を更新しました。");
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "観察項目の並び替えに失敗しました。");
                } finally {
                  setIsSavingObservationField(false);
                }
              }}
              onDelete={async (definitionId) => {
                setIsSavingObservationField(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  await healthRecordService.deleteObservationFieldDefinition(definitionId);
                  const nextDefinitions = await refreshObservationFieldDefinitions(selectedPet.id);
                  setObservationFormValues((current) => {
                    const nextValues = createEmptyObservationValues(nextDefinitions);
                    for (const [fieldId, value] of Object.entries(current)) {
                      if (fieldId in nextValues) {
                        nextValues[fieldId] = value;
                      }
                    }
                    return nextValues;
                  });
                  setSuccessMessage("観察項目を削除しました。");
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "観察項目の削除に失敗しました。");
                } finally {
                  setIsSavingObservationField(false);
                }
              }}
            />

            <section className="card danger-zone-card">
              <div className="section-header">
                <h2>危険操作</h2>
                <p>このペットの基本情報・既往歴・健康記録・追加観察項目をまとめて削除します。</p>
              </div>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleDeletePet(selectedPet)}
                disabled={isDeletingPet || isSavingProfile}
              >
                {isDeletingPet ? "削除中..." : "このペットを削除"}
              </button>
            </section>
          </>
        ) : (
          <>
            <DailyRecordForm
              values={recordFormValues}
              observationFields={observationFieldDefinitions}
              observationValues={observationFormValues}
              isSaving={isSavingRecord}
              submitLabel={hasRecordForDate ? "記録を更新" : "記録を保存"}
              onChange={(nextValues) => {
                setSuccessMessage(null);
                if (recordFormValues.date === nextValues.date) {
                  setRecordFormValues(nextValues);
                  return;
                }

                void loadRecordEditor(nextValues.date, records, observationFieldDefinitions, recordObservationValuesByRecordId);
              }}
              onObservationValuesChange={(nextValues) => {
                setSuccessMessage(null);
                setObservationFormValues(nextValues);
              }}
              onSubmit={async (values) => {
                setIsSavingRecord(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                try {
                  const saved = await healthRecordService.saveDailyRecord({
                    petId: selectedPet.id,
                    date: values.date,
                    weight: parseOptionalNumber(values.weight),
                    food: parseOptionalNumber(values.food),
                    toilet: parseOptionalNumber(values.toilet),
                    observationValues: observationFieldDefinitions.map((definition) => ({
                      fieldDefinitionId: definition.id,
                      value: observationFormValues[definition.id] ?? (definition.type === "checkbox" ? false : ""),
                    })),
                  });

                  const nextRecords = await healthRecordService.getDailyRecords(selectedPet.id);
                  const nextObservationValuesByRecordId = await loadObservationValuesByRecordId(nextRecords);
                  setRecords(nextRecords);
                  setRecordObservationValuesByRecordId(nextObservationValuesByRecordId);
                  await loadRecordEditor(saved.date, nextRecords, observationFieldDefinitions, nextObservationValuesByRecordId);
                  setSuccessMessage(`${selectedPet.name} の ${saved.date} の記録を保存しました。`);
                } catch (error) {
                  setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
                } finally {
                  setIsSavingRecord(false);
                }
              }}
            />

            <AnomalySummary result={anomalyResult} targetDate={recordFormValues.date} />
            <RecordCharts
              records={records}
              observationFields={observationFieldDefinitions}
              observationValuesByRecordId={recordObservationValuesByRecordId}
            />
            <DailyRecordList records={records} />
          </>
        )}
      </div>
    </main>
  );
}
