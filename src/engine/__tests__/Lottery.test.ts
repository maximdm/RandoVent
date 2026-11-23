import { describe, it, expect } from 'vitest';
import { generateLottery, LotteryError, parseNumbers, drawWinning, countMatches, checkMyNumbers } from '../index';

describe('generateLottery', () => {
  it('returns a single hyphen-joined string when sets is 1', () => {
    const out = generateLottery({ count: 6, min: 1, max: 49, seed: 12345 });
    expect(typeof out).toBe('string');
    const parts = (out as string).split('-');
    expect(parts).toHaveLength(6);
  });

  it('zero-pads to two digits for max <= 99', () => {
    const out = generateLottery({ count: 6, min: 1, max: 49, seed: 12345 }) as string;
    expect(out).toMatch(/^\d{2}(-\d{2}){5}$/);
  });

  it('zero-pads to three digits for max >= 100', () => {
    const out = generateLottery({ count: 4, min: 1, max: 200, seed: 1 }) as string;
    expect(out).toMatch(/^\d{3}(-\d{3}){3}$/);
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateLottery({ count: 6, min: 1, max: 49, seed: 999 });
    const b = generateLottery({ count: 6, min: 1, max: 49, seed: 999 });
    expect(a).toBe(b);
  });

  it('produces unique numbers when allowDuplicates is false', () => {
    const out = generateLottery({ count: 6, min: 1, max: 49, seed: 5 }) as string;
    const nums = out.split('-');
    expect(new Set(nums).size).toBe(nums.length);
  });

  it('returns an array of strings when sets > 1', () => {
    const out = generateLottery({ count: 5, min: 1, max: 90, sets: 3, seed: 12345 });
    expect(Array.isArray(out)).toBe(true);
    expect((out as string[])).toHaveLength(3);
  });

  it('throws when count exceeds the unique range', () => {
    expect(() => generateLottery({ count: 50, min: 1, max: 49 })).toThrow(LotteryError);
  });

  it('throws on invalid range', () => {
    expect(() => generateLottery({ count: 1, min: 10, max: 1 })).toThrow(LotteryError);
  });
});

describe('parseNumbers', () => {
  it('parses a hyphen-joined padded string', () => {
    expect(parseNumbers('03-12-27-31-45-49')).toEqual([3, 12, 27, 31, 45, 49]);
  });

  it('ignores stray spaces and non-numeric tokens', () => {
    expect(parseNumbers(' 3 - 12 - x ')).toEqual([3, 12]);
  });
});

describe('drawWinning / countMatches / checkMyNumbers', () => {
  const cfg = { count: 6, min: 1, max: 49, allowDuplicates: false, sorted: true };

  it('drawWinning respects the config and is seeded-deterministic', () => {
    const a = drawWinning(cfg, 777);
    const b = drawWinning(cfg, 777);
    expect(a).toBe(b);
    expect(a.split('-')).toHaveLength(6);
  });

  it('countMatches counts multiset overlap', () => {
    // "03-12-27" vs "12-27-40": 12 and 27 overlap => 2
    expect(countMatches('03-12-27', '12-27-40')).toBe(2);
    expect(countMatches('03-12-27', '01-02-03')).toBe(1);
    expect(countMatches('03-12-27', '99-98-97')).toBe(0);
  });

  it('countMatches treats duplicates as a multiset', () => {
    // mine has two 5s, winning has one 5 => 1 match
    expect(countMatches('05-05-09', '05-08-09')).toBe(2);
  });

  it('checkMyNumbers reports matches against a drawn winning line', () => {
    const res = checkMyNumbers('03-12-27-31-45-49', cfg, 4242);
    expect(res.total).toBe(6);
    expect(res.matches).toBeGreaterThanOrEqual(0);
    expect(res.matches).toBeLessThanOrEqual(6);
    // The winning line itself is a valid 6/49 draw.
    expect(res.winning.split('-')).toHaveLength(6);
  });
});
