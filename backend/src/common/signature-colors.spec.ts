import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  SIGNATURE_COLOR_PALETTE,
  nextSignatureColor,
  fallbackSignatureColor,
  hslToHex,
} from './signature-colors';

describe('signature colors', () => {
  it('palette contains 16 unique hex colors', () => {
    expect(SIGNATURE_COLOR_PALETTE).toHaveLength(16);
    const lower = SIGNATURE_COLOR_PALETTE.map((c) => c.toLowerCase());
    expect(new Set(lower).size).toBe(16);
    for (const color of lower) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('assigns palette colors in order as members join', () => {
    expect(nextSignatureColor([])).toBe(SIGNATURE_COLOR_PALETTE[0]);
    expect(nextSignatureColor([SIGNATURE_COLOR_PALETTE[0]])).toBe(SIGNATURE_COLOR_PALETTE[1]);
    expect(nextSignatureColor([SIGNATURE_COLOR_PALETTE[0], SIGNATURE_COLOR_PALETTE[1]])).toBe(
      SIGNATURE_COLOR_PALETTE[2],
    );
  });

  it('ignores null/empty colors and is case-insensitive', () => {
    expect(nextSignatureColor([null, undefined, ''])).toBe(SIGNATURE_COLOR_PALETTE[0]);
    expect(nextSignatureColor([SIGNATURE_COLOR_PALETTE[0].toUpperCase()])).toBe(
      SIGNATURE_COLOR_PALETTE[1],
    );
  });

  it('reuses a freed color instead of skipping it', () => {
    const taken = [SIGNATURE_COLOR_PALETTE[1], SIGNATURE_COLOR_PALETTE[2]];
    expect(nextSignatureColor(taken)).toBe(SIGNATURE_COLOR_PALETTE[0]);
  });

  it('generates unique golden-angle colors beyond the palette', () => {
    const taken = [...SIGNATURE_COLOR_PALETTE];
    const extra1 = nextSignatureColor(taken);
    const extra2 = nextSignatureColor([...taken, extra1]);
    expect(extra1).toMatch(/^#[0-9a-f]{6}$/);
    expect(extra2).toMatch(/^#[0-9a-f]{6}$/);
    expect(extra1.toLowerCase()).not.toBe(extra2.toLowerCase());
  });

  it('fallbackSignatureColor is deterministic per seed and a valid hex', () => {
    expect(fallbackSignatureColor('user-123')).toBe(fallbackSignatureColor('user-123'));
    expect(fallbackSignatureColor('user-123')).toMatch(/^#[0-9a-f]{6}$/);
    expect(fallbackSignatureColor('user-123')).not.toBe(fallbackSignatureColor('user-456'));
  });

  it('hslToHex produces expected values for known HSL inputs', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });
});
