import { LocalJsonPreferenceRepository } from "@/infrastructure/repositories/local-json-preference-repository";

const COLUMN_WIDTHS_STORAGE_KEY = "pet-adviser/medical-history-table-widths/v1";

class MedicalHistoryUiPreferenceService {
  constructor(private readonly repository: LocalJsonPreferenceRepository) {}

  loadColumnWidths<T>(): T | null {
    return this.repository.get<T>(COLUMN_WIDTHS_STORAGE_KEY);
  }

  saveColumnWidths<T>(widths: T): void {
    this.repository.set(COLUMN_WIDTHS_STORAGE_KEY, widths);
  }
}

export const medicalHistoryUiPreferenceService = new MedicalHistoryUiPreferenceService(
  new LocalJsonPreferenceRepository(),
);
