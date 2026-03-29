// Game configuration — all constants in one place

export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 500;

// Textures (must be power of 2)
export const TEX_WIDTH = 64;
export const TEX_HEIGHT = 64;

// Camera plane length determines FOV (~66 degrees)
export const CAMERA_PLANE_LEN = 0.66;

// Player movement
export const MOVE_SPEED = 0.055;
export const ROT_SPEED = 0.038;
export const MOUSE_SENSITIVITY = 0.0011;
export const PLAYER_COLLISION_RADIUS = 0.3;

// Player starting state
export const PLAYER_START = {
    x: 2.5,
    y: 2.5,
    dirX: 1,
    dirY: 0,
    planeX: 0,
    planeY: CAMERA_PLANE_LEN,
};

export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_MAX_ARMOR = 100;

export const MAX_AMMO = {
    bullets: 200,
    shells: 50,
    rockets: 50,
    energy: 200,
    tokens: 999999,   // KAI token budget — effectively unlimited
    ddl: 3,
};

export const STARTING_AMMO = {
    bullets: 50,
    shells: 0,
    rockets: 0,
    energy: 0,
    tokens: 0,        // only available via idkfa cheat
    ddl: 1,
};

// Minimap
export const MINIMAP_CELL = 6;
export const MINIMAP_MARGIN = 10;

// Weapon definitions
export const WEAPON_DEFS = {
    fist: {
        id: 'fist',
        name: 'CTRL+Z',           // the last resort — punch it and hope for undo
        damage: 25,
        fireRate: 500,
        ammoType: null,
        ammoPerShot: 0,
        melee: true,
        meleeRange: 1.5,
        color: '#e8a060',
    },
    sql_gun: {
        id: 'sql_gun',
        name: 'SELECT * Gun',     // fires SELECT statements at high velocity
        damage: 18,
        fireRate: 650,
        ammoType: 'bullets',
        ammoPerShot: 1,
        melee: false,
        projectile: true,
        projSpeed: 0.55,    // fast query
        projSprite: 13,
        color: '#aaaaaa',
    },
    data_shotgun: {
        id: 'data_shotgun',
        name: 'Scatter Query',    // 7 pellets = 7 table scans at once
        damage: 14,   // per pellet
        pellets: 7,
        spread: 0.12,
        fireRate: 900,
        ammoType: 'shells',
        ammoPerShot: 1,
        melee: false,
        projectile: true,
        projSpeed: 0.50,    // fast API calls
        projSprite: 14,
        color: '#cc8844',
    },
    pipeline_launcher: {
        id: 'pipeline_launcher',
        name: 'ETL Bazooka',      // slow but devastating, like every ETL job ever
        damage: 90,
        splashRadius: 2.5,
        fireRate: 1400,
        ammoType: 'rockets',
        ammoPerShot: 1,
        melee: false,
        projectile: true,
        projSpeed: 0.22,    // slower batch job
        projSprite: 15,
        color: '#44cc44',
    },
    bfd_9000: {
        id: 'bfd_9000',
        name: 'BFD 9000',         // Big Full-scan DataFrame — burns Snowflake credits fast
        damage: 250,
        splashRadius: 6,
        fireRate: 2800,
        ammoType: 'energy',
        ammoPerShot: 40,          // 40 credits per shot
        melee: false,
        projectile: true,
        projSpeed: 0.10,    // very slow orb, like full table scan on 10TB
        projSprite: 16,
        color: '#44ffff',
    },
    kai_assistant: {
        id: 'kai_assistant',
        name: 'KAI Assistant',    // asks a clarifying question, then one-shots everything
        damage: 9999,
        splashRadius: 9,
        fireRate: 3500,           // slow — "analyzing your request..."
        ammoType: 'tokens',
        ammoPerShot: 1000,        // burns 1000 tokens per query (cheap for what it does)
        melee: false,
        projectile: true,
        projSpeed: 0.07,          // very slow orb — "generating response..."
        projSprite: 17,
        color: '#ff44ff',
    },
    drop_all_tables: {
        id: 'drop_all_tables',
        name: 'DROP ALL TABLES',     // instant schema destruction — no confirmation dialog
        damage: 99999,
        fireRate: 5000,
        ammoType: 'ddl',
        ammoPerShot: 1,
        melee: false,
        dropAll: true,               // special flag — kills all alive enemies instantly
        color: '#ff2200',
    },
};

// Enemy type definitions
export const ENEMY_TYPES = {
    data_zombie: {
        id: 'data_zombie',
        name: 'Stale Record',     // last updated in 2019, still shambling around production
        health: 40,
        speed: 0.022,
        damage: 7,
        attackRange: 1.4,
        sightRange: 12,
        spriteIndex: 0,
        score: 100,
        attackCooldown: 1100,
        isRanged: false,
    },
    pipeline_demon: {
        id: 'pipeline_demon',
        name: 'NULL Daemon',      // corrupts everything it touches with NULLs, ranged attacker
        health: 70,
        speed: 0.038,
        damage: 12,
        attackRange: 9,
        sightRange: 16,
        spriteIndex: 1,
        score: 200,
        attackCooldown: 1400,
        isRanged: true,
    },
    config_monster: {
        id: 'config_monster',
        name: 'Schema Drift',     // fast and chaotic — changes its column types mid-run
        health: 110,
        speed: 0.048,
        damage: 22,
        attackRange: 1.3,
        sightRange: 11,
        spriteIndex: 2,
        score: 350,
        attackCooldown: 750,
        isRanged: false,
    },
    server_boss: {
        id: 'server_boss',
        name: 'The Orchestrator', // final boss — schedules your death, retries it 3 times
        health: 500,
        speed: 0.018,
        damage: 40,
        attackRange: 12,
        sightRange: 20,
        spriteIndex: 3,
        score: 2000,
        attackCooldown: 1800,
        isRanged: true,
        isBoss: true,
    },
    flow_specter: {
        id: 'flow_specter',
        name: 'Infinite Retry Loop', // scheduled every minute, fails every time, retries anyway
        health: 65,
        speed: 0.040,
        damage: 10,
        attackRange: 11,
        sightRange: 18,
        spriteIndex: 4,
        score: 180,
        attackCooldown: 750,          // fires fast — "retry attempt 1, 2, 3..."
        isRanged: true,
        projSpeed: 0.38,              // rapid trigger bursts
        projSplash: 0,
    },
    sql_mutant: {
        id: 'sql_mutant',
        name: 'SELECT * FROM chaos', // does a full table scan on everything, including your health
        health: 95,
        speed: 0.022,
        damage: 30,
        attackRange: 8,
        sightRange: 14,
        spriteIndex: 5,
        score: 280,
        attackCooldown: 2000,         // slow — "running full table scan, please wait..."
        isRanged: true,
        projSpeed: 0.09,              // slow heavy blob — like a 10TB cross join
        projSplash: 0.6,              // schema explodes on contact
    },
};

// Item type definitions
export const ITEM_TYPES = {
    health_small: { id: 'health_small', name: 'Coffee',            heal: 10,  spriteIndex: 4 },  // emergency caffeine
    health_large: { id: 'health_large', name: 'Red Bull',          heal: 25,  spriteIndex: 5 },  // the big one
    ammo_bullets: { id: 'ammo_bullets', name: 'SQL Queries',       ammoType: 'bullets', amount: 20, spriteIndex: 6 },
    ammo_shells:  { id: 'ammo_shells',  name: 'API Calls',         ammoType: 'shells',  amount: 8,  spriteIndex: 7 },
    ammo_rockets: { id: 'ammo_rockets', name: 'Batch Jobs',        ammoType: 'rockets', amount: 5,  spriteIndex: 8 },
    armor:        { id: 'armor',        name: 'SLA Guarantee',     armor: 25, spriteIndex: 9 },   // 99.9% uptime, guaranteed
    weapon_shotgun:  { id: 'weapon_shotgun',  name: 'Scatter Query',  weaponId: 'data_shotgun',     ammoType: 'shells',  ammoBonus: 10, spriteIndex: 10 },
    weapon_launcher: { id: 'weapon_launcher', name: 'ETL Bazooka',    weaponId: 'pipeline_launcher', ammoType: 'rockets', ammoBonus: 5,  spriteIndex: 11 },
    weapon_bfd:      { id: 'weapon_bfd',      name: 'BFD 9000',       weaponId: 'bfd_9000',         ammoType: 'energy',  ammoBonus: 40, spriteIndex: 12 },
};
