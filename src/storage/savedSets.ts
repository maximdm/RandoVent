// Saved lottery "notebook": a small, persistent list of up to MAX_SAVED_SETS
// generated ticket sets, each with an editable note (label). Pure operations are
// IO-free so they can be unit-tested without a device.

export const MAX_SAVED_SETS = 10;

export interface SavedLotterySet {
  id: string;
  numbers: string; // hyphen-joined display string, e.g. "03-12-27-31-45-49"
  label: string; // user note; defaults to "Set N"
  createdAt: number;
}

export interface SavedSetsRepository {
  load(): Promise<SavedLotterySet[]>;
  saveAll(sets: SavedLotterySet[]): Promise<void>;
}

// ---- Pure operations (no IO) ----

let idCounter = 0;
function createId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}-${idCounter}`;
}

export interface AddResult {
  sets: SavedLotterySet[];
  added: SavedLotterySet | null;
  full: boolean;
}

export function addSavedSet(
  current: SavedLotterySet[],
  entry: { numbers: string; label?: string },
  max = MAX_SAVED_SETS,
): AddResult {
  if (current.length >= max) {
    return { sets: current, added: null, full: true };
  }
  const added: SavedLotterySet = {
    id: createId(),
    numbers: entry.numbers,
    label: entry.label?.trim() || `Set ${current.length + 1}`,
    createdAt: Date.now(),
  };
  return { sets: [...current, added], added, full: false };
}

export function replaceSavedSet(
  current: SavedLotterySet[],
  id: string,
  entry: { numbers: string; label?: string },
): SavedLotterySet[] {
  return current.map((s) =>
    s.id === id
      ? {
          ...s,
          numbers: entry.numbers,
          label: entry.label?.trim() || s.label,
          createdAt: Date.now(),
        }
      : s,
  );
}

export function removeSavedSet(current: SavedLotterySet[], id: string): SavedLotterySet[] {
  return current.filter((s) => s.id !== id);
}

// ---- Repositories ----

// Session-only store (used as a fallback when no persistent backend is available).
export class InMemorySavedSetsRepository implements SavedSetsRepository {
  private sets: SavedLotterySet[] = [];
  async load(): Promise<SavedLotterySet[]> {
    return [...this.sets];
  }
  async saveAll(sets: SavedLotterySet[]): Promise<void> {
    this.sets = [...sets];
  }
}

interface AsyncStorageLike {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = 'randovent.savedLotterySets.v1';

export class AsyncStorageSavedSetsRepository implements SavedSetsRepository {
  constructor(private readonly storage: AsyncStorageLike) {}

  async load(): Promise<SavedLotterySet[]> {
    const raw = await this.storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as SavedLotterySet[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(sets: SavedLotterySet[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEY, JSON.stringify(sets));
  }
}

// Best-effort factory: use AsyncStorage when present, otherwise in-memory.
// The module name is held in a variable so TypeScript does not statically resolve
// (and reject) the import when the package is not installed.
export function createSavedSetsRepository(): SavedSetsRepository {
  try {
    const moduleName = '@react-native-async-storage/async-storage';
    const mod = require(moduleName) as
      | { default?: AsyncStorageLike; getItem?: unknown; setItem?: unknown }
      | undefined;
    const storage = (mod?.default ?? mod) as AsyncStorageLike | undefined;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      return new AsyncStorageSavedSetsRepository(storage);
    }
  } catch {
    // Package not installed — fall through to in-memory.
  }
  return new InMemorySavedSetsRepository();
}

export const savedSetsRepo: SavedSetsRepository = createSavedSetsRepository();
