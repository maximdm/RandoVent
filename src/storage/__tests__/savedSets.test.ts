import { describe, it, expect } from 'vitest';
import {
  addSavedSet,
  replaceSavedSet,
  removeSavedSet,
  MAX_SAVED_SETS,
  InMemorySavedSetsRepository,
  AsyncStorageSavedSetsRepository,
} from '../savedSets';

describe('savedSets pure operations', () => {
  it('adds sets up to the cap and reports full thereafter', () => {
    let sets = [] as ReturnType<typeof addSavedSet>['sets'];
    let res = addSavedSet(sets, { numbers: '01-02-03' });
    expect(res.full).toBe(false);
    sets = res.sets;
    expect(sets).toHaveLength(1);
    expect(sets[0].label).toBe('Set 1');
    expect(sets[0].numbers).toBe('01-02-03');

    // Fill to capacity.
    for (let i = 2; i <= MAX_SAVED_SETS; i++) {
      res = addSavedSet(sets, { numbers: `0${i}` });
      sets = res.sets;
    }
    expect(sets).toHaveLength(MAX_SAVED_SETS);
    expect(res.full).toBe(false);

    // Over capacity -> unchanged and full.
    res = addSavedSet(sets, { numbers: '99-99' });
    expect(res.full).toBe(true);
    expect(res.added).toBeNull();
    expect(res.sets).toHaveLength(MAX_SAVED_SETS);
  });

  it('uses a custom label when provided', () => {
    const { sets } = addSavedSet([], { numbers: '01-02', label: 'My lucky pick' });
    expect(sets[0].label).toBe('My lucky pick');
  });

  it('replaces a set by id and refreshes createdAt', () => {
    const { sets } = addSavedSet([], { numbers: '01-02-03' });
    const id = sets[0].id;
    const replaced = replaceSavedSet(sets, id, { numbers: '10-20-30', label: 'edited' });
    expect(replaced[0].numbers).toBe('10-20-30');
    expect(replaced[0].label).toBe('edited');
    expect(replaced[0].createdAt).toBeGreaterThanOrEqual(sets[0].createdAt);
    // Other fields preserved.
    expect(replaced[0].id).toBe(id);
  });

  it('removes a set by id', () => {
    let { sets } = addSavedSet([], { numbers: '01' });
    const r2 = addSavedSet(sets, { numbers: '02' });
    sets = r2.sets;
    const removed = removeSavedSet(sets, sets[0].id);
    expect(removed).toHaveLength(1);
    expect(removed[0].numbers).toBe('02');
  });
});

describe('SavedSetsRepository implementations', () => {
  it('InMemorySavedSetsRepository round-trips', async () => {
    const repo = new InMemorySavedSetsRepository();
    expect(await repo.load()).toEqual([]);
    const { sets } = addSavedSet([], { numbers: '01-02' });
    await repo.saveAll(sets);
    expect(await repo.load()).toEqual(sets);
  });

  it('AsyncStorageSavedSetsRepository persists JSON and tolerates corruption', async () => {
    const backing = new Map<string, string>();
    const mockStorage = {
      getItem: async (k: string) => backing.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        backing.set(k, v);
      },
    };
    const repo = new AsyncStorageSavedSetsRepository(mockStorage);
    expect(await repo.load()).toEqual([]);

    const { sets } = addSavedSet([], { numbers: '03-12-27' });
    await repo.saveAll(sets);
    expect(await repo.load()).toEqual(sets);

    // Corrupt the stored value -> load returns [] rather than throwing.
    backing.set('randovent.savedLotterySets.v1', 'not-json');
    expect(await repo.load()).toEqual([]);
  });
});
