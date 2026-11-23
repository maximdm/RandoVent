// "The Slip": a persistent collection of up to MAX_SLIP_SETS lottery ticket sets.
// Each set remembers the conditions it was generated under (count / range /
// duplicates / sorted) so it can be re-rolled with the *same* conditions but a
// fresh random outcome. Pure operations are IO-free so they unit-test without a
// device; the repository layer handles persistence (AsyncStorage, then a
// file-backed store, then in-memory fallback when nothing is available).

export const MAX_SLIP_SETS = 10;

// The conditions under which a single ticket set was drawn.
export interface SlipSetConfig {
  count: number;
  min: number;
  max: number;
  allowDuplicates: boolean;
  sorted: boolean;
}

export interface SlipSet {
  id: string;
  label: string; // user note; defaults to "Set N"
  numbers: string; // current display string, e.g. "03-12-27-31-45-49"
  config: SlipSetConfig; // used for re-rolls
  seed: number; // seed used for the current numbers (reference / reproducibility)
  createdAt: number;
  updatedAt: number;
}

export interface SlipRepository {
  load(): Promise<SlipSet[]>;
  saveAll(sets: SlipSet[]): Promise<void>;
}

// ---- Pure operations (no IO) ----

let idCounter = 0;
function createId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}-${idCounter}`;
}

export interface AddResult {
  sets: SlipSet[];
  added: SlipSet | null;
  full: boolean;
}

export function addSlipSet(
  current: SlipSet[],
  entry: { numbers: string; label?: string; config: SlipSetConfig; seed: number },
  max = MAX_SLIP_SETS,
): AddResult {
  if (current.length >= max) {
    return { sets: current, added: null, full: true };
  }
  const now = Date.now();
  const added: SlipSet = {
    id: createId(),
    numbers: entry.numbers,
    label: entry.label?.trim() || `Set ${current.length + 1}`,
    config: entry.config,
    seed: entry.seed,
    createdAt: now,
    updatedAt: now,
  };
  return { sets: [...current, added], added, full: false };
}

export function replaceSlipSet(
  current: SlipSet[],
  id: string,
  entry: { numbers?: string; label?: string },
): SlipSet[] {
  return current.map((s) =>
    s.id === id
      ? {
          ...s,
          ...(entry.numbers !== undefined ? { numbers: entry.numbers } : {}),
          label: entry.label?.trim() || s.label,
          updatedAt: Date.now(),
        }
      : s,
  );
}

export function removeSlipSet(current: SlipSet[], id: string): SlipSet[] {
  return current.filter((s) => s.id !== id);
}

// Re-roll a single set using the SAME conditions it was generated with, but a
// fresh random seed so the numbers differ. `makeSeed` is injectable for tests.
export function rerollSlipSet(
  current: SlipSet[],
  id: string,
  generate: (config: SlipSetConfig) => { numbers: string; seed: number },
): SlipSet[] {
  return current.map((s) => {
    if (s.id !== id) return s;
    const { numbers, seed } = generate(s.config);
    return { ...s, numbers, seed, updatedAt: Date.now() };
  });
}

// ---- Repositories ----

// Session-only store (fallback when no persistent backend is available).
export class InMemorySlipRepository implements SlipRepository {
  private sets: SlipSet[] = [];
  async load(): Promise<SlipSet[]> {
    return [...this.sets];
  }
  async saveAll(sets: SlipSet[]): Promise<void> {
    this.sets = [...sets];
  }
}

interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = 'randovent.slip.v1';

export class KeyValueSlipRepository implements SlipRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<SlipSet[]> {
    const raw = await this.store.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as SlipSet[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(sets: SlipSet[]): Promise<void> {
    await this.store.setItem(STORAGE_KEY, JSON.stringify(sets));
  }
}

// File-backed store via expo-file-system (pure-JS on the JS side; uses whichever
// native backend Expo provides). Tolerates a missing/invalid file.
interface FileSystemLike {
  documentDirectory: string | null;
  getInfoAsync(path: string): Promise<{ exists: boolean }>;
  readFileAsync(path: string, encoding: string): Promise<string>;
  writeFileAsync(path: string, content: string, encoding: string): Promise<void>;
}

export class FileSystemSlipRepository implements SlipRepository {
  private readonly path: string;
  constructor(private readonly fs: FileSystemLike) {
    this.path = `${fs.documentDirectory}randovent.slip.json`;
  }

  async load(): Promise<SlipSet[]> {
    try {
      const info = await this.fs.getInfoAsync(this.path);
      if (!info.exists) return [];
      const raw = await this.fs.readFileAsync(this.path, 'utf8');
      const parsed = JSON.parse(raw) as SlipSet[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(sets: SlipSet[]): Promise<void> {
    try {
      await this.fs.writeFileAsync(this.path, JSON.stringify(sets), 'utf8');
    } catch {
      // Best-effort; ignore write failures (e.g. no storage permission).
    }
  }
}

// Best-effort factory: AsyncStorage (already a declared dependency) first, then
// expo-file-system, then in-memory. The module names are kept in local variables
// so the `require` is dynamic — Metro cannot statically resolve it, so a missing
// optional backend fails at runtime (caught here) rather than at bundle time.
export function createSlipRepository(): SlipRepository {
  const asyncStorageName = '@react-native-async-storage/async-storage';
  try {
    const storageMod = require(asyncStorageName) as
      | { default?: KeyValueStore; getItem?: unknown; setItem?: unknown }
      | undefined;
    const storage = (storageMod?.default ?? storageMod) as KeyValueStore | undefined;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      return new KeyValueSlipRepository(storage);
    }
  } catch {
    // Not installed — try the next backend.
  }

  const fileSystemName = 'expo-file-system';
  try {
    const fsMod = require(fileSystemName) as FileSystemLike | undefined;
    if (fsMod && fsMod.documentDirectory) {
      return new FileSystemSlipRepository(fsMod);
    }
  } catch {
    // Not installed — fall through to in-memory.
  }

  return new InMemorySlipRepository();
}

export const slipRepo: SlipRepository = createSlipRepository();
