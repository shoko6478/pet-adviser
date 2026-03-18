import type { Pet, PetId, PetType } from "@/domain/models/pet";

interface PetSidebarProps {
  pets: Pet[];
  selectedPetId: PetId | null;
  onSelect: (petId: PetId) => void;
}

const PET_TYPE_LABELS: Record<PetType, string> = {
  cat: "猫",
  dog: "犬",
};

export function PetSidebar({ pets, selectedPetId, onSelect }: PetSidebarProps) {
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
          <p>種別ごとに切り替えられます。</p>
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
    </aside>
  );
}
