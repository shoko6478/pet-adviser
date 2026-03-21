"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PetProfileFormValues } from "@/components/record/PetProfileForm";
import { PetProfileForm } from "@/components/record/PetProfileForm";
import { MedicalHistorySection } from "@/components/record/MedicalHistorySection";
import { ObservationFieldManager } from "@/components/record/ObservationFieldManager";
import { DailyRecordForm, type DailyObservationFormValues, type DailyRecordFormValues } from "@/components/record/DailyRecordForm";
import { AnomalySummary } from "@/components/record/AnomalySummary";
import { RecordCharts } from "@/components/record/RecordCharts";
import { DailyRecordList } from "@/components/record/DailyRecordList";
import {
  anomalyService,
  createEmptyObservationValues,
  createEmptyRecordForm,
  healthRecordService,
  mergeObservationValues,
  toProfileFormValues,
  toRecordFormValues,
} from "@/components/pet/pet-workspace-shared";
import type { DailyObservationValue } from "@/domain/models/daily-observation-value";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { MedicalHistoryItem } from "@/domain/models/medical-history-item";
import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import { getTodayDateString } from "@/lib/utils/date";
import { formatApproxAgeLabel, formatApproxHumanAgeLabel } from "@/lib/utils/pet-profile";

interface PetWorkspacePanelsProviderProps {
  pet: Pet;
  profile: PetProfile;
  currentSection: "profile" | "records";
  onProfileSaved: (snapshot: { pet: Pet; profile: PetProfile }) => void;
  onLatestWeightChange: (label: string | null) => void;
  onDeletePet: (pet: Pet) => Promise<void>;
  children: ReactNode;
}

interface WorkspacePanelsContextValue {
  pet: Pet;
  profile: PetProfile;
  profileEditorValues: PetProfileFormValues;
  records: DailyRecord[];
  recordObservationValuesByRecordId: Record<string, DailyObservationValue[]>;
  recordFormValues: DailyRecordFormValues;
  observationFormValues: DailyObservationFormValues;
  observationFieldDefinitions: ObservationFieldDefinition[];
  medicalHistoryItems: MedicalHistoryItem[];
  approximateAge: string | null;
  humanAge: string | null;
  errorMessage: string | null;
  successMessage: string | null;
  isSavingProfile: boolean;
  isSavingMedicalHistory: boolean;
  isSavingObservationField: boolean;
  isSavingRecord: boolean;
  isDeletingPet: boolean;
  setProfileEditorValues: (values: PetProfileFormValues) => void;
  setRecordFormValues: (values: DailyRecordFormValues) => void;
  setObservationFormValues: (values: DailyObservationFormValues) => void;
  setSuccessMessage: (message: string | null) => void;
  loadRecordEditor: (date: string) => Promise<void>;
  handleSaveProfile: (values: PetProfileFormValues) => Promise<boolean>;
  handleCreateMedicalHistory: (values: {
    category: MedicalHistoryItem["category"];
    title: string;
    detail: string;
    startedAt: string;
    endedAt: string;
    isOngoing: boolean;
    hospitalName: string;
  }) => Promise<void>;
  handleUpdateMedicalHistory: (
    itemId: string,
    values: {
      category: MedicalHistoryItem["category"];
      title: string;
      detail: string;
      startedAt: string;
      endedAt: string;
      isOngoing: boolean;
      hospitalName: string;
    },
  ) => Promise<void>;
  handleDeleteMedicalHistory: (itemId: string) => Promise<void>;
  handleCreateObservationField: (input: { label: string; type: ObservationFieldDefinition["type"] }) => Promise<boolean>;
  handleMoveObservationField: (definitionId: string, direction: "up" | "down") => Promise<void>;
  handleDeleteObservationField: (definitionId: string) => Promise<void>;
  handleSaveRecord: (values: DailyRecordFormValues) => Promise<void>;
  handleDeletePet: () => Promise<void>;
}

const WorkspacePanelsContext = createContext<WorkspacePanelsContextValue | null>(null);

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function getLatestWeightLabel(records: DailyRecord[]): string | null {
  const latest = [...records]
    .filter((record) => typeof record.weight === "number" && Number.isFinite(record.weight))
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return latest ? `${latest.weight} kg (${latest.date})` : null;
}

export function PetWorkspacePanelsProvider({
  pet,
  profile,
  currentSection,
  onProfileSaved,
  onLatestWeightChange,
  onDeletePet,
  children,
}: PetWorkspacePanelsProviderProps) {
  const today = getTodayDateString();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [recordsPetId, setRecordsPetId] = useState<string | null>(null);
  const [recordObservationValuesByRecordId, setRecordObservationValuesByRecordId] = useState<Record<string, DailyObservationValue[]>>({});
  const [observationFieldDefinitions, setObservationFieldDefinitions] = useState<ObservationFieldDefinition[]>([]);
  const [medicalHistoryItems, setMedicalHistoryItems] = useState<MedicalHistoryItem[]>([]);
  const [recordFormValues, setRecordFormValues] = useState<DailyRecordFormValues>(() => createEmptyRecordForm(today));
  const [observationFormValues, setObservationFormValues] = useState<DailyObservationFormValues>({});
  const [profileEditorValues, setProfileEditorValues] = useState<PetProfileFormValues>(() => toProfileFormValues(pet, profile));
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingMedicalHistory, setIsSavingMedicalHistory] = useState(false);
  const [isSavingObservationField, setIsSavingObservationField] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
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

  async function loadRecordEditorForDate(date: string) {
    await loadRecordEditor(date, records, observationFieldDefinitions, recordObservationValuesByRecordId);
  }

  async function loadSharedState(targetPetId: string) {
    const [definitions, history] = await Promise.all([
      healthRecordService.getObservationFieldDefinitions(targetPetId),
      healthRecordService.getMedicalHistoryItems(targetPetId),
    ]);

    setObservationFieldDefinitions(definitions);
    setMedicalHistoryItems(history);
    setObservationFormValues((current) => ({
      ...createEmptyObservationValues(definitions),
      ...current,
    }));

    return { definitions };
  }

  async function loadRecordsForPet(targetPetId: string, definitions: ObservationFieldDefinition[]) {
    setIsLoadingRecords(true);

    try {
      const dailyRecords = await healthRecordService.getDailyRecords(targetPetId);
      const observationValuesByRecordId = await loadObservationValuesByRecordId(dailyRecords);
      setRecords(dailyRecords);
      setRecordsPetId(targetPetId);
      setRecordObservationValuesByRecordId(observationValuesByRecordId);
      await loadRecordEditor(recordFormValues.date || today, dailyRecords, definitions, observationValuesByRecordId);
      onLatestWeightChange(getLatestWeightLabel(dailyRecords));
    } finally {
      setIsLoadingRecords(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsInitializing(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setProfileEditorValues(toProfileFormValues(pet, profile));
      setRecords([]);
      setRecordsPetId(null);
      setRecordObservationValuesByRecordId({});
      setRecordFormValues(createEmptyRecordForm(today));

      try {
        const { definitions } = await loadSharedState(pet.id);
        if (cancelled) {
          return;
        }

        if (currentSection === "records") {
          await loadRecordsForPet(pet.id, definitions);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "データの読み込みに失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [pet.id, profile, today]);

  useEffect(() => {
    if (currentSection !== "records" || isInitializing || recordsPetId === pet.id) {
      return;
    }

    void loadRecordsForPet(pet.id, observationFieldDefinitions).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "健康記録の読み込みに失敗しました。");
    });
  }, [currentSection, isInitializing, observationFieldDefinitions, pet.id, recordsPetId]);

  const approximateAge = useMemo(() => formatApproxAgeLabel(profile.birthMonth), [profile.birthMonth]);
  const humanAge = useMemo(() => formatApproxHumanAgeLabel(pet.type, profile.birthMonth), [pet.type, profile.birthMonth]);

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

  async function handleSaveProfile(values: PetProfileFormValues) {
    setIsSavingProfile(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const snapshot = await healthRecordService.savePetProfile({
        petId: pet.id,
        name: values.name,
        type: values.type,
        birthMonth: values.birthMonth,
        sex: values.sex,
        sterilized: values.sterilized,
        breed: values.breed,
        photoDataUrl: values.photoDataUrl,
        notes: values.notes,
      });
      setProfileEditorValues(toProfileFormValues(snapshot.pet, snapshot.profile));
      onProfileSaved(snapshot);
      setSuccessMessage(`${snapshot.pet.name} の基本情報を保存しました。`);
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "基本情報の保存に失敗しました。");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleCreateMedicalHistory(values: WorkspacePanelsContextValue["handleCreateMedicalHistory"] extends (arg: infer T) => Promise<void> ? T : never) {
    setIsSavingMedicalHistory(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await healthRecordService.createMedicalHistoryItem({
        petId: pet.id,
        category: values.category,
        title: values.title,
        detail: values.detail,
        startedAt: values.startedAt,
        endedAt: values.endedAt,
        isOngoing: values.isOngoing,
        hospitalName: values.hospitalName,
      });
      await refreshMedicalHistoryItems(pet.id);
      setSuccessMessage("既往歴を追加しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "既往歴の追加に失敗しました。");
      throw error;
    } finally {
      setIsSavingMedicalHistory(false);
    }
  }

  async function handleUpdateMedicalHistory(
    itemId: string,
    values: WorkspacePanelsContextValue["handleUpdateMedicalHistory"] extends (
      id: string,
      payload: infer T,
    ) => Promise<void>
      ? T
      : never,
  ) {
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
      await refreshMedicalHistoryItems(pet.id);
      setSuccessMessage("既往歴を更新しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "既往歴の更新に失敗しました。");
      throw error;
    } finally {
      setIsSavingMedicalHistory(false);
    }
  }

  async function handleDeleteMedicalHistory(itemId: string) {
    setIsSavingMedicalHistory(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await healthRecordService.deleteMedicalHistoryItem(itemId);
      await refreshMedicalHistoryItems(pet.id);
      setSuccessMessage("既往歴を削除しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "既往歴の削除に失敗しました。");
    } finally {
      setIsSavingMedicalHistory(false);
    }
  }

  async function handleCreateObservationField(input: { label: string; type: ObservationFieldDefinition["type"] }) {
    setIsSavingObservationField(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await healthRecordService.createObservationFieldDefinition({
        petId: pet.id,
        label: input.label,
        type: input.type,
      });
      const nextDefinitions = await refreshObservationFieldDefinitions(pet.id);
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
  }

  async function handleMoveObservationField(definitionId: string, direction: "up" | "down") {
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

      await healthRecordService.updateObservationFieldDefinition({ id: target.id, sortOrder: swapTarget.sortOrder });
      await healthRecordService.updateObservationFieldDefinition({ id: swapTarget.id, sortOrder: target.sortOrder });
      await refreshObservationFieldDefinitions(pet.id);
      setSuccessMessage("観察項目の並び順を更新しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "観察項目の並び替えに失敗しました。");
    } finally {
      setIsSavingObservationField(false);
    }
  }

  async function handleDeleteObservationField(definitionId: string) {
    setIsSavingObservationField(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await healthRecordService.deleteObservationFieldDefinition(definitionId);
      const nextDefinitions = await refreshObservationFieldDefinitions(pet.id);
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
  }

  async function handleSaveRecord(values: DailyRecordFormValues) {
    setIsSavingRecord(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const saved = await healthRecordService.saveDailyRecord({
        petId: pet.id,
        date: values.date,
        weight: parseOptionalNumber(values.weight),
        food: parseOptionalNumber(values.food),
        toilet: parseOptionalNumber(values.toilet),
        observationValues: observationFieldDefinitions.map((definition) => ({
          fieldDefinitionId: definition.id,
          value: observationFormValues[definition.id] ?? (definition.type === "checkbox" ? false : ""),
        })),
      });

      const nextRecords = await healthRecordService.getDailyRecords(pet.id);
      const nextObservationValuesByRecordId = await loadObservationValuesByRecordId(nextRecords);
      setRecords(nextRecords);
      setRecordsPetId(pet.id);
      setRecordObservationValuesByRecordId(nextObservationValuesByRecordId);
      await loadRecordEditor(saved.date, nextRecords, observationFieldDefinitions, nextObservationValuesByRecordId);
      onLatestWeightChange(getLatestWeightLabel(nextRecords));
      setSuccessMessage(`${pet.name} の ${saved.date} の記録を保存しました。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
    } finally {
      setIsSavingRecord(false);
    }
  }

  async function handleDeletePet() {
    setIsDeletingPet(true);
    try {
      await onDeletePet(pet);
    } finally {
      setIsDeletingPet(false);
    }
  }

  const value: WorkspacePanelsContextValue = {
    pet,
    profile,
    profileEditorValues,
    records,
    recordObservationValuesByRecordId,
    recordFormValues,
    observationFormValues,
    observationFieldDefinitions,
    medicalHistoryItems,
    approximateAge,
    humanAge,
    errorMessage,
    successMessage,
    isSavingProfile,
    isSavingMedicalHistory,
    isSavingObservationField,
    isSavingRecord: isSavingRecord || isLoadingRecords || isInitializing,
    isDeletingPet,
    setProfileEditorValues,
    setRecordFormValues,
    setObservationFormValues,
    setSuccessMessage,
    loadRecordEditor: loadRecordEditorForDate,
    handleSaveProfile,
    handleCreateMedicalHistory,
    handleUpdateMedicalHistory,
    handleDeleteMedicalHistory,
    handleCreateObservationField,
    handleMoveObservationField,
    handleDeleteObservationField,
    handleSaveRecord,
    handleDeletePet,
  };

  return <WorkspacePanelsContext.Provider value={value}>{children}</WorkspacePanelsContext.Provider>;
}

export function usePetWorkspacePanels() {
  const context = useContext(WorkspacePanelsContext);
  if (!context) {
    throw new Error("usePetWorkspacePanels must be used within PetWorkspacePanelsProvider.");
  }
  return context;
}

function PanelFeedback() {
  const { errorMessage, successMessage } = usePetWorkspacePanels();

  return (
    <>
      {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
      {successMessage ? <div className="feedback success">{successMessage}</div> : null}
    </>
  );
}

export function PetProfileSection() {
  const {
    pet,
    profile,
    medicalHistoryItems,
    observationFieldDefinitions,
    profileEditorValues,
    approximateAge,
    humanAge,
    isSavingProfile,
    isSavingMedicalHistory,
    isSavingObservationField,
    isDeletingPet,
    setSuccessMessage,
    setProfileEditorValues,
    handleSaveProfile,
    handleCreateMedicalHistory,
    handleUpdateMedicalHistory,
    handleDeleteMedicalHistory,
    handleCreateObservationField,
    handleMoveObservationField,
    handleDeleteObservationField,
    handleDeletePet,
  } = usePetWorkspacePanels();
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);

  return (
    <>
      <PanelFeedback />
      <PetProfileForm
        values={profileEditorValues}
        isSaving={isSavingProfile}
        isEditing={isEditingBasicInfo}
        onChange={(nextValues) => {
          setSuccessMessage(null);
          setProfileEditorValues(nextValues);
        }}
        onStartEditing={() => {
          setSuccessMessage(null);
          setProfileEditorValues(toProfileFormValues(pet, profile));
          setIsEditingBasicInfo(true);
        }}
        onCancelEditing={() => {
          setSuccessMessage(null);
          setProfileEditorValues(toProfileFormValues(pet, profile));
          setIsEditingBasicInfo(false);
        }}
        approximateAgeLabel={approximateAge}
        humanAgeLabel={humanAge}
        onSubmit={async (values) => {
          const saved = await handleSaveProfile(values);
          if (saved) {
            setIsEditingBasicInfo(false);
          }
        }}
      />

      <MedicalHistorySection
        items={medicalHistoryItems}
        isSaving={isSavingMedicalHistory}
        onCreate={handleCreateMedicalHistory}
        onUpdate={handleUpdateMedicalHistory}
        onDelete={handleDeleteMedicalHistory}
      />

      <ObservationFieldManager
        definitions={observationFieldDefinitions}
        isSaving={isSavingObservationField}
        onCreate={handleCreateObservationField}
        onMove={handleMoveObservationField}
        onDelete={handleDeleteObservationField}
      />

      <section className="card danger-zone-card">
        <div className="section-header">
          <h2>危険操作</h2>
          <p>このペットの基本情報・既往歴・健康記録・追加観察項目をまとめて削除します。</p>
        </div>
        <button
          type="button"
          className="danger-button"
          onClick={() => void handleDeletePet()}
          disabled={isDeletingPet || isSavingProfile}
        >
          {isDeletingPet ? "削除中..." : `「${pet.name}」を削除`}
        </button>
      </section>
    </>
  );
}

export function PetRecordsSection() {
  const {
    pet,
    records,
    recordObservationValuesByRecordId,
    observationFieldDefinitions,
    recordFormValues,
    observationFormValues,
    isSavingRecord,
    setSuccessMessage,
    setRecordFormValues,
    setObservationFormValues,
    loadRecordEditor,
    handleSaveRecord,
  } = usePetWorkspacePanels();

  const hasRecordForDate = records.some((record) => record.date === recordFormValues.date);
  const anomalyResult = anomalyService.evaluate(records, recordFormValues.date);

  return (
    <>
      <PanelFeedback />
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

          void loadRecordEditor(nextValues.date);
        }}
        onObservationValuesChange={(nextValues) => {
          setSuccessMessage(null);
          setObservationFormValues(nextValues);
        }}
        onSubmit={handleSaveRecord}
      />

      <AnomalySummary result={anomalyResult} targetDate={recordFormValues.date} />
      <RecordCharts
        records={records}
        observationFields={observationFieldDefinitions}
        observationValuesByRecordId={recordObservationValuesByRecordId}
      />
      <DailyRecordList records={records} />
      {records.length === 0 && !isSavingRecord ? <p className="status-text">{pet.name} の健康記録はまだありません。</p> : null}
    </>
  );
}
