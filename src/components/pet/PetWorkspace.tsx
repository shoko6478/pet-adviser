"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import type { MedicalHistoryItem } from "@/domain/models/medical-history-item";
import type { ObservationFieldDefinition } from "@/domain/models/observation-field-definition";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import { getTodayDateString } from "@/lib/utils/date";
import {
  formatApproxAgeLabel,
  formatApproxHumanAgeLabel,
  getPetInitial,
  getPetSexLabel,
  getPetTypeLabel,
  getSterilizedLabel,
} from "@/lib/utils/pet-profile";

interface PetWorkspaceLayoutProps {
  petId: string;
  children: ReactNode;
}

type WorkspaceSection = "profile" | "records";

interface WorkspaceContextValue {
  selectedPet: Pet;
  selectedProfile: PetProfile;
  records: DailyRecord[];
  recordObservationValuesByRecordId: Record<string, DailyObservationValue[]>;
  observationFieldDefinitions: ObservationFieldDefinition[];
  medicalHistoryItems: MedicalHistoryItem[];
  recordFormValues: DailyRecordFormValues;
  observationFormValues: DailyObservationFormValues;
  profileEditorValues: PetProfileFormValues;
  approximateAge: string | null;
  humanAge: string | null;
  successMessage: string | null;
  errorMessage: string | null;
  isSavingRecord: boolean;
  isSavingProfile: boolean;
  isSavingObservationField: boolean;
  isSavingMedicalHistory: boolean;
  isDeletingPet: boolean;
  setSuccessMessage: (message: string | null) => void;
  setProfileEditorValues: (values: PetProfileFormValues) => void;
  setRecordFormValues: (values: DailyRecordFormValues) => void;
  setObservationFormValues: (values: DailyObservationFormValues) => void;
  loadRecordEditor: (date: string) => Promise<void>;
  handleSaveProfile: (values: PetProfileFormValues) => Promise<void>;
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
  handleCreateObservationField: (input: {
    label: string;
    type: ObservationFieldDefinition["type"];
  }) => Promise<boolean>;
  handleMoveObservationField: (definitionId: string, direction: "up" | "down") => Promise<void>;
  handleDeleteObservationField: (definitionId: string) => Promise<void>;
  handleSaveRecord: (values: DailyRecordFormValues) => Promise<void>;
  handleDeletePet: () => Promise<void>;
}

const PetWorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function getCurrentSection(pathname: string): WorkspaceSection {
  return pathname.endsWith("/records") ? "records" : "profile";
}

export function PetWorkspaceLayout({ petId, children }: PetWorkspaceLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSection = getCurrentSection(pathname);
  const today = getTodayDateString();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PetProfile | null>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [recordsPetId, setRecordsPetId] = useState<string | null>(null);
  const [recordObservationValuesByRecordId, setRecordObservationValuesByRecordId] = useState<
    Record<string, DailyObservationValue[]>
  >({});
  const [observationFieldDefinitions, setObservationFieldDefinitions] = useState<ObservationFieldDefinition[]>([]);
  const [medicalHistoryItems, setMedicalHistoryItems] = useState<MedicalHistoryItem[]>([]);
  const [recordFormValues, setRecordFormValues] = useState<DailyRecordFormValues>(() => createEmptyRecordForm(today));
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingObservationField, setIsSavingObservationField] = useState(false);
  const [isSavingMedicalHistory, setIsSavingMedicalHistory] = useState(false);
  const [isCreatingPet, setIsCreatingPet] = useState(false);
  const [isDeletingPet, setIsDeletingPet] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const sidebarStorageKey = "pet-adviser.sidebar-open";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const hasRestoredSidebar = useRef(false);

  useEffect(() => {
    if (hasRestoredSidebar.current || typeof window === "undefined") {
      return;
    }

    hasRestoredSidebar.current = true;
    const saved = window.sessionStorage.getItem(sidebarStorageKey);
    if (saved === "closed") {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(sidebarStorageKey, isSidebarOpen ? "open" : "closed");
  }, [isSidebarOpen]);

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

  async function loadShared(targetPetId: string) {
    const nextPets = await healthRecordService.getOrCreatePets();
    const nextPet = nextPets.find((pet) => pet.id === targetPetId) ?? nextPets[0] ?? null;

    if (!nextPet) {
      setPets([]);
      setSelectedPet(null);
      setSelectedProfile(null);
      setRecords([]);
      setRecordsPetId(null);
      setObservationFieldDefinitions([]);
      setMedicalHistoryItems([]);
      setObservationFormValues({});
      setRecordObservationValuesByRecordId({});
      setRecordFormValues(createEmptyRecordForm(today));
      return null;
    }

    if (targetPetId !== nextPet.id) {
      router.replace(getPetHref(nextPet.id, currentSection));
    }

    const snapshot = await healthRecordService.getPetSnapshot(nextPet.id);
    if (!snapshot) {
      throw new Error("選択中のペット情報を読み込めませんでした。");
    }

    const definitions = await healthRecordService.getObservationFieldDefinitions(nextPet.id);
    const nextMedicalHistoryItems = await healthRecordService.getMedicalHistoryItems(nextPet.id);

    setPets(nextPets);
    setSelectedPet(snapshot.pet);
    setSelectedProfile(snapshot.profile);
    setProfileEditorValues(toProfileFormValues(snapshot.pet, snapshot.profile));
    setObservationFieldDefinitions(definitions);
    setMedicalHistoryItems(nextMedicalHistoryItems);

    return {
      pet: snapshot.pet,
      profile: snapshot.profile,
      definitions,
    };
  }

  async function loadRecordsForPet(targetPetId: string, definitions?: ObservationFieldDefinition[]) {
    setIsLoadingRecords(true);

    try {
      const nextDefinitions = definitions ?? (await healthRecordService.getObservationFieldDefinitions(targetPetId));
      const dailyRecords = await healthRecordService.getDailyRecords(targetPetId);
      const observationValuesByRecordId = await loadObservationValuesByRecordId(dailyRecords);

      setRecords(dailyRecords);
      setRecordsPetId(targetPetId);
      setRecordObservationValuesByRecordId(observationValuesByRecordId);
      await loadRecordEditor(today, dailyRecords, nextDefinitions, observationValuesByRecordId);
    } finally {
      setIsLoadingRecords(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setIsInitializing(true);
      setErrorMessage(null);

      try {
        const shared = await loadShared(petId);
        if (cancelled || !shared) {
          return;
        }

        if (currentSection === "records") {
          await loadRecordsForPet(shared.pet.id, shared.definitions);
          if (cancelled) {
            return;
          }
        } else if (recordsPetId !== shared.pet.id) {
          setRecords([]);
          setRecordsPetId(null);
          setRecordObservationValuesByRecordId({});
          setRecordFormValues(createEmptyRecordForm(today));
          setObservationFormValues(createEmptyObservationValues(shared.definitions));
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
  }, [petId, today]);

  useEffect(() => {
    if (currentSection !== "records" || !selectedPet) {
      return;
    }

    if (recordsPetId === selectedPet.id) {
      return;
    }

    void loadRecordsForPet(selectedPet.id, observationFieldDefinitions).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "健康記録の読み込みに失敗しました。");
    });
  }, [currentSection, observationFieldDefinitions, recordsPetId, selectedPet]);

  const approximateAge = useMemo(
    () => (selectedProfile ? formatApproxAgeLabel(selectedProfile.birthMonth) : null),
    [selectedProfile],
  );
  const humanAge = useMemo(
    () =>
      selectedPet && selectedProfile
        ? formatApproxHumanAgeLabel(selectedPet.type, selectedProfile.birthMonth)
        : null,
    [selectedPet, selectedProfile],
  );


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

  async function handleDeletePet() {
    if (!selectedPet) {
      return;
    }

    const confirmed = window.confirm(
      `「${selectedPet.name}」を削除します。基本情報・既往歴・健康記録・追加観察項目もすべて削除されます。よろしいですか？`,
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingPet(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await healthRecordService.deletePet(selectedPet.id);
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

  async function handleSaveProfile(values: PetProfileFormValues) {
    if (!selectedPet) {
      return;
    }

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
  }

  async function handleCreateMedicalHistory(values: WorkspaceContextValue["handleCreateMedicalHistory"] extends (arg: infer T) => Promise<void> ? T : never) {
    if (!selectedPet) {
      return;
    }

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
  }

  async function handleUpdateMedicalHistory(
    itemId: string,
    values: WorkspaceContextValue["handleUpdateMedicalHistory"] extends (
      item: string,
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
      if (selectedPet) {
        await refreshMedicalHistoryItems(selectedPet.id);
      }
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
      if (selectedPet) {
        await refreshMedicalHistoryItems(selectedPet.id);
      }
      setSuccessMessage("既往歴を削除しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "既往歴の削除に失敗しました。");
    } finally {
      setIsSavingMedicalHistory(false);
    }
  }

  async function handleCreateObservationField(input: { label: string; type: ObservationFieldDefinition["type"] }) {
    if (!selectedPet) {
      return false;
    }

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

      await healthRecordService.updateObservationFieldDefinition({
        id: target.id,
        sortOrder: swapTarget.sortOrder,
      });
      await healthRecordService.updateObservationFieldDefinition({
        id: swapTarget.id,
        sortOrder: target.sortOrder,
      });

      await refreshObservationFieldDefinitions(target.petId);
      setSuccessMessage("観察項目の並び順を更新しました。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "観察項目の並び替えに失敗しました。");
    } finally {
      setIsSavingObservationField(false);
    }
  }

  async function handleDeleteObservationField(definitionId: string) {
    if (!selectedPet) {
      return;
    }

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
  }

  async function handleSaveRecord(values: DailyRecordFormValues) {
    if (!selectedPet) {
      return;
    }

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
      setRecordsPetId(selectedPet.id);
      setRecordObservationValuesByRecordId(nextObservationValuesByRecordId);
      await loadRecordEditor(saved.date, nextRecords, observationFieldDefinitions, nextObservationValuesByRecordId);
      setSuccessMessage(`${selectedPet.name} の ${saved.date} の記録を保存しました。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
    } finally {
      setIsSavingRecord(false);
    }
  }

  function closeSidebarOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }

  const sidebar = (
    <PetSidebar
      pets={pets}
      selectedPetId={selectedPet?.id ?? null}
      currentSection={currentSection}
      isCreatingPet={isCreatingPet}
      createValues={petCreateEditorValues}
      onSelect={(nextPetId) => {
        setSuccessMessage(null);
        router.push(getPetHref(nextPetId, currentSection));
        closeSidebarOnMobile();
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
          router.push(getPetHref(snapshot.pet.id, currentSection));
          closeSidebarOnMobile();
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "ペットの追加に失敗しました。");
        } finally {
          setIsCreatingPet(false);
        }
      }}
      onClose={() => setIsSidebarOpen(false)}
    />
  );

  if (isInitializing) {
    return (
      <main className="page-shell workspace-shell">
        <p className="status-text">読み込み中...</p>
      </main>
    );
  }

  if (!selectedPet || !selectedProfile) {
    return (
      <main className="page-shell workspace-shell workspace-empty-shell">
        <div className="workspace-toolbar card">
          <button
            type="button"
            className="sidebar-toggle-button"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-expanded={isSidebarOpen}
            aria-controls="pet-sidebar-panel"
          >
            {isSidebarOpen ? "一覧を閉じる" : "一覧を開く"}
          </button>
        </div>

        <div className={`workspace-backdrop${isSidebarOpen ? " visible" : ""}`} onClick={() => setIsSidebarOpen(false)} />

        <div className="workspace-layout">
          <aside
            id="pet-sidebar-panel"
            className={`workspace-sidebar-panel${isSidebarOpen ? " open" : " closed"}`}
            aria-hidden={!isSidebarOpen}
          >
            {sidebar}
          </aside>

          <div className="content-column workspace-main">
            <section className="hero card hero-card workspace-empty-card">
              <div>
                <p className="eyebrow">Pet Adviser</p>
                <h1>ペットを登録してください</h1>
                <p className="hero-copy">登録すると、基本情報や健康記録をすぐに管理できます。</p>
              </div>
            </section>
            {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
          </div>
        </div>
      </main>
    );
  }

  const contextValue: WorkspaceContextValue = {
    selectedPet,
    selectedProfile,
    records,
    recordObservationValuesByRecordId,
    observationFieldDefinitions,
    medicalHistoryItems,
    recordFormValues,
    observationFormValues,
    profileEditorValues,
    approximateAge,
    humanAge,
    successMessage,
    errorMessage,
    isSavingRecord: isSavingRecord || isLoadingRecords,
    isSavingProfile,
    isSavingObservationField,
    isSavingMedicalHistory,
    isDeletingPet,
    setSuccessMessage,
    setProfileEditorValues,
    setRecordFormValues,
    setObservationFormValues,
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

  const noteSummary = selectedProfile.notes?.trim() ? selectedProfile.notes.trim() : null;

  return (
    <PetWorkspaceContext.Provider value={contextValue}>
      <main className="page-shell workspace-shell">
        <div className="workspace-toolbar card">
          <div className="workspace-toolbar-main">
            <button
              type="button"
              className="sidebar-toggle-button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-expanded={isSidebarOpen}
              aria-controls="pet-sidebar-panel"
            >
              {isSidebarOpen ? "一覧を閉じる" : "一覧を開く"}
            </button>
            <div className="workspace-toolbar-copy">
              <p className="eyebrow">Pet Adviser</p>
              <strong>{selectedPet.name}</strong>
              <span>
                {currentSection === "records" ? "健康記録を確認中" : "基本情報を確認中"}
              </span>
            </div>
          </div>
        </div>

        <div className={`workspace-backdrop${isSidebarOpen ? " visible" : ""}`} onClick={() => setIsSidebarOpen(false)} />

        <div className="workspace-layout">
          <aside
            id="pet-sidebar-panel"
            className={`workspace-sidebar-panel${isSidebarOpen ? " open" : " closed"}`}
            aria-hidden={!isSidebarOpen}
          >
            {sidebar}
          </aside>

          <div className="content-column workspace-main">
            <section className="hero card hero-card hero-profile-card workspace-profile-header">
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
                  <p className="eyebrow">選択中のペット</p>
                  <h1>{selectedPet.name}</h1>
                  <div className="hero-chip-row">
                    <span className="hero-chip">{getPetTypeLabel(selectedPet.type)}</span>
                    <span className="hero-chip">性別: {getPetSexLabel(selectedProfile.sex)}</span>
                    <span className="hero-chip">去勢/避妊: {getSterilizedLabel(selectedProfile.sterilized)}</span>
                    {selectedProfile.breed ? <span className="hero-chip">{selectedProfile.breed}</span> : null}
                  </div>

                  <div className="hero-stat-grid workspace-hero-stats">
                    <div className="hero-stat-card">
                      <span>現在年齢</span>
                      <strong>{approximateAge ?? "誕生月を登録すると表示されます"}</strong>
                    </div>
                    <div className="hero-stat-card">
                      <span>人間年齢の概算</span>
                      <strong>{humanAge ?? "誕生月を登録すると表示されます"}</strong>
                    </div>
                  </div>

                  {noteSummary ? <p className="workspace-note-summary">{noteSummary}</p> : null}
                </div>
              </div>
            </section>

            <nav className="card section-tabs workspace-section-tabs" aria-label="ペットページ切り替え">
              <Link
                href={getPetHref(selectedPet.id, "profile")}
                className={`section-tab${currentSection === "profile" ? " active" : ""}`}
              >
                基本情報
              </Link>
              <Link
                href={getPetHref(selectedPet.id, "records")}
                className={`section-tab${currentSection === "records" ? " active" : ""}`}
              >
                健康記録
              </Link>
            </nav>

            {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}
            {successMessage ? <div className="feedback success">{successMessage}</div> : null}

            <section className="workspace-section-content">{children}</section>
          </div>
        </div>
      </main>
    </PetWorkspaceContext.Provider>
  );
}

export function usePetWorkspace() {
  const context = useContext(PetWorkspaceContext);
  if (!context) {
    throw new Error("usePetWorkspace must be used within PetWorkspaceLayout.");
  }
  return context;
}

export function PetProfileSection() {
  const {
    selectedPet,
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
  } = usePetWorkspace();

  return (
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
        onSubmit={handleSaveProfile}
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
          {isDeletingPet ? "削除中..." : `「${selectedPet.name}」を削除`}
        </button>
      </section>
    </>
  );
}

export function PetRecordsSection() {
  const {
    selectedPet,
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
  } = usePetWorkspace();

  const hasRecordForDate = records.some((record) => record.date === recordFormValues.date);
  const anomalyResult = anomalyService.evaluate(records, recordFormValues.date);

  return (
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
      {records.length === 0 && !isSavingRecord ? (
        <p className="status-text">{selectedPet.name} の健康記録はまだありません。</p>
      ) : null}
    </>
  );
}
