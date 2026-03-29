// Tests for src/config.js — validates all constant definitions

import { describe, it, expect } from 'vitest';
import {
    WEAPON_DEFS,
    ENEMY_TYPES,
    MAX_AMMO,
    STARTING_AMMO,
} from '../src/config.js';

// ─── WEAPON_DEFS ──────────────────────────────────────────────────────────────

describe('WEAPON_DEFS — required fields', () => {
    const REQUIRED = ['id', 'name', 'damage', 'fireRate', 'ammoType', 'ammoPerShot'];

    for (const [key, def] of Object.entries(WEAPON_DEFS)) {
        it(`${key} has all required fields`, () => {
            for (const field of REQUIRED) {
                expect(def, `${key} is missing field "${field}"`).toHaveProperty(field);
            }
        });

        it(`${key}.id matches its key`, () => {
            expect(def.id).toBe(key);
        });
    }
});

describe('WEAPON_DEFS — drop_all_tables special flags', () => {
    it('drop_all_tables exists', () => {
        expect(WEAPON_DEFS).toHaveProperty('drop_all_tables');
    });

    it('drop_all_tables has dropAll: true', () => {
        expect(WEAPON_DEFS.drop_all_tables.dropAll).toBe(true);
    });
});

describe('WEAPON_DEFS — ammo types consistency', () => {
    for (const [key, def] of Object.entries(WEAPON_DEFS)) {
        if (def.ammoType !== null) {
            it(`${key}.ammoType "${def.ammoType}" exists in MAX_AMMO`, () => {
                expect(MAX_AMMO).toHaveProperty(def.ammoType);
            });
        }
    }
});

// ─── STARTING_AMMO ≤ MAX_AMMO ─────────────────────────────────────────────────

describe('STARTING_AMMO ≤ MAX_AMMO for every ammo type', () => {
    for (const [ammoType, maxVal] of Object.entries(MAX_AMMO)) {
        it(`${ammoType}: STARTING_AMMO (${STARTING_AMMO[ammoType] ?? 0}) ≤ MAX_AMMO (${maxVal})`, () => {
            const start = STARTING_AMMO[ammoType] ?? 0;
            expect(start).toBeLessThanOrEqual(maxVal);
        });
    }
});

// ─── ENEMY_TYPES ──────────────────────────────────────────────────────────────

describe('ENEMY_TYPES — required fields', () => {
    const REQUIRED = ['id', 'health', 'speed', 'damage', 'attackRange', 'sightRange', 'score'];

    for (const [key, def] of Object.entries(ENEMY_TYPES)) {
        it(`${key} has all required fields`, () => {
            for (const field of REQUIRED) {
                expect(def, `${key} is missing field "${field}"`).toHaveProperty(field);
            }
        });

        it(`${key}.id matches its key`, () => {
            expect(def.id).toBe(key);
        });

        it(`${key}.health > 0`, () => {
            expect(def.health).toBeGreaterThan(0);
        });

        it(`${key}.score > 0`, () => {
            expect(def.score).toBeGreaterThan(0);
        });
    }
});
