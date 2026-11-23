// "The Slips": a persistent collection of NAMED lottery slips. Each slip holds up
// to MAX_SLIP_SETS ticket sets, and each set remembers the conditions it was
// generated under (count / range / duplicates / sorted) so it can be re-rolled
// with the *same* conditions but a fresh random outcome. Slips are collapsible in
// the UI and can be named. Pure operations are IO-free so they unit-test without a
// device; the repository layer handles persistence (AsyncStorage, then a file-
// backed store, then in-memory fallback when nothing is available).

export const MAX_SLIPS = 10;
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
  label: string; // user note for the individual set; defaults to "Set N"
  numbers: string; // current display string, e.g. "03-12-27-31-45-49"
  config: SlipSetConfig; // used for re-rolls
  seed: number; // seed used for the current numbers (reference / reproducibility)
  createdAt: number;
  updatedAt: number;
}

export interface Slip {
  id: string;
  name: string; // user-given name, e.g. "Friday Lotto"
  sets: SlipSet[];
  collapsed: boolean; // UI state, persisted so it survives restarts
  createdAt: number;
  updatedAt: number;
}

export interface SlipRepository {
  load(): Promise<Slip[]>;
  saveAll(slips: Slip[]): Promise<void>;
}

// ---- Pure operations (no IO) ----

let idCounter = 0;
function createId(): string {
  idCounter += 1;
  return `s${Date.now().toString(36)}-${idCounter}`;
}

export interface CreateSlipResult {
  slips: Slip[];
  created: Slip | null;
  full: boolean;
}

export function createSlip(
  current: Slip[],
  name?: string,
  max = MAX_SLIPS,
): CreateSlipResult {
  if (current.length >= max) {
    return { slips: current, created: null, full: true };
  }
  const now = Date.now();
  const created: Slip = {
    id: createId(),
    name: name?.trim() || `Slip ${current.length + 1}`,
    sets: [],
    collapsed: false,
    createdAt: now,
    updatedAt: now,
  };
  return { slips: [...current, created], created, full: false };
}

export function renameSlip(current: Slip[], id: string, name: string): Slip[] {
  const trimmed = name.trim();
  return current.map((s) =>
    s.id === id ? { ...s, name: trimmed || s.name, updatedAt: Date.now() } : s,
  );
}

export function setSlipCollapsed(current: Slip[], id: string, collapsed: boolean): Slip[] {
  return current.map((s) =>
    s.id === id ? { ...s, collapsed, updatedAt: Date.now() } : s,
  );
}

export function removeSlip(current: Slip[], id: string): Slip[] {
  return current.filter((s) => s.id !== id);
}

// ---- Per-set operations on a single slip's set list ----

function addSet(
  sets: SlipSet[],
  entry: { numbers: string; label?: string; config: SlipSetConfig; seed: number },
  max = MAX_SLIP_SETS,
): { sets: SlipSet[]; added: SlipSet | null; full: boolean } {
  if (sets.length >= max) return { sets, added: null, full: true };
  const now = Date.now();
  const added: SlipSet = {
    id: createId(),
    numbers: entry.numbers,
    label: entry.label?.trim() || `Set ${sets.length + 1}`,
    config: entry.config,
    seed: entry.seed,
    createdAt: now,
    updatedAt: now,
  };
  return { sets: [...sets, added], added, full: false };
}

function replaceSet(
  sets: SlipSet[],
  setId: string,
  entry: { numbers?: string; label?: string },
): SlipSet[] {
  return sets.map((s) =>
    s.id === setId
      ? {
          ...s,
          ...(entry.numbers !== undefined ? { numbers: entry.numbers } : {}),
          label: entry.label?.trim() || s.label,
          updatedAt: Date.now(),
        }
      : s,
  );
}

function removeSet(sets: SlipSet[], setId: string): SlipSet[] {
  return sets.filter((s) => s.id !== setId);
}

function rerollSet(
  sets: SlipSet[],
  setId: string,
  generate: (config: SlipSetConfig) => { numbers: string; seed: number },
): SlipSet[] {
  return sets.map((s) => {
    if (s.id !== setId) return s;
    const { numbers, seed } = generate(s.config);
    return { ...s, numbers, seed, updatedAt: Date.now() };
  });
}

// ---- Slip-level operations ----

export interface AddSetResult {
  slips: Slip[];
  full: boolean; // the target slip was already at capacity
}

export function addSetToSlip(
  current: Slip[],
  slipId: string,
  entry: { numbers: string; label?: string; config: SlipSetConfig; seed: number },
): AddSetResult {
  let full = false;
  const slips = current.map((s) => {
    if (s.id !== slipId) return s;
    const res = addSet(s.sets, entry);
    full = res.full;
    return { ...s, sets: res.sets, updatedAt: Date.now() };
  });
  return { slips, full };
}

export function replaceSetInSlip(
  current: Slip[],
  slipId: string,
  setId: string,
  entry: { numbers?: string; label?: string },
): Slip[] {
  return current.map((s) =>
    s.id === slipId ? { ...s, sets: replaceSet(s.sets, setId, entry), updatedAt: Date.now() } : s,
  );
}

export function removeSetFromSlip(current: Slip[], slipId: string, setId: string): Slip[] {
  return current.map((s) =>
    s.id === slipId ? { ...s, sets: removeSet(s.sets, setId), updatedAt: Date.now() } : s,
  );
}

export function rerollSetInSlip(
  current: Slip[],
  slipId: string,
  setId: string,
  generate: (config: SlipSetConfig) => { numbers: string; seed: number },
): Slip[] {
  return current.map((s) =>
    s.id === slipId ? { ...s, sets: rerollSet(s.sets, setId, generate), updatedAt: Date.now() } : s,
  );
}

// ---- Repositories ----

// Session-only store (fallback when no persistent backend is available).
export class InMemorySlipRepository implements SlipRepository {
  private slips: Slip[] = [];
  async load(): Promise<Slip[]> {
    return [...this.slips];
  }
  async saveAll(slips: Slip[]): Promise<void> {
    this.slips = [...slips];
  }
}

interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = 'randovent.slips.v1';

export class KeyValueSlipRepository implements SlipRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<Slip[]> {
    const raw = await this.store.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as Slip[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(slips: Slip[]): Promise<void> {
    await this.store.setItem(STORAGE_KEY, JSON.stringify(slips));
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
    this.path = `${fs.documentDirectory}randovent.slips.json`;
  }

  async load(): Promise<Slip[]> {
    try {
      const info = await this.fs.getInfoAsync(this.path);
      if (!info.exists) return [];
      const raw = await this.fs.readFileAsync(this.path, 'utf8');
      const parsed = JSON.parse(raw) as Slip[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(slips: Slip[]): Promise<void> {
    try {
      await this.fs.writeFileAsync(this.path, JSON.stringify(slips), 'utf8');
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
