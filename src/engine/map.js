// Level map data and utilities

// Wall types: 0=empty, 1=stone, 2=metal(blue), 3=brick, 4=tech(keboola)

// ─── L0: Raw Data Layer ───────────────────────────────────────────────────────
// Chaotic warehouse — messy layout, lots of nooks, interconnected paths
const MAP_L0 = [
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
    [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1], // 9
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 10
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 11
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1], // 12
    [1, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1], // 13
    [1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 1], // 14
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 15
    [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1], // 16
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 17
    [1, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 1], // 18
    [1, 0, 0, 4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4, 0, 0, 1], // 19
    [1, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 1], // 20
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 21
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 22
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 23
];

const SPAWNS_L0 = [
    // Section 1: starting area
    { type: 'item',  kind: 'weapon_shotgun',  x: 8.5,  y: 2.5 },
    { type: 'item',  kind: 'ammo_bullets',    x: 1.5,  y: 7.5 },
    { type: 'item',  kind: 'health_small',    x: 7.5,  y: 7.5 },
    { type: 'enemy', kind: 'data_zombie',     x: 8.5,  y: 5.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'data_zombie',     x: 20.5, y: 4.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'flow_specter',    x: 12.5, y: 4.5,  minDifficulty: 1 },
    { type: 'enemy', kind: 'data_zombie',     x: 6.5,  y: 7.5,  minDifficulty: 2 },
    { type: 'item',  kind: 'ammo_bullets',    x: 21.5, y: 7.5 },
    // Section 2: middle
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
    { type: 'enemy', kind: 'extractor_boss',  x: 11.5, y: 21.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'pipeline_demon',  x: 11.5, y: 18.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'sql_mutant',      x: 8.5,  y: 20.5, minDifficulty: 2 },
    { type: 'item',  kind: 'health_large',    x: 9.5,  y: 21.5 },
    { type: 'item',  kind: 'health_large',    x: 13.5, y: 21.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 5.5,  y: 17.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 18.5, y: 17.5 },
    { type: 'item',  kind: 'weapon_kai',      x: 1.5,  y: 21.5 },
    { type: 'item',  kind: 'weapon_chainsaw', x: 5.5,  y: 2.5 },
    { type: 'item',  kind: 'weapon_super_shotgun', x: 15.5, y: 10.5 },
    { type: 'item',  kind: 'weapon_chaingun', x: 16.5, y: 17.5 },
    { type: 'item',  kind: 'ammo_energy',     x: 8.5,  y: 17.5 },
    { type: 'item',  kind: 'weapon_chaingun', x: 4.5,  y: 4.5 },
    { type: 'item',  kind: 'armor',           x: 14.5, y: 2.5 },
    { type: 'item',  kind: 'armor',           x: 4.5,  y: 11.5 },
    { type: 'item',  kind: 'armor',           x: 15.5, y: 17.5 },
];

// ─── L1: Trigger Flow ─────────────────────────────────────────────────────────
// Symmetric staging zones separated by walls — clean corridors, filter rooms
const MAP_L1 = [
//  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 0
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 1
    [2, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 2, 2, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 2], // 2
    [2, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2], // 3
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 4
    [2, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 2], // 5
    [2, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 2, 2, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 2], // 6
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 7
    [2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2], // 8
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 9
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 10
    [2, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 2], // 11
    [2, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2], // 12
    [2, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2], // 13
    [2, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 2], // 14
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 15
    [2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2, 2], // 16
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 17
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 18
    [2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2], // 19
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 20
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 21
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 22
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 23
];

const SPAWNS_L1 = [
    // Starting area (top)
    { type: 'item',  kind: 'ammo_bullets',    x: 2.5,  y: 2.5 },
    { type: 'item',  kind: 'health_small',    x: 21.5, y: 2.5 },
    { type: 'enemy', kind: 'data_zombie',     x: 4.5,  y: 3.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'data_zombie',     x: 19.5, y: 3.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'null_pointer',    x: 9.5,  y: 2.5,  minDifficulty: 1 },
    { type: 'enemy', kind: 'null_pointer',    x: 14.5, y: 2.5,  minDifficulty: 1 },
    // Middle corridor
    { type: 'item',  kind: 'weapon_shotgun',  x: 11.5, y: 9.5 },
    { type: 'item',  kind: 'ammo_shells',     x: 5.5,  y: 10.5 },
    { type: 'item',  kind: 'ammo_shells',     x: 17.5, y: 10.5 },
    { type: 'enemy', kind: 'pipeline_demon',  x: 8.5,  y: 10.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'pipeline_demon',  x: 15.5, y: 10.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'config_monster',  x: 11.5, y: 12.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'sql_mutant',      x: 6.5,  y: 13.5, minDifficulty: 2 },
    { type: 'enemy', kind: 'sql_mutant',      x: 17.5, y: 13.5, minDifficulty: 2 },
    { type: 'item',  kind: 'health_small',    x: 11.5, y: 15.5 },
    { type: 'item',  kind: 'armor',           x: 1.5,  y: 12.5 },
    // Boss area (bottom)
    { type: 'item',  kind: 'weapon_launcher', x: 6.5,  y: 17.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 16.5, y: 17.5 },
    { type: 'item',  kind: 'health_large',    x: 3.5,  y: 20.5 },
    { type: 'item',  kind: 'health_large',    x: 20.5, y: 20.5 },
    { type: 'enemy', kind: 'config_monster',  x: 5.5,  y: 18.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'config_monster',  x: 18.5, y: 18.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'trigger_boss',    x: 11.5, y: 21.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'flow_specter',    x: 8.5,  y: 21.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'flow_specter',    x: 14.5, y: 21.5, minDifficulty: 1 },
    { type: 'item',  kind: 'weapon_kai',      x: 22.5, y: 20.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 1.5,  y: 20.5 },
    { type: 'item',  kind: 'weapon_super_shotgun', x: 3.5,  y: 10.5 },
    { type: 'item',  kind: 'weapon_plasma',   x: 1.5,  y: 20.5 },
    { type: 'item',  kind: 'ammo_energy',     x: 19.5, y: 20.5 },
];

// ─── L2: Native Types ─────────────────────────────────────────────────────────
// Type cast arena — compact open room, pure type-matching gameplay
const MAP_L2 = [
//  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // 0
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 1
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 2
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 3
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 4
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 5
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 6
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 7
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 8
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 9
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 10
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 11
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 12
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 13
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 14
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // 15
];

const SPAWNS_L2 = [];

// ─── L3: Data Mart Layer ──────────────────────────────────────────────────────
// Star schema hub — central hub room, 4 dimension corridors radiating out
const MAP_L3 = [
//  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], // 0
    [3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3], // 1
    [3, 0, 3, 0, 3, 0, 3, 3, 0, 3, 3, 3, 3, 3, 3, 0, 3, 3, 0, 3, 0, 3, 0, 3], // 2
    [3, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 3], // 3
    [3, 0, 3, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0, 3, 0, 3], // 4
    [3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3], // 5
    [3, 3, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 3, 3], // 6
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 7
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 8
    [3, 3, 3, 0, 3, 3, 3, 3, 0, 3, 3, 0, 0, 3, 3, 0, 3, 3, 3, 3, 0, 3, 3, 3], // 9
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 10
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 11
    [3, 3, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 3, 0, 3, 3, 3, 0, 3, 3, 3, 3, 3], // 12
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 13
    [3, 0, 3, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0, 3, 0, 3], // 14
    [3, 0, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 3, 0, 3], // 15
    [3, 0, 3, 0, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 3, 0, 3, 0, 3], // 16
    [3, 0, 3, 3, 3, 0, 3, 3, 0, 3, 3, 3, 3, 3, 3, 0, 3, 3, 0, 3, 3, 3, 0, 3], // 17
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 18
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 19
    [3, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 3], // 20
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 21
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3], // 22
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], // 23
];

const SPAWNS_L3 = [
    // Dimension wings (top area)
    { type: 'item',  kind: 'ammo_bullets',    x: 2.5,  y: 1.5 },
    { type: 'item',  kind: 'ammo_bullets',    x: 20.5, y: 1.5 },
    { type: 'item',  kind: 'health_small',    x: 11.5, y: 1.5 },
    { type: 'enemy', kind: 'data_zombie',     x: 4.5,  y: 3.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'data_zombie',     x: 19.5, y: 3.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'flow_specter',    x: 11.5, y: 4.5,  minDifficulty: 1 },
    // Mid hub corridors
    { type: 'item',  kind: 'weapon_shotgun',  x: 2.5,  y: 8.5 },
    { type: 'item',  kind: 'ammo_shells',     x: 21.5, y: 8.5 },
    { type: 'item',  kind: 'armor',           x: 11.5, y: 10.5 },
    { type: 'enemy', kind: 'pipeline_demon',  x: 5.5,  y: 8.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'pipeline_demon',  x: 18.5, y: 8.5,  minDifficulty: 0 },
    { type: 'enemy', kind: 'config_monster',  x: 2.5,  y: 11.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'config_monster',  x: 21.5, y: 11.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'sql_mutant',      x: 11.5, y: 8.5,  minDifficulty: 1 },
    // Lower dimension wings
    { type: 'item',  kind: 'weapon_launcher', x: 5.5,  y: 14.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 18.5, y: 14.5 },
    { type: 'item',  kind: 'health_small',    x: 11.5, y: 15.5 },
    { type: 'enemy', kind: 'config_monster',  x: 4.5,  y: 15.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'config_monster',  x: 19.5, y: 15.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'sql_mutant',      x: 11.5, y: 13.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'flow_specter',    x: 5.5,  y: 11.5, minDifficulty: 2 },
    // Boss area (bottom)
    { type: 'item',  kind: 'health_large',    x: 4.5,  y: 19.5 },
    { type: 'item',  kind: 'health_large',    x: 19.5, y: 19.5 },
    { type: 'item',  kind: 'weapon_kai',      x: 2.5,  y: 21.5 },
    { type: 'item',  kind: 'ammo_rockets',    x: 21.5, y: 21.5 },
    { type: 'item',  kind: 'weapon_chaingun', x: 20.5, y: 8.5 },
    { type: 'item',  kind: 'weapon_plasma',   x: 2.5,  y: 19.5 },
    { type: 'item',  kind: 'ammo_energy',     x: 21.5, y: 19.5 },
    { type: 'enemy', kind: 'sql_mutant',      x: 6.5,  y: 19.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'sql_mutant',      x: 17.5, y: 19.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'aggregator_boss', x: 11.5, y: 21.5, minDifficulty: 0 },
    { type: 'enemy', kind: 'flow_specter',    x: 8.5,  y: 22.5, minDifficulty: 1 },
    { type: 'enemy', kind: 'flow_specter',    x: 15.5, y: 22.5, minDifficulty: 1 },
];

// ─── L4: Consumption / BI Layer ───────────────────────────────────────────────
// Executive boardroom — large open spaces, Keboola tech walls everywhere
const MAP_L4 = [
//  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // 0
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 1
    [4, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 4], // 2
    [4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4], // 3
    [4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4], // 4
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 5
    [4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4], // 6
    [4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4], // 7
    [4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4], // 8
    [4, 4, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 4, 4], // 9
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 10
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 11
    [4, 4, 0, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 0, 4, 4], // 12
    [4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4], // 13
    [4, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 4, 0, 0, 0, 0, 0, 0, 4], // 14
    [4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 4], // 15
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 16
    [4, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4], // 17
    [4, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0, 0, 4], // 18
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 19
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 20
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 21
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4], // 22
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], // 23
];

const SPAWNS_L4 = [
    // Items scattered around the boardroom
    { type: 'item',  kind: 'health_small',    x: 5.5,  y: 1.5 },
    { type: 'item',  kind: 'health_small',    x: 18.5, y: 1.5 },
    { type: 'item',  kind: 'health_small',    x: 11.5, y: 9.5 },
    { type: 'item',  kind: 'health_large',    x: 2.5,  y: 11.5 },
    { type: 'item',  kind: 'health_large',    x: 21.5, y: 11.5 },
    { type: 'item',  kind: 'armor',           x: 11.5, y: 16.5 },
    { type: 'item',  kind: 'health_large',    x: 4.5,  y: 20.5 },
    { type: 'item',  kind: 'health_large',    x: 19.5, y: 20.5 },
    // Boss
    { type: 'enemy', kind: 'stakeholder_boss', x: 11.5, y: 21.5, minDifficulty: 0 },
];

// ─── Per-level graffiti ───────────────────────────────────────────────────────

const GRAFFITI_L0 = [
    { lines: ['UNTRUSTED', 'SOURCE'],              color: '#ff6600' },
    { lines: ['NO SCHEMA', 'DETECTED'],            color: '#ff4400' },
    { lines: ['RAW DATA', '= CHAOS'],              color: '#ffaa00' },
    { lines: ['PARSE AT', 'OWN RISK'],             color: '#ff8800' },
    { lines: ['INGEST', 'FIRST', 'THINK LATER'],   color: '#ffcc00' },
    { lines: ['DUPLICATE', 'RECORDS', 'INSIDE'],   color: '#ff5500' },
    { lines: ['EXTRACTION', 'IN PROGRESS'],        color: '#ff3300' },
    { lines: ['API RATE', 'LIMITED (rip)'],        color: '#ffaa44' },
    { lines: ['9TB', 'incoming'],                  color: '#ff2200' },
];

const GRAFFITI_L1 = [
    { lines: ['DEDUPLICATED', '(maybe)'],          color: '#ffff00' },
    { lines: ['TYPE CAST', 'OR DIE'],              color: '#ffdd00' },
    { lines: ['NULL =', 'UNKNOWN'],                color: '#ffcc00' },
    { lines: ['VALIDATED:', 'FALSE'],              color: '#ff8800' },
    { lines: ['DEDUP KEY:', 'undefined'],          color: '#ffaa00' },
    { lines: ['CASTING', 'VARCHAR TO INT',  '?'], color: '#ff6600' },
    { lines: ['STAGING', 'COMPLETE?', 'NOPE'],    color: '#ffff44' },
    { lines: ['ROW INVALID', 'AT LINE 1'],        color: '#ffdd44' },
];

const GRAFFITI_L2 = [
    { lines: ['SQL IS ART'],                       color: '#44ff44' },
    { lines: ['dbt model', '#47'],                 color: '#44ffaa' },
    { lines: ['WINDOW FUNC', '= DARK MAGIC'],      color: '#00ff88' },
    { lines: ['CTE goes', 'brrrrr'],               color: '#44ffcc' },
    { lines: ['EXPLAIN PLAN', 'FULL SCAN'],        color: '#00ffcc' },
    { lines: ['WITH cte AS', '( SELECT *...)'],    color: '#44ff88' },
    { lines: ['N+1 QUERY', 'DETECTED'],            color: '#88ff44' },
    { lines: ['OPTIMIZER', 'NOT IMPRESSED'],       color: '#00ff66' },
];

const GRAFFITI_L3 = [
    { lines: ['STAR SCHEMA', 'OR SNOWFLAKE?'],     color: '#4488ff' },
    { lines: ['FACT TABLE', 'IS SACRED'],          color: '#44aaff' },
    { lines: ['ONE MART', 'TO RULE THEM ALL'],     color: '#4466ff' },
    { lines: ['DIM_DATE', 'STILL MISSING'],        color: '#55aaff' },
    { lines: ['SLOWLY', 'CHANGING', 'DIMENSION'],  color: '#4499ff' },
    { lines: ['GRAIN:', 'undefined'],              color: '#4477ff' },
    { lines: ['AGGREGATE', 'EVERYTHING'],          color: '#44bbff' },
    { lines: ['ROLLUP?', 'CUBE?', 'GROUP BY?'],    color: '#5599ff' },
];

const GRAFFITI_L4 = [
    { lines: ['PIVOT TABLE', 'ENJOYER'],           color: '#ffcc00' },
    { lines: ['DASHBOARD', 'LIED'],                color: '#ffaa00' },
    { lines: ['URGENT:', 'RERUN REPORT'],          color: '#ff8800' },
    { lines: ['STAKEHOLDER', 'WANTS REAL-TIME'],   color: '#ff6600' },
    { lines: ['CHART.JS', 'SAID NO'],              color: '#ffdd00' },
    { lines: ['EXPORT TO', 'EXCEL?', 'REALLY?'],   color: '#ffcc44' },
    { lines: ['BI LAYER', 'ON FIRE'],              color: '#ff4400' },
    { lines: ['THE KPI', 'IS MADE UP'],            color: '#ffbb00' },
    { lines: ['STAKEHOLDER', 'WAS HERE'],          color: '#ff9900' },
];

// ─── Mission definitions ──────────────────────────────────────────────────────

export const MISSIONS = [
    {
        id: 'L0',
        name: 'Raw Data Layer',
        map: MAP_L0,
        entitySpawns: SPAWNS_L0,
        playerStart: { x: 2.5, y: 2.5, dirX: 0.83, dirY: 0.55, planeX: 0, planeY: 0.66 },
        extraGraffiti: GRAFFITI_L0,
        completionBonus: 3000,
        briefing: {
            title: 'L0 — RAW DATA LAYER',
            lines: [
                'The Extractor is loose in the raw data.',
                'It duplicates everything it touches.',
                'Stop the replication. At any cost.',
            ],
            bossName: 'GENERIC EXTRACTOR',
            bossDesc: 'Spawns duplicates. Revives fallen enemies.',
        },
    },
    {
        id: 'L1',
        name: 'Trigger Flow',
        map: MAP_L1,
        entitySpawns: SPAWNS_L1,
        playerStart: { x: 1.5, y: 1.5, dirX: 0.83, dirY: 0.55, planeX: 0, planeY: 0.66 },
        extraGraffiti: GRAFFITI_L1,
        completionBonus: 4000,
        briefing: {
            title: 'L1 — TRIGGER FLOW',
            lines: [
                'Something keeps triggering in the staging layer.',
                'Nobody knows what. Nobody knows when.',
                'Table update events are feeding it. Shoot them down.',
                'Direct fire is useless — intercept the events to deal damage.',
            ],
            bossName: 'on: table_updated',
            bossDesc: 'Immune to direct fire. Shoot incoming table events to damage it. Each event it receives triggers a barrage.',
        },
    },
    {
        id: 'L2',
        name: 'Native Types',
        map: MAP_L2,
        entitySpawns: SPAWNS_L2,
        mode: 'type_cast',
        playerStart: { x: 7.5, y: 10, dirX: 0, dirY: -1, planeX: 0.66, planeY: 0 },
        extraGraffiti: GRAFFITI_L2,
        completionBonus: 5000,
        briefing: {
            title: 'L2 — NATIVE TYPES',
            lines: [
                'Records are coming in. Types are wrong. Cast them.',
                'Your CAST Canon cycles the data type of incoming records.',
                'Wrong type arrives at a column: TYPE MISMATCH. You die.',
                'Insert all records with matching types to survive.',
            ],
            bossName: 'TYPE SYSTEM',
            bossDesc: 'Insert all records with correct types. Shoot records to cycle their data type.',
        },
    },
    {
        id: 'Final',
        name: 'Data Mart',
        map: MAP_L4,
        entitySpawns: SPAWNS_L4,
        mode: 'stakeholder_fight',
        playerStart: { x: 1.5, y: 1.5, dirX: 0.83, dirY: 0.55, planeX: 0, planeY: 0.66 },
        extraGraffiti: GRAFFITI_L4,
        completionBonus: 10000,
        briefing: {
            title: 'FINAL — DATA MART',
            lines: [
                'The Stakeholder is immune to all weapons.',
                'It fires business requirements — intercept them with KAI Assistant.',
                'Each intercepted requirement becomes a Dashboard that fights for you.',
                'Only Dashboards can deal damage to The Stakeholder.',
            ],
            bossName: 'THE STAKEHOLDER',
            bossDesc: 'Immune to player fire. Convert its requirements into Dashboards using KAI Assistant. Dashboards fight for you.',
        },
    },
];

// Keep legacy export for backwards compatibility with any tests that use it
export const LEVEL_1 = MISSIONS[0];

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
