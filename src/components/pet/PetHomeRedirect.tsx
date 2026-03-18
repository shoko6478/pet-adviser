"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PetCreateForm, type PetCreateFormValues } from "@/components/pet/PetCreateForm";
import {
  createEmptyPetCreateForm,
  getPetHref,
  healthRecordService,
} from "@/components/pet/pet-workspace-shared";

export function PetHomeRedirect() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [values, setValues] = useState<PetCreateFormValues>(() => createEmptyPetCreateForm());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const pets = await healthRecordService.getOrCreatePets();
      if (!isMounted) return;

      const firstPet = pets[0];
      if (firstPet) {
        router.replace(getPetHref(firstPet.id, "records"));
        return;
      }

      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <main className="page-shell">
        <p className="status-text">ペット情報を読み込んでいます...</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="card empty-home-card">
        <div className="section-header">
          <h1>最初のペットを登録しましょう</h1>
          <p>登録後すぐに基本情報や健康記録を管理できます。</p>
        </div>

        {errorMessage ? <div className="feedback error">{errorMessage}</div> : null}

        <PetCreateForm
          values={values}
          isSaving={isCreating}
          onChange={(nextValues) => {
            setErrorMessage(null);
            setValues(nextValues);
          }}
          onSubmit={async (nextValues) => {
            setIsCreating(true);
            setErrorMessage(null);

            try {
              const snapshot = await healthRecordService.createPet(nextValues);
              router.replace(getPetHref(snapshot.pet.id, "profile"));
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : "ペットの追加に失敗しました。");
            } finally {
              setIsCreating(false);
            }
          }}
        />
      </section>
    </main>
  );
}
