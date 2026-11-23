import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme } from './theme';

describe('theme tokens', () => {
  it('defines a light and a dark theme with distinct surfaces', () => {
    expect(lightTheme.bg).not.toBe(darkTheme.bg);
    expect(lightTheme.surface).not.toBe(darkTheme.surface);
    expect(darkTheme.bg).toBe('#0b1120');
    expect(lightTheme.bg).toBe('#eef2f7');
  });

  it('exposes the full token set on both themes', () => {
    const keys = Object.keys(lightTheme);
    expect(keys.length).toBeGreaterThan(20);
    for (const k of keys) {
      const val = (darkTheme as unknown as Record<string, unknown>)[k];
      expect(typeof val).toBe('string');
    }
  });
});
