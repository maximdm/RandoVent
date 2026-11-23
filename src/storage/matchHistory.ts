// "Match History": a persistent, capped list of simulated matches so players can
// revisit past results and replay them deterministically (the stored seed + config
// reproduces the exact same SimResult). Pure operations are IO-free so they unit-
// test without a device; the repository layer handles persistence (AsyncStorage,
// then a file-backed store, then an in-memory fallback when nothing is available).

import { MatchConfig, SportKey } from '../engine';

export const MAX_HISTORY = 50;

// A compact record of a finished match. We store the full config + seed rather
// than the event log, so a replay re-simulates identically and storage stays small.
export interface MatchRecord {
  id: string;
  sport: SportKey;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'DRAW';
  seed: number;
  config: MatchConfig; // full config used to produce this match (for replay)
  label?: string; // optional user note
  createdAt: number;
}

export interface MatchHistoryRepository {
  load(): Promise<MatchRecord[]>;
  saveAll(records: MatchRecord[]): Promise<void>;
}

// ---- Pure operations (no IO) ----

let idCounter = 0;
function createId(): string {
  idCounter += 1;
  return `m${Date.now().toString(36)}-${idCounter}`;
}

export function addMatch(
  current: MatchRecord[],
  entry: Omit<MatchRecord, 'id' | 'createdAt'>,
  max = MAX_HISTORY,
): MatchRecord[] {
  const now = Date.now();
  const record: MatchRecord = { ...entry, id: createId(), createdAt: now };
  // Newest first; cap the list by dropping the oldest.
  const next = [record, ...current];
  return next.slice(0, max);
}

export function removeMatch(current: MatchRecord[], id: string): MatchRecord[] {
  return current.filter((m) => m.id !== id);
}

export function clearHistory(): MatchRecord[] {
  return [];
}

// ---- Repositories ----

export class InMemoryMatchHistoryRepository implements MatchHistoryRepository {
  private records: MatchRecord[] = [];
  async load(): Promise<MatchRecord[]> {
    return [...this.records];
  }
  async saveAll(records: MatchRecord[]): Promise<void> {
    this.records = [...records];
  }
}

interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const STORAGE_KEY = 'randovent.history.v1';

export class KeyValueMatchHistoryRepository implements MatchHistoryRepository {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<MatchRecord[]> {
    const raw = await this.store.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as MatchRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(records: MatchRecord[]): Promise<void> {
    await this.store.setItem(STORAGE_KEY, JSON.stringify(records));
  }
}

interface FileSystemLike {
  documentDirectory: string | null;
  getInfoAsync(path: string): Promise<{ exists: boolean }>;
  readFileAsync(path: string, encoding: string): Promise<string>;
  writeFileAsync(path: string, content: string, encoding: string): Promise<void>;
}

export class FileSystemMatchHistoryRepository implements MatchHistoryRepository {
  private readonly path: string;
  constructor(private readonly fs: FileSystemLike) {
    this.path = `${fs.documentDirectory}randovent.history.json`;
  }

  async load(): Promise<MatchRecord[]> {
    try {
      const info = await this.fs.getInfoAsync(this.path);
      if (!info.exists) return [];
      const raw = await this.fs.readFileAsync(this.path, 'utf8');
      const parsed = JSON.parse(raw) as MatchRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveAll(records: MatchRecord[]): Promise<void> {
    try {
      await this.fs.writeFileAsync(this.path, JSON.stringify(records), 'utf8');
    } catch {
      // Best-effort; ignore write failures (e.g. no storage permission).
    }
  }
}

// Best-effort factory: AsyncStorage (already a declared dependency) first, then
// expo-file-system, then in-memory. The module names are kept in local variables
// so the `require` is dynamic — Metro cannot statically resolve it, so a missing
// optional backend fails at runtime (caught here) rather than at bundle time.
export function createMatchHistoryRepository(): MatchHistoryRepository {
  const asyncStorageName = '@react-native-async-storage/async-storage';
  try {
    const storageMod = require(asyncStorageName) as
      | { default?: KeyValueStore; getItem?: unknown; setItem?: unknown }
      | undefined;
    const storage = (storageMod?.default ?? storageMod) as KeyValueStore | undefined;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      return new KeyValueMatchHistoryRepository(storage);
    }
  } catch {
    // Not installed — try the next backend.
  }

  const fileSystemName = 'expo-file-system';
  try {
    const fsMod = require(fileSystemName) as FileSystemLike | undefined;
    if (fsMod && fsMod.documentDirectory) {
      return new FileSystemMatchHistoryRepository(fsMod);
    }
  } catch {
    // Not installed — fall through to in-memory.
  }

  return new InMemoryMatchHistoryRepository();
}

export const historyRepo: MatchHistoryRepository = createMatchHistoryRepository();
