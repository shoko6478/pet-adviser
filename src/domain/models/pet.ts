export type PetId = string;
export type PetType = "cat" | "dog";

export interface Pet {
  id: PetId;
  type: PetType;
  name: string;
  createdAt: string;
  updatedAt: string;
}
