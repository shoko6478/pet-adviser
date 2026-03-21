import Link from "next/link";
import type { Pet } from "@/domain/models/pet";
import type { PetProfile } from "@/domain/models/pet-profile";
import {
  formatApproxAgeLabel,
  getPetInitial,
  getPetSexLabel,
  getPetTypeLabel,
} from "@/lib/utils/pet-profile";
import { getPetHref } from "@/components/pet/pet-workspace-shared";

interface PetHeaderProps {
  pet: Pet;
  profile: PetProfile;
  latestWeightLabel: string | null;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function truncateNoteSummary(note: string): { summary: string; truncated: boolean } {
  const normalized = note.trim().replace(/\s+/g, " ");
  if (normalized.length <= 88) {
    return { summary: normalized, truncated: false };
  }

  return {
    summary: `${normalized.slice(0, 88).trimEnd()}…`,
    truncated: true,
  };
}

export function PetHeader({ pet, profile, latestWeightLabel, isSidebarOpen, onToggleSidebar }: PetHeaderProps) {
  const approximateAge = formatApproxAgeLabel(profile.birthMonth);
  const noteSummary = profile.notes?.trim() ? truncateNoteSummary(profile.notes) : null;

  return (
    <section className="hero card hero-card hero-profile-card workspace-profile-header">
      <div className="hero-profile-layout">
        <div className="hero-photo-wrap">
          <div className="profile-photo-preview hero-avatar">
            {profile.photoDataUrl ? (
              <img src={profile.photoDataUrl} alt={`${pet.name}の写真`} className="profile-photo-image" />
            ) : (
              <span>{getPetInitial(pet.name)}</span>
            )}
          </div>
        </div>

        <div className="hero-main">
          <div className="workspace-header-topline">
            <div>
              <p className="eyebrow">選択中のペット</p>
              <h1>{pet.name}</h1>
            </div>
            <div className="workspace-header-actions">
              <button
                type="button"
                className="sidebar-toggle-button workspace-header-button"
                onClick={onToggleSidebar}
                aria-expanded={isSidebarOpen}
                aria-controls="pet-sidebar-panel"
              >
                {isSidebarOpen ? "一覧を閉じる" : "一覧を開く"}
              </button>
              <Link href={`${getPetHref(pet.id, "profile")}#profile-edit-section`} className="ghost-button workspace-edit-link">
                基本情報を編集
              </Link>
            </div>
          </div>

          <div className="hero-chip-row">
            <span className="hero-chip">
              {getPetTypeLabel(pet.type)}
              {profile.breed ? ` / ${profile.breed}` : ""}
            </span>
            <span className="hero-chip">性別: {getPetSexLabel(profile.sex)}</span>
            <span className="hero-chip">年齢: {approximateAge ?? "未設定"}</span>
            <span className="hero-chip">最新体重: {latestWeightLabel ?? "未記録"}</span>
          </div>

          {noteSummary ? (
            <div className="workspace-note-summary-block">
              <p className="workspace-note-summary">{noteSummary.summary}</p>
              {noteSummary.truncated ? (
                <Link href={`${getPetHref(pet.id, "profile")}#profile-note-panel`} className="workspace-note-link">
                  メモ全文を見る
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
