import type { PetType } from "@/domain/models/pet";
import type { PetSex } from "@/domain/models/pet-profile";
import { getMonthDifference, getTodayDateString } from "@/lib/utils/date";

export interface ApproxAge {
  years: number;
  months: number;
  totalMonths: number;
}

export function calculateApproxAge(birthMonth?: string, today = getTodayDateString()): ApproxAge | null {
  if (!birthMonth || !/^\d{4}-\d{2}$/.test(birthMonth)) {
    return null;
  }

  const totalMonths = getMonthDifference(birthMonth, today);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    totalMonths,
  };
}

export function formatApproxAgeLabel(birthMonth?: string): string | null {
  const age = calculateApproxAge(birthMonth);
  if (!age) return null;
  return `およそ ${age.years}歳 ${age.months}か月`;
}

export function estimateHumanAge(type: PetType, birthMonth?: string): number | null {
  const age = calculateApproxAge(birthMonth);
  if (!age) return null;

  const years = age.totalMonths / 12;
  if (years <= 0) return 0;

  if (type === "cat") {
    if (years <= 1) return Math.round(15 * years);
    if (years <= 2) return Math.round(15 + (years - 1) * 9);
    return Math.round(24 + (years - 2) * 4);
  }

  if (years <= 1) return Math.round(15 * years);
  if (years <= 2) return Math.round(15 + (years - 1) * 9);
  return Math.round(24 + (years - 2) * 5);
}

export function formatApproxHumanAgeLabel(type: PetType, birthMonth?: string): string | null {
  const humanAge = estimateHumanAge(type, birthMonth);
  if (humanAge === null) return null;
  return `人間換算でおよそ ${humanAge}歳`;
}

export function getPetTypeLabel(type: PetType): string {
  return type === "cat" ? "猫" : "犬";
}

export function getPetSexLabel(sex?: PetSex): string {
  switch (sex) {
    case "male":
      return "オス";
    case "female":
      return "メス";
    default:
      return "不明";
  }
}

export function getSterilizedLabel(sterilized?: boolean): string {
  return sterilized ? "済み" : "未";
}

export function getPetInitial(name: string): string {
  return name.trim().slice(0, 1) || "P";
}
