// Tests for entity logic — Enemy, EntityManager.firePlayerWeapon
// BABYLON is mocked globally via tests/setup/babylon-mock.js

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the map utility module — entities.js imports isWall / hasLineOfSight
vi.mock('../src/engine/map.js', () => ({
    isWall:         () => false,
    hasLineOfSight: () => true,
    LEVEL_1:        { map: [[1,1,1],[1,0,1],[1,1,1]], playerStart: { x:1.5, y:1.5 }, entitySpawns: [] },
}));

import { Enemy, EntityManager } from '../src/game/entities.js';

// ─── Helper — minimal audio stub ─────────────────────────────────────────────

function makeAudio() {
    return { play: vi.fn() };
}

// ─── Helper — minimal player stub ────────────────────────────────────────────

function makePlayer(x = 1.5, y = 1.5, dirX = 1, dirY = 0) {
    return {
        x, y, dirX, dirY,
        takeDamage: vi.fn(),
    };
}

// ─── Enemy.takeDamage ─────────────────────────────────────────────────────────

describe('Enemy.takeDamage', () => {
    let audio;

    beforeEach(() => { audio = makeAudio(); });

    it('reduces health by the given amount', () => {
        const enemy = new Enemy('data_zombie', 5, 5, null);
        const before = enemy.health;
        enemy.takeDamage(10, audio);
        expect(enemy.health).toBe(before - 10);
    });

    it('does not reduce health below 0', () => {
        const enemy = new Enemy('data_zombie', 5, 5, null);
        enemy.takeDamage(9999, audio);
        expect(enemy.health).toBe(0);
    });

    it('plays enemy_death when health reaches 0', () => {
        const enemy = new Enemy('data_zombie', 5, 5, null);
        enemy.takeDamage(9999, audio);
        expect(audio.play).toHaveBeenCalledWith('enemy_death');
    });

    it('does not deal damage to an already dead enemy', () => {
        const enemy = new Enemy('data_zombie', 5, 5, null);
        enemy.takeDamage(9999, audio);  // kill it
        const healthAfterDeath = enemy.health;
        enemy.takeDamage(50, audio);
        expect(enemy.health).toBe(healthAfterDeath);
    });
});

// ─── Enemy.isAlive ────────────────────────────────────────────────────────────

describe('Enemy.isAlive', () => {
    it('returns true for a fresh enemy', () => {
        const enemy = new Enemy('data_zombie', 5, 5, null);
        expect(enemy.isAlive()).toBe(true);
    });

    it('returns false after lethal damage', () => {
        const audio = makeAudio();
        const enemy = new Enemy('data_zombie', 5, 5, null);
        enemy.takeDamage(9999, audio);
        expect(enemy.isAlive()).toBe(false);
    });

    it('returns true when health is reduced but still > 0', () => {
        const audio = makeAudio();
        const enemy = new Enemy('data_zombie', 5, 5, null);
        enemy.takeDamage(1, audio);
        expect(enemy.isAlive()).toBe(true);
    });
});

// ─── EntityManager.firePlayerWeapon with dropAll ─────────────────────────────

describe('EntityManager.firePlayerWeapon — dropAll', () => {
    function makeManager(enemies = []) {
        const mgr = Object.create(EntityManager.prototype);
        mgr._map        = [[1,1,1],[1,0,1],[1,1,1]];
        mgr._audio      = makeAudio();
        mgr._scene      = null;
        mgr.enemies     = enemies;
        mgr.items       = [];
        mgr.projectiles = [];
        mgr._scoreQueue = 0;
        return mgr;
    }

    it('kills all alive enemies when dropAll: true', () => {
        const e1 = new Enemy('data_zombie', 2, 2, null);
        const e2 = new Enemy('pipeline_demon', 3, 3, null);
        const mgr = makeManager([e1, e2]);
        const player = makePlayer();
        const def = { dropAll: true, damage: 99999 };

        mgr.firePlayerWeapon(player, def);

        expect(e1.isAlive()).toBe(false);
        expect(e2.isAlive()).toBe(false);
    });

    it('does not crash when there are no enemies', () => {
        const mgr    = makeManager([]);
        const player = makePlayer();
        const def    = { dropAll: true, damage: 99999 };
        expect(() => mgr.firePlayerWeapon(player, def)).not.toThrow();
    });

    it('accumulates score for every enemy killed by dropAll', () => {
        const e1 = new Enemy('data_zombie', 2, 2, null);    // score: 100
        const e2 = new Enemy('pipeline_demon', 3, 3, null); // score: 200
        const mgr = makeManager([e1, e2]);
        const player = makePlayer();
        const def = { dropAll: true, damage: 99999 };

        mgr.firePlayerWeapon(player, def);
        const score = mgr.collectScore();

        expect(score).toBe(e1.def.score + e2.def.score);
    });

    it('skips already-dead enemies during dropAll sweep', () => {
        const audio = makeAudio();
        const e1 = new Enemy('data_zombie', 2, 2, null);
        e1.takeDamage(9999, audio); // pre-kill e1

        const e2 = new Enemy('pipeline_demon', 3, 3, null);
        const mgr = makeManager([e1, e2]);
        const player = makePlayer();
        const def = { dropAll: true, damage: 99999 };

        mgr.firePlayerWeapon(player, def);

        // e2 should be dead; e1 was already dead and score should not be double-counted
        expect(e2.isAlive()).toBe(false);
        const score = mgr.collectScore();
        expect(score).toBe(e2.def.score); // only e2's score, not e1's again
    });
});

// ─── EntityManager.firePlayerWeapon with melee ───────────────────────────────

describe('EntityManager.firePlayerWeapon — melee', () => {
    function makeManager(enemies = []) {
        const mgr = Object.create(EntityManager.prototype);
        mgr._map        = [[1,1,1],[1,0,1],[1,1,1]];
        mgr._audio      = makeAudio();
        mgr._scene      = null;
        mgr.enemies     = enemies;
        mgr.items       = [];
        mgr.projectiles = [];
        mgr._scoreQueue = 0;
        return mgr;
    }

    it('damages an enemy within melee range facing the player', () => {
        // Enemy is 1 unit ahead of the player in the dirX direction
        const enemy  = new Enemy('data_zombie', 2.5, 1.5, null);
        const mgr    = makeManager([enemy]);
        const player = makePlayer(1.5, 1.5, 1, 0); // facing right (+x)
        const before = enemy.health;
        const def    = { melee: true, meleeRange: 1.5, damage: 25 };

        mgr.firePlayerWeapon(player, def);

        expect(enemy.health).toBeLessThan(before);
    });

    it('does not damage an enemy outside melee range', () => {
        // Enemy is far away (5 units)
        const enemy  = new Enemy('data_zombie', 6.5, 1.5, null);
        const mgr    = makeManager([enemy]);
        const player = makePlayer(1.5, 1.5, 1, 0);
        const before = enemy.health;
        const def    = { melee: true, meleeRange: 1.5, damage: 25 };

        mgr.firePlayerWeapon(player, def);

        expect(enemy.health).toBe(before);
    });
});
