import type { PetCreateFormValues } from "@/components/pet/PetCreateForm";
import { PetCreateForm } from "@/components/pet/PetCreateForm";
import type { Pet, PetId, PetType } from "@/domain/models/pet";

interface PetSidebarProps {
  pets: Pet[];
  selectedPetId: PetId | null;
  isCreatingPet: boolean;
  createValues: PetCreateFormValues;
  currentSection: "profile" | "records";
  onSelect: (petId: PetId) => void;
  onCreateValuesChange: (values: PetCreateFormValues) => void;
  onCreatePet: (values: PetCreateFormValues) => Promise<void>;
}

const PET_TYPE_LABELS: Record<PetType, string> = {
  cat: "猫",
  dog: "犬",
};

export function PetSidebar({
  pets,
  selectedPetId,
  isCreatingPet,
  createValues,
  currentSection,
  onSelect,
  onCreateValuesChange,
  onCreatePet,
}: PetSidebarProps) {
  const groups = pets.reduce<Record<PetType, Pet[]>>(
    (acc, pet) => {
      acc[pet.type].push(pet);
      return acc;
    },
    { cat: [], dog: [] },
  );

  return (
    <aside className="sidebar card">
      <div className="section-header sidebar-header">
        <div>
          <h2>ペット一覧</h2>
          <p>
            {currentSection === "records"
              ? "健康記録ページのまま切り替えます。"
              : "基本情報ページのまま切り替えます。"}
          </p>
        </div>
      </div>

      <div className="sidebar-groups">
        {Object.entries(groups).map(([type, group]) =>
          group.length > 0 ? (
            <section key={type} className="sidebar-group">
              <h3>{PET_TYPE_LABELS[type as PetType]}</h3>
              <ul>
                {group.map((pet) => {
                  const isActive = pet.id === selectedPetId;
                  return (
                    <li key={pet.id}>
                      <button
                        type="button"
                        className={`pet-switcher${isActive ? " active" : ""}`}
                        onClick={() => onSelect(pet.id)}
                      >
                        <span>{pet.name}</span>
                        <small>{PET_TYPE_LABELS[pet.type]}</small>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null,
        )}
      </div>

      <div className="sidebar-create">
        <PetCreateForm
          values={createValues}
          isSaving={isCreatingPet}
          onChange={onCreateValuesChange}
          onSubmit={onCreatePet}
        />
      </div>
    </aside>
  );
}
