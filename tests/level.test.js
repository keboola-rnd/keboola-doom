// Tests for src/engine/level.js — graffiti data and DIRS flip flags

import { describe, it, expect } from 'vitest';

// We cannot import level.js directly because all its functions are module-scoped
// (not exported) and rely on BABYLON. Instead we re-define GRAFFITI and DIRS by
// reading the source as a string and extracting the relevant arrays with eval in
// an isolated scope. This keeps the test hermetic and avoids running any BABYLON code.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const levelSrc   = readFileSync(path.join(__dirname, '../src/engine/level.js'), 'utf8');

// ── Extract GRAFFITI array ─────────────────────────────────────────────────────

// Pull out the literal array between `const GRAFFITI = [` and the matching `];`
function extractArray(src, varName) {
    const startMarker = `const ${varName} = [`;
    const start = src.indexOf(startMarker);
    if (start === -1) throw new Error(`Could not find ${varName} in source`);
    let depth = 0;
    let i = start + startMarker.length - 1; // position of opening [
    const open = src.indexOf('[', start + startMarker.length - 1);
    i = open;
    for (; i < src.length; i++) {
        if (src[i] === '[') depth++;
        else if (src[i] === ']') {
            depth--;
            if (depth === 0) break;
        }
    }
    const arrayText = src.slice(open, i + 1);
    // eslint-disable-next-line no-eval
    return eval(arrayText);
}

// ── Extract DIRS array inside buildGraffiti ────────────────────────────────────

function extractDirs(src) {
    const marker = 'const DIRS = [';
    const start  = src.indexOf(marker);
    if (start === -1) throw new Error('Could not find DIRS in source');
    let depth = 0;
    let i = src.indexOf('[', start + marker.length - 1);
    for (; i < src.length; i++) {
        if (src[i] === '[') depth++;
        else if (src[i] === ']') {
            depth--;
            if (depth === 0) break;
        }
    }
    const arrText = src.slice(src.indexOf('[', start + marker.length - 1), i + 1);
    // The array contains arrow functions like `(c) => c + 0.5` — we need to eval those.
    // eslint-disable-next-line no-eval
    return eval(arrText);
}

const GRAFFITI = extractArray(levelSrc, 'GRAFFITI');
const DIRS     = extractDirs(levelSrc);

// ─── GRAFFITI tests ───────────────────────────────────────────────────────────

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

describe('GRAFFITI array', () => {
    it('has more than 20 items', () => {
        expect(GRAFFITI.length).toBeGreaterThan(20);
    });

    for (let i = 0; i < GRAFFITI.length; i++) {
        const item = GRAFFITI[i];

        it(`item ${i} has a "lines" property`, () => {
            expect(item).toHaveProperty('lines');
        });

        it(`item ${i} has a "color" property`, () => {
            expect(item).toHaveProperty('color');
        });

        it(`item ${i}.lines is a non-empty array`, () => {
            expect(Array.isArray(item.lines)).toBe(true);
            expect(item.lines.length).toBeGreaterThan(0);
        });

        it(`item ${i}.lines contains only strings`, () => {
            for (const line of item.lines) {
                expect(typeof line).toBe('string');
            }
        });

        it(`item ${i}.color is a valid #rrggbb hex`, () => {
            expect(item.color).toMatch(HEX_COLOR);
        });
    }
});

// ─── DIRS tests ───────────────────────────────────────────────────────────────

describe('buildGraffiti DIRS array', () => {
    it('has exactly 4 entries (N, S, W, E)', () => {
        expect(DIRS.length).toBe(4);
    });

    it('only West (rotY=-π/2) has flipU: true — mirror rotation of East requires canvas flip', () => {
        // North (rotY=0) and South (rotY=π): no UV axis reversal → no flip
        expect(DIRS[0].flipU).toBe(false); // N
        expect(DIRS[1].flipU).toBe(false); // S
        // East (rotY=+π/2): UV axis correct → no flip
        expect(DIRS[3].flipU).toBe(false); // E
        // West (rotY=-π/2): mirror of East rotation → UV axis reversed → needs flip
        expect(DIRS[2].flipU).toBe(true);  // W
    });

    it('DIRS[0] (North) has rotY: 0', () => {
        expect(DIRS[0].rotY).toBe(0);
    });

    it('DIRS[1] (South) has rotY: Math.PI', () => {
        expect(DIRS[1].rotY).toBeCloseTo(Math.PI);
    });

    it('DIRS[2] (West) has rotY: -Math.PI/2', () => {
        expect(DIRS[2].rotY).toBeCloseTo(-Math.PI / 2);
    });

    it('DIRS[3] (East) has rotY: Math.PI/2', () => {
        expect(DIRS[3].rotY).toBeCloseTo(Math.PI / 2);
    });

    it('all DIRS entries have dr and dc fields', () => {
        for (const d of DIRS) {
            expect(d).toHaveProperty('dr');
            expect(d).toHaveProperty('dc');
        }
    });

    it('N and S move in row direction (dc === 0)', () => {
        expect(DIRS[0].dc).toBe(0); // N
        expect(DIRS[1].dc).toBe(0); // S
    });

    it('W and E move in col direction (dr === 0)', () => {
        expect(DIRS[2].dr).toBe(0); // W
        expect(DIRS[3].dr).toBe(0); // E
    });
});
