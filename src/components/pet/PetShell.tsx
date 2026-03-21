"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { PetCreateFormValues } from "@/components/pet/PetCreateForm";
import { PetContentTabs } from "@/components/pet/PetContentTabs";
import { PetHeader } from "@/components/pet/PetHeader";
import { PetWorkspacePanelsProvider } from "@/components/pet/PetWorkspacePanels";
import { createEmptyPetCreateForm, getPetHref, healthRecordService } from "@/components/pet/pet-workspace-shared";
import { PetSidebar } from "@/components/record/PetSidebar";
import type { DailyRecord } from "@/domain/models/daily-record";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";

interface PetShellProps {
  petId: string;
  children: ReactNode;
}

function getCurrentSection(pathname: string): "profile" | "records" {
  return pathname.endsWith("/records") ? "records" : "profile";
}

function getLatestWeightLabel(records: DailyRecord[]): string | null {
  const latest = [...records]
    .filter((record) => typeof record.weight === "number" && Number.isFinite(record.weight))
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  return latest ? `${latest.weight} kg (${latest.date})` : null;
}

export function PetShell({ petId, children }: PetShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSection = getCurrentSection(pathname);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PetProfile | null>(null);
  const [latestWeightLabel, setLatestWeightLabel] = useState<string | null>(null);
  const [petCreateEditorValues, setPetCreateEditorValues] = useState<PetCreateFormValues>(() => createEmptyPetCreateForm());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCreatingPet, setIsCreatingPet] = useState(false);
  const [shellErrorMessage, setShellErrorMessage] = useState<string | null>(null);
  const [shellSuccessMessage, setShellSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadShell() {
      setIsInitializing(true);
      setShellErrorMessage(null);

      try {
        const nextPets = await healthRecordService.getOrCreatePets();
        const nextPet = nextPets.find((pet) => pet.id === petId) ?? nextPets[0] ?? null;

        if (!nextPet) {
          if (!cancelled) {
            setPets([]);
            setSelectedPet(null);
            setSelectedProfile(null);
            setLatestWeightLabel(null);
          }
          return;
        }

        if (petId !== nextPet.id) {
          router.replace(getPetHref(nextPet.id, currentSection));
        }

        const [snapshot, dailyRecords] = await Promise.all([
          healthRecordService.getPetSnapshot(nextPet.id),
          healthRecordService.getDailyRecords(nextPet.id),
        ]);

        if (!snapshot) {
          throw new Error("選択中のペット情報を読み込めませんでした。");
        }

        if (!cancelled) {
          setPets(nextPets);
          setSelectedPet(snapshot.pet);
          setSelectedProfile(snapshot.profile);
          setLatestWeightLabel(getLatestWeightLabel(dailyRecords));
        }
      } catch (error) {
        if (!cancelled) {
          setShellErrorMessage(error instanceof Error ? error.message : "データの読み込みに失敗しました。");
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void loadShell();

    return () => {
      cancelled = true;
    };
  }, [petId, router]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncViewportState() {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    }

    syncViewportState();
    window.addEventListener("resize", syncViewportState);
    return () => window.removeEventListener("resize", syncViewportState);
  }, []);

  const sidebar = useMemo(
    () => (
      <PetSidebar
        pets={pets}
        selectedPetId={selectedPet?.id ?? null}
        currentSection={currentSection}
        isCreatingPet={isCreatingPet}
        createValues={petCreateEditorValues}
        onSelect={(nextPetId) => {
          setShellSuccessMessage(null);
          router.push(getPetHref(nextPetId, currentSection));
        }}
        onCreateValuesChange={(values) => {
          setShellSuccessMessage(null);
          setPetCreateEditorValues(values);
        }}
        onCreatePet={async (values) => {
          setIsCreatingPet(true);
          setShellErrorMessage(null);
          setShellSuccessMessage(null);

          try {
            const snapshot = await healthRecordService.createPet(values);
            const nextPets = await healthRecordService.getPets();
            setPets(nextPets);
            setPetCreateEditorValues(createEmptyPetCreateForm());
            setShellSuccessMessage(`${snapshot.pet.name} を追加しました。`);
            router.push(getPetHref(snapshot.pet.id, currentSection));
          } catch (error) {
            setShellErrorMessage(error instanceof Error ? error.message : "ペットの追加に失敗しました。");
          } finally {
            setIsCreatingPet(false);
          }
        }}
      />
    ),
    [currentSection, isCreatingPet, petCreateEditorValues, pets, router, selectedPet?.id],
  );

  async function handleDeletePet(targetPet: Pet) {
    const confirmed = window.confirm(
      `「${targetPet.name}」を削除します。基本情報・既往歴・健康記録・追加観察項目もすべて削除されます。よろしいですか？`,
    );
    if (!confirmed) {
      return;
    }

    setShellErrorMessage(null);
    setShellSuccessMessage(null);

    try {
      await healthRecordService.deletePet(targetPet.id);
      const remainingPets = await healthRecordService.getPets();
      if (remainingPets.length > 0) {
        router.replace(getPetHref(remainingPets[0].id, "profile"));
      } else {
        router.replace("/");
      }
    } catch (error) {
      setShellErrorMessage(error instanceof Error ? error.message : "ペットの削除に失敗しました。");
      throw error;
    }
  }

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
            {shellErrorMessage ? <div className="feedback error">{shellErrorMessage}</div> : null}
            {shellSuccessMessage ? <div className="feedback success">{shellSuccessMessage}</div> : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell workspace-shell">
      <div className="workspace-layout">
        <aside
          id="pet-sidebar-panel"
          className={`workspace-sidebar-panel${isSidebarOpen ? " open" : " closed"}`}
          aria-hidden={!isSidebarOpen}
        >
          {sidebar}
        </aside>

        <div className="content-column workspace-main">
          {shellErrorMessage ? <div className="feedback error">{shellErrorMessage}</div> : null}
          {shellSuccessMessage ? <div className="feedback success">{shellSuccessMessage}</div> : null}

          <PetHeader pet={selectedPet} profile={selectedProfile} latestWeightLabel={latestWeightLabel} />
          <PetContentTabs petId={selectedPet.id} currentSection={currentSection} />

          <PetWorkspacePanelsProvider
            pet={selectedPet}
            profile={selectedProfile}
            currentSection={currentSection}
            onProfileSaved={(snapshot) => {
              setSelectedPet(snapshot.pet);
              setSelectedProfile(snapshot.profile);
            }}
            onLatestWeightChange={setLatestWeightLabel}
            onDeletePet={handleDeletePet}
          >
            <section className="workspace-section-content">{children}</section>
          </PetWorkspacePanelsProvider>
        </div>
      </div>
    </main>
  );
}
