import Link from "next/link";
import { getPetHref } from "@/components/pet/pet-workspace-shared";

interface PetContentTabsProps {
  petId: string;
  currentSection: "profile" | "records";
}

export function PetContentTabs({ petId, currentSection }: PetContentTabsProps) {
  return (
    <nav className="card section-tabs workspace-section-tabs" aria-label="ペットページ切り替え">
      <Link
        href={getPetHref(petId, "profile")}
        className={`section-tab${currentSection === "profile" ? " active" : ""}`}
      >
        基本情報
      </Link>
      <Link
        href={getPetHref(petId, "records")}
        className={`section-tab${currentSection === "records" ? " active" : ""}`}
      >
        健康記録
      </Link>
    </nav>
  );
}
