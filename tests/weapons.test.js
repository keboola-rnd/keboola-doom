// Tests for src/game/weapons.js — WEAPON_ORDER, keyMap

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const weaponsSrc  = readFileSync(path.join(__dirname, '../src/game/weapons.js'), 'utf8');

// Extract WEAPON_ORDER literal array from source
function extractWeaponOrder(src) {
    const marker = 'const WEAPON_ORDER = [';
    const start  = src.indexOf(marker);
    if (start === -1) throw new Error('Could not find WEAPON_ORDER');
    const arrStart = src.indexOf('[', start + marker.length - 1);
    const arrEnd   = src.indexOf(']', arrStart);
    // eslint-disable-next-line no-eval
    return eval(src.slice(arrStart, arrEnd + 1));
}

// Extract keyMap literal array from the update() method
function extractKeyMap(src) {
    const marker = 'const keyMap = [';
    const start  = src.indexOf(marker);
    if (start === -1) throw new Error('Could not find keyMap');
    const arrStart = src.indexOf('[', start + marker.length - 1);
    const arrEnd   = src.indexOf(']', arrStart);
    // eslint-disable-next-line no-eval
    return eval(src.slice(arrStart, arrEnd + 1));
}

const WEAPON_ORDER = extractWeaponOrder(weaponsSrc);
const KEY_MAP      = extractKeyMap(weaponsSrc);

// ─── WEAPON_ORDER tests ───────────────────────────────────────────────────────

describe('WEAPON_ORDER', () => {
    it('contains "drop_all_tables"', () => {
        expect(WEAPON_ORDER).toContain('drop_all_tables');
    });

    it('has exactly 7 items', () => {
        expect(WEAPON_ORDER).toHaveLength(7);
    });

    it('first weapon is "fist"', () => {
        expect(WEAPON_ORDER[0]).toBe('fist');
    });

    it('last weapon is "drop_all_tables"', () => {
        expect(WEAPON_ORDER[WEAPON_ORDER.length - 1]).toBe('drop_all_tables');
    });

    it('contains all expected weapons', () => {
        const expected = ['fist', 'sql_gun', 'data_shotgun', 'pipeline_launcher', 'bfd_9000', 'kai_assistant', 'drop_all_tables'];
        for (const w of expected) {
            expect(WEAPON_ORDER).toContain(w);
        }
    });

    it('has no duplicate entries', () => {
        const unique = new Set(WEAPON_ORDER);
        expect(unique.size).toBe(WEAPON_ORDER.length);
    });
});

// ─── keyMap tests ─────────────────────────────────────────────────────────────

describe('keyMap in WeaponSystem.update()', () => {
    it('has exactly 7 items (one per weapon slot)', () => {
        expect(KEY_MAP).toHaveLength(7);
    });

    it('maps Digit1 through Digit7', () => {
        for (let i = 1; i <= 7; i++) {
            expect(KEY_MAP).toContain(`Digit${i}`);
        }
    });

    it('first entry is Digit1', () => {
        expect(KEY_MAP[0]).toBe('Digit1');
    });

    it('last entry is Digit7', () => {
        expect(KEY_MAP[KEY_MAP.length - 1]).toBe('Digit7');
    });

    it('keyMap and WEAPON_ORDER have the same length (1:1 mapping)', () => {
        expect(KEY_MAP.length).toBe(WEAPON_ORDER.length);
    });
});
