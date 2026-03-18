import type { Cat, CatId } from "@/domain/models/cat";

export interface CatRepository {
  findAll(): Promise<Cat[]>;
  findById(id: CatId): Promise<Cat | null>;
  save(cat: Cat): Promise<void>;
}
