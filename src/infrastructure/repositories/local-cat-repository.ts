import type { Cat, CatId } from "@/domain/models/cat";
import type { CatRepository } from "@/domain/repositories/cat-repository";

const CATS_KEY = "pet-adviser/cats/v1";

function parseCats(raw: string | null): Cat[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Cat[]) : [];
  } catch {
    return [];
  }
}

export class LocalCatRepository implements CatRepository {
  private get storage(): Storage | null {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  }

  async findAll(): Promise<Cat[]> {
    return parseCats(this.storage?.getItem(CATS_KEY) ?? null);
  }

  async findById(id: CatId): Promise<Cat | null> {
    const cats = await this.findAll();
    return cats.find((cat) => cat.id === id) ?? null;
  }

  async save(cat: Cat): Promise<void> {
    const cats = await this.findAll();
    const index = cats.findIndex((item) => item.id === cat.id);

    if (index >= 0) {
      cats[index] = cat;
    } else {
      cats.push(cat);
    }

    this.storage?.setItem(CATS_KEY, JSON.stringify(cats));
  }
}
