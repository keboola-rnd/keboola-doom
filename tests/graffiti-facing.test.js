// Tests that graffiti signs face outward from the wall into open space,
// are placed on the correct side of the wall, and have correct flipU values
// so text is never mirrored.

import { describe, it, expect } from 'vitest';
import { GRAFFITI_DIRS } from '../src/engine/level.js';

// Babylon.js uses a left-handed coordinate system.
// LH R_y(θ) matrix: [cos θ, 0, -sin θ; 0, 1, 0; sin θ, 0, cos θ]
// Applied to default plane normal (0, 0, -1):
//   nx = (-sin θ) * (-1) = +sin θ
//   nz = (cos θ)  * (-1) = -cos θ
// So normal after rotation.y = θ in Babylon LH: (sin θ, 0, -cos θ)
function babylonNormal(rotY) {
    return {
        x: parseFloat(Math.sin(rotY).toFixed(6)),
        z: parseFloat((-Math.cos(rotY)).toFixed(6)),
    };
}

// Expected outward normal for each dr/dc:
// dr=-1 (N): open space at lower Z → normal should point in -Z direction: (nx=0, nz=-1)
// dr=+1 (S): open space at higher Z → normal in +Z:  (nx=0, nz=+1)
// dc=-1 (W): open space at lower X → normal in -X:   (nx=-1, nz=0)
// dc=+1 (E): open space at higher X → normal in +X:  (nx=+1, nz=0)
function expectedNormal(dr, dc) {
    return { x: dc, z: dr };
}

describe('GRAFFITI_DIRS — sign facing and placement', () => {
    it('has exactly 4 directions (N, S, W, E)', () => {
        expect(GRAFFITI_DIRS).toHaveLength(4);
    });

    it.each(GRAFFITI_DIRS)('$label: normal points into open space', ({ dr, dc, rotY, label }) => {
        const normal   = babylonNormal(rotY);
        const expected = expectedNormal(dr, dc);
        expect(normal.x).toBeCloseTo(expected.x, 4);
        expect(normal.z).toBeCloseTo(expected.z, 4);
    });

    it.each(GRAFFITI_DIRS)('$label: sign is placed inside the open space, not inside the wall', ({ dr, dc, label }) => {
        const r = 5, c = 5; // arbitrary wall cell at map[5][5]

        // Wall cell occupies x ∈ [c, c+1], z ∈ [r, r+1]
        // Open-space boundary edges:
        //   N: z = r     (north edge of wall), sign must be at z < r
        //   S: z = r+1   (south edge of wall), sign must be at z > r+1
        //   W: x = c     (west  edge of wall), sign must be at x < c
        //   E: x = c+1   (east  edge of wall), sign must be at x > c+1

        // getPx/getPz from DIRS in level.js (kept in sync with GRAFFITI_DIRS)
        const offsets = {
            N: { signZ: r - 0.02,   wallEdgeZ: r     },
            S: { signZ: r + 1.02,   wallEdgeZ: r + 1 },
            W: { signX: c - 0.02,   wallEdgeX: c     },
            E: { signX: c + 1.02,   wallEdgeX: c + 1 },
        };

        const pos = offsets[label];
        if (dr !== 0) {
            if (dr < 0) expect(pos.signZ).toBeLessThan(pos.wallEdgeZ);   // N: sign is north of wall
            else        expect(pos.signZ).toBeGreaterThan(pos.wallEdgeZ); // S: sign is south of wall
        } else {
            if (dc < 0) expect(pos.signX).toBeLessThan(pos.wallEdgeX);   // W: sign is west of wall
            else        expect(pos.signX).toBeGreaterThan(pos.wallEdgeX); // E: sign is east of wall
        }
    });

    describe('flipU — West must mirror canvas to compensate for reversed UV axis', () => {
        it('North has flipU=false (rotY=0, UV axis correct)', () => {
            const N = GRAFFITI_DIRS.find(d => d.label === 'N');
            expect(N.flipU).toBe(false);
        });

        it('South has flipU=false (rotY=π, UV axis correct)', () => {
            const S = GRAFFITI_DIRS.find(d => d.label === 'S');
            expect(S.flipU).toBe(false);
        });

        it('West has flipU=true (rotY=-π/2 mirrors UV relative to East — must compensate)', () => {
            const W = GRAFFITI_DIRS.find(d => d.label === 'W');
            expect(W.flipU).toBe(true);
        });

        it('East has flipU=false (rotY=+π/2, UV axis correct)', () => {
            const E = GRAFFITI_DIRS.find(d => d.label === 'E');
            expect(E.flipU).toBe(false);
        });

        it('West and East have opposite flipU (mirror rotations → mirror UV → one needs flip)', () => {
            const W = GRAFFITI_DIRS.find(d => d.label === 'W');
            const E = GRAFFITI_DIRS.find(d => d.label === 'E');
            expect(W.flipU).not.toBe(E.flipU);
        });

        it('West and East have opposite rotY signs (±π/2)', () => {
            const W = GRAFFITI_DIRS.find(d => d.label === 'W');
            const E = GRAFFITI_DIRS.find(d => d.label === 'E');
            expect(Math.abs(W.rotY)).toBeCloseTo(Math.PI / 2, 4);
            expect(Math.abs(E.rotY)).toBeCloseTo(Math.PI / 2, 4);
            expect(Math.sign(W.rotY)).not.toBe(Math.sign(E.rotY));
        });
    });
});
