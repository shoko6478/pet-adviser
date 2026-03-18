import type {
  ObservationFieldDefinition,
  ObservationFieldDefinitionId,
  ObservationFieldType,
} from "@/domain/models/observation-field-definition";
import type { PetId } from "@/domain/models/pet";
import type { ObservationFieldDefinitionRepository } from "@/domain/repositories/observation-field-definition-repository";

const OBSERVATION_FIELD_DEFINITIONS_KEY = "pet-adviser/observation-field-definitions/v1";

function isObservationFieldType(value: unknown): value is ObservationFieldType {
  return value === "checkbox" || value === "text";
}

function normalizeObservationFieldDefinition(value: unknown): ObservationFieldDefinition | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<ObservationFieldDefinition>;
  if (
    typeof raw.id !== "string" ||
    typeof raw.petId !== "string" ||
    typeof raw.label !== "string" ||
    !isObservationFieldType(raw.type) ||
    typeof raw.sortOrder !== "number"
  ) {
    return null;
  }

  return {
    id: raw.id,
    petId: raw.petId,
    label: raw.label,
    type: raw.type,
    sortOrder: raw.sortOrder,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

function parseObservationFieldDefinitions(raw: string | null): ObservationFieldDefinition[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeObservationFieldDefinition)
          .filter((item): item is ObservationFieldDefinition => item !== null)
      : [];
  } catch {
    return [];
  }
}

function sortDefinitions(definitions: ObservationFieldDefinition[]): ObservationFieldDefinition[] {
  return [...definitions].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export class LocalObservationFieldDefinitionRepository implements ObservationFieldDefinitionRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  private readAll(): ObservationFieldDefinition[] {
    return sortDefinitions(parseObservationFieldDefinitions(this.storage?.getItem(OBSERVATION_FIELD_DEFINITIONS_KEY) ?? null));
  }

  private writeAll(definitions: ObservationFieldDefinition[]): void {
    this.storage?.setItem(OBSERVATION_FIELD_DEFINITIONS_KEY, JSON.stringify(sortDefinitions(definitions)));
  }

  async findByPetId(petId: PetId): Promise<ObservationFieldDefinition[]> {
    return this.readAll().filter((definition) => definition.petId === petId);
  }

  async findById(id: ObservationFieldDefinitionId): Promise<ObservationFieldDefinition | null> {
    return this.readAll().find((definition) => definition.id === id) ?? null;
  }

  async save(definition: ObservationFieldDefinition): Promise<void> {
    const definitions = this.readAll();
    const index = definitions.findIndex((item) => item.id === definition.id);

    if (index >= 0) {
      definitions[index] = definition;
    } else {
      definitions.push(definition);
    }

    this.writeAll(definitions);
  }

  async delete(id: ObservationFieldDefinitionId): Promise<void> {
    this.writeAll(this.readAll().filter((definition) => definition.id !== id));
  }
}
