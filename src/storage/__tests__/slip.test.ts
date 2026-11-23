import { describe, it, expect } from 'vitest';
import {
  addSlipSet,
  replaceSlipSet,
  removeSlipSet,
  rerollSlipSet,
  MAX_SLIP_SETS,
  InMemorySlipRepository,
  KeyValueSlipRepository,
  SlipSetConfig,
} from '../slip';

const cfg: SlipSetConfig = {
  count: 6,
  min: 1,
  max: 49,
  allowDuplicates: false,
  sorted: true,
};

describe('slip pure operations', () => {
  it('adds sets up to the cap and reports full thereafter', () => {
    let sets = [] as ReturnType<typeof addSlipSet>['sets'];
    let res = addSlipSet(sets, { numbers: '01-02-03', config: cfg, seed: 1 });
    expect(res.full).toBe(false);
    sets = res.sets;
    expect(sets).toHaveLength(1);
    expect(sets[0].label).toBe('Set 1');
    expect(sets[0].numbers).toBe('01-02-03');
    expect(sets[0].config).toEqual(cfg);

    for (let i = 2; i <= MAX_SLIP_SETS; i++) {
      res = addSlipSet(sets, { numbers: `0${i}`, config: cfg, seed: i });
      sets = res.sets;
    }
    expect(sets).toHaveLength(MAX_SLIP_SETS);
    expect(res.full).toBe(false);

    res = addSlipSet(sets, { numbers: '99-99', config: cfg, seed: 99 });
    expect(res.full).toBe(true);
    expect(res.added).toBeNull();
    expect(res.sets).toHaveLength(MAX_SLIP_SETS);
  });

  it('uses a custom label when provided', () => {
    const { sets } = addSlipSet([], {
      numbers: '01-02',
      label: 'My lucky pick',
      config: cfg,
      seed: 1,
    });
    expect(sets[0].label).toBe('My lucky pick');
  });

  it('replaces a set by id and refreshes updatedAt', () => {
    const { sets } = addSlipSet([], { numbers: '01-02-03', config: cfg, seed: 1 });
    const id = sets[0].id;
    const replaced = replaceSlipSet(sets, id, { numbers: '10-20-30', label: 'edited' });
    expect(replaced[0].numbers).toBe('10-20-30');
    expect(replaced[0].label).toBe('edited');
    expect(replaced[0].updatedAt).toBeGreaterThanOrEqual(sets[0].updatedAt);
    expect(replaced[0].id).toBe(id);
    expect(replaced[0].config).toEqual(cfg);
  });

  it('removes a set by id', () => {
    let { sets } = addSlipSet([], { numbers: '01', config: cfg, seed: 1 });
    const r2 = addSlipSet(sets, { numbers: '02', config: cfg, seed: 2 });
    sets = r2.sets;
    const removed = removeSlipSet(sets, sets[0].id);
    expect(removed).toHaveLength(1);
    expect(removed[0].numbers).toBe('02');
  });

  it('rerolls a set with the same config but a fresh seed', () => {
    const { sets } = addSlipSet([], { numbers: '01-02-03', config: cfg, seed: 1 });
    const id = sets[0].id;
    // Deterministic "random" seed generator for the test.
    let n = 100;
    const rerolled = rerollSlipSet(sets, id, (c) => {
      n += 1;
      // Mirror the engine: a unique draw of `count` in [min,max], sorted.
      const nums = Array.from({ length: c.count }, (_, i) => c.min + i);
      return { numbers: nums.join('-'), seed: n };
    });
    expect(rerolled[0].id).toBe(id);
    expect(rerolled[0].config).toEqual(cfg); // conditions preserved
    expect(rerolled[0].numbers).not.toBe('01-02-03'); // outcome changed
    expect(rerolled[0].seed).toBe(101);
    expect(rerolled[0].updatedAt).toBeGreaterThanOrEqual(sets[0].updatedAt);
  });
});

describe('SlipRepository implementations', () => {
  it('InMemorySlipRepository round-trips', async () => {
    const repo = new InMemorySlipRepository();
    expect(await repo.load()).toEqual([]);
    const { sets } = addSlipSet([], { numbers: '01-02', config: cfg, seed: 1 });
    await repo.saveAll(sets);
    expect(await repo.load()).toEqual(sets);
  });

  it('KeyValueSlipRepository persists JSON and tolerates corruption', async () => {
    const backing = new Map<string, string>();
    const mockStore = {
      getItem: async (k: string) => backing.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        backing.set(k, v);
      },
    };
    const repo = new KeyValueSlipRepository(mockStore);
    expect(await repo.load()).toEqual([]);

    const { sets } = addSlipSet([], { numbers: '03-12-27', config: cfg, seed: 1 });
    await repo.saveAll(sets);
    expect(await repo.load()).toEqual(sets);

    backing.set('randovent.slip.v1', 'not-json');
    expect(await repo.load()).toEqual([]);
  });
});
