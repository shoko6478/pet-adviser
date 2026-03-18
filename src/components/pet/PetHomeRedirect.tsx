"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPetHref, healthRecordService } from "@/components/pet/pet-workspace-shared";

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
