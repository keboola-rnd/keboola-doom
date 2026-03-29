// Level map data and utilities

// Wall types: 0=empty, 1=stone, 2=metal(blue), 3=brick, 4=tech(keboola)
// Layout: 24x24 grid with three connected sections
const RAW_MAP = [
//  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 1
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 2
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 1], // 3
    [1, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 1], // 4
    [1, 0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 0, 0, 0, 0, 1], // 5
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 1], // 6
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 7
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 8
    [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1], // 9  wall + 3 gaps
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 10
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 11
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1], // 12
    [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1], // 13
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1], // 14
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 15
    [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1], // 16 wall + 4 gaps
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 17
    [1, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 1], // 18
    [1, 0, 0, 4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4, 0, 0, 1], // 19
    [1, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 1], // 20
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 21
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 22
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 23
];

// Entity spawn data for level 1
const ENTITY_SPAWNS = [
    // Section 1: starting area — weaker enemies + gear
    // minDifficulty: 0=always, 1=medium+, 2=hard only
    { type: 'item',  kind: 'weapon_shotgun',  x: 8.5,  y: 2.5 },
    { type: 'item',  kind: 'ammo_bullets',    x: 1.5,  y: 7.5 },
    { type: 'item',  kind: 'health_small',    x: 7.5,  y: 7.5 },
    { type: 'enemy', kind: 'data_zombie',     x: 8.5,  y: 5.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'data_zombie',     x: 20.5, y: 4.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'flow_specter',    x: 12.5, y: 4.5,  minDifficulty: 1 },
    { type: 'enemy', kind: 'data_zombie',     x: 6.5,  y: 7.5,  minDifficulty: 2 },
    { type: 'item',  kind: 'ammo_bullets',    x: 21.5, y: 7.5 },

    // Section 2: middle area — medium enemies
    { type: 'enemy', kind: 'pipeline_demon',  x: 10.5, y: 11.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'sql_mutant',      x: 7.5,  y: 12.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'config_monster',  x: 11.5, y: 14.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'flow_specter',    x: 17.5, y: 11.5, minDifficulty: 2 },
    { type: 'item',  kind: 'ammo_shells',     x: 8.5,  y: 10.5 },
    { type: 'item',  kind: 'health_small',    x: 13.5, y: 11.5 },
    { type: 'item',  kind: 'armor',           x: 20.5, y: 13.5 },
    { type: 'item',  kind: 'weapon_launcher', x: 5.5,  y: 10.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 17.5, y: 14.5 },

    // Section 3: boss area
    { type: 'enemy', kind: 'config_monster',  x: 6.5,  y: 18.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'server_boss',     x: 11.5, y: 21.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'pipeline_demon',  x: 11.5, y: 18.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'sql_mutant',      x: 8.5,  y: 20.5, minDifficulty: 2 },
    { type: 'item',  kind: 'health_large',    x: 9.5,  y: 21.5 },
    { type: 'item',  kind: 'health_large',    x: 13.5, y: 21.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 5.5,  y: 17.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 18.5, y: 17.5 },
    { type: 'item',  kind: 'weapon_bfd',      x: 1.5,  y: 21.5 },
];

export const LEVEL_1 = {
    map: RAW_MAP,
    entitySpawns: ENTITY_SPAWNS,
    playerStart: { x: 2.5, y: 2.5, dirX: 0.83, dirY: 0.55, planeX: 0, planeY: 0.66 },
};

export function isWall(map, x, y) {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (my < 0 || my >= map.length || mx < 0 || mx >= map[0].length) return true;
    return map[my][mx] > 0;
}

// Simple line-of-sight check using DDA
export function hasLineOfSight(map, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.01) return true;

    const steps = Math.ceil(dist * 4);
    const sx = dx / steps;
    const sy = dy / steps;

    for (let i = 1; i < steps; i++) {
        const cx = x1 + sx * i;
        const cy = y1 + sy * i;
        if (isWall(map, cx, cy)) return false;
    }
    return true;
}
