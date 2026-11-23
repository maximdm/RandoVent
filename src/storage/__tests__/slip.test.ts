import { describe, it, expect } from 'vitest';
import {
  createSlip,
  renameSlip,
  removeSlip,
  addSetToSlip,
  replaceSetInSlip,
  removeSetFromSlip,
  rerollSetInSlip,
  MAX_SLIPS,
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

const entry = (numbers: string, seed: number) => ({ numbers, config: cfg, seed });

describe('slip collection operations', () => {
  it('creates named slips up to the cap and reports full', () => {
    let slips = [] as ReturnType<typeof createSlip>['slips'];
    let res = createSlip(slips, 'Friday');
    expect(res.full).toBe(false);
    slips = res.slips;
    expect(slips[0].name).toBe('Friday');
    expect(slips[0].sets).toEqual([]);

    for (let i = 2; i <= MAX_SLIPS; i++) {
      res = createSlip(slips, `S${i}`);
      slips = res.slips;
    }
    expect(slips).toHaveLength(MAX_SLIPS);
    res = createSlip(slips, 'Overflow');
    expect(res.full).toBe(true);
    expect(res.created).toBeNull();
  });

  it('uses a default name when none provided', () => {
    const { slips } = createSlip([]);
    expect(slips[0].name).toBe('Slip 1');
  });

  it('renames and removes a slip', () => {
    let { slips } = createSlip([], 'Old');
    slips = renameSlip(slips, slips[0].id, 'New');
    expect(slips[0].name).toBe('New');
    slips = removeSlip(slips, slips[0].id);
    expect(slips).toHaveLength(0);
  });

  it('adds sets to a slip up to its per-slip cap', () => {
    let { slips } = createSlip([]);
    const id = slips[0].id;
    let r = addSetToSlip(slips, id, entry('01-02-03', 1));
    expect(r.full).toBe(false);
    slips = r.slips;
    expect(slips[0].sets).toHaveLength(1);

    for (let i = 2; i <= MAX_SLIP_SETS; i++) {
      r = addSetToSlip(slips, id, entry(`0${i}`, i));
      slips = r.slips;
    }
    expect(slips[0].sets).toHaveLength(MAX_SLIP_SETS);
    r = addSetToSlip(slips, id, entry('99-99', 99));
    expect(r.full).toBe(true);
    expect(r.slips[0].sets).toHaveLength(MAX_SLIP_SETS);
  });

  it('replaces and removes a set within a slip', () => {
    let { slips } = createSlip([]);
    const id = slips[0].id;
    slips = addSetToSlip(slips, id, entry('01-02-03', 1)).slips;
    const setId = slips[0].sets[0].id;
    slips = replaceSetInSlip(slips, id, setId, { numbers: '10-20-30', label: 'edited' });
    expect(slips[0].sets[0].numbers).toBe('10-20-30');
    expect(slips[0].sets[0].label).toBe('edited');
    expect(slips[0].sets[0].config).toEqual(cfg);

    slips = removeSetFromSlip(slips, id, setId);
    expect(slips[0].sets).toHaveLength(0);
  });

  it('rerolls a set with the same config but a fresh seed', () => {
    let { slips } = createSlip([]);
    const id = slips[0].id;
    slips = addSetToSlip(slips, id, entry('01-02-03', 1)).slips;
    const setId = slips[0].sets[0].id;
    let n = 100;
    slips = rerollSetInSlip(slips, id, setId, (c) => {
      n += 1;
      const nums = Array.from({ length: c.count }, (_, i) => c.min + i);
      return { numbers: nums.join('-'), seed: n };
    });
    expect(slips[0].sets[0].config).toEqual(cfg); // conditions preserved
    expect(slips[0].sets[0].numbers).not.toBe('01-02-03'); // outcome changed
    expect(slips[0].sets[0].seed).toBe(101);
  });
});

describe('SlipRepository implementations', () => {
  it('InMemorySlipRepository round-trips', async () => {
    const repo = new InMemorySlipRepository();
    expect(await repo.load()).toEqual([]);
    const { slips } = createSlip([], 'Keep');
    await repo.saveAll(slips);
    expect(await repo.load()).toEqual(slips);
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

    const { slips } = createSlip([], 'Keep');
    await repo.saveAll(slips);
    expect(await repo.load()).toEqual(slips);

    backing.set('randovent.slips.v1', 'not-json');
    expect(await repo.load()).toEqual([]);
  });
});
