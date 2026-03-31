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
        name: 'SELECT 1',         // the last resort — punch it and hope for undo
        damage: 25,
        fireRate: 500,
        ammoType: null,
        ammoPerShot: 0,
        melee: true,
        meleeRange: 1.5,
        color: '#e8a060',
    },
    chainsaw: {
        id: 'chainsaw',
        name: 'Kill Job',         // instantly terminates running jobs — no confirmation dialog
        damage: 40,
        fireRate: 280,
        ammoType: null,
        ammoPerShot: 0,
        melee: true,
        meleeRange: 1.3,
        color: '#ff8800',
    },
    sql_gun: {
        id: 'sql_gun',
        name: 'Run Single Row',   // fires SELECT statements at high velocity
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
        name: 'Parallel Jobs',    // 7 pellets = 7 jobs fired at once
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
    super_shotgun: {
        id: 'super_shotgun',
        name: 'Conditional Flow', // branches into 14 parallel paths at once
        damage: 10,               // per pellet
        pellets: 14,
        spread: 0.22,
        fireRate: 1100,
        ammoType: 'shells',
        ammoPerShot: 2,
        melee: false,
        projectile: true,
        projSpeed: 0.50,
        projSprite: 14,
        color: '#ff6600',
    },
    chaingun: {
        id: 'chaingun',
        name: 'Webhook',          // fires on every event, no rate limiting
        damage: 12,
        fireRate: 100,
        ammoType: 'bullets',
        ammoPerShot: 1,
        melee: false,
        color: '#88aacc',
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
    plasma_rifle: {
        id: 'plasma_rifle',
        name: 'Data Stream',      // continuous real-time fire — CDC at maximum throughput
        damage: 22,
        fireRate: 175,
        ammoType: 'energy',
        ammoPerShot: 1,
        melee: false,
        projectile: true,
        projSpeed: 0.55,
        projSprite: 16,
        color: '#00ffaa',
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
    cast_canon: {
        id: 'cast_canon',
        name: 'CAST Canon',
        damage: 0,
        fireRate: 350,
        ammoType: null,
        ammoPerShot: 0,
        melee: false,
        hitscanCast: true,
        color: '#00ddff',
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
    extractor_boss: {
        id: 'extractor_boss',
        name: 'Generic extractor',
        health: 600,
        speed: 0.020,
        damage: 35,
        attackRange: 14,
        sightRange: 22,
        spriteIndex: 6,
        score: 3000,
        attackCooldown: 2000,
        isRanged: true,
        isBoss: true,
        projSpeed: 0.25,
        projSplash: 0,
        bossAbility: 'spawn_duplicates',
        bossReviveCooldown: 8000,
    },
    trigger_boss: {
        id: 'trigger_boss',
        name: 'on: table_updated',
        health: 120,
        speed: 0.008,            // barely moves — lurks in the back
        damage: 32,
        attackRange: 20,
        sightRange: 26,
        spriteIndex: 7,
        score: 4000,
        attackCooldown: 99999,   // never self-attacks — fires only via received events
        isRanged: true,
        isBoss: true,
        projSpeed: 0.26,
        projSplash: 0,
        immuneToDirect: true,    // direct fire does nothing — must intercept table events
        bossAbility: 'table_events',
        bossEventInterval: 2000, // ms between new incoming table events
        bossEventRadius: 9,      // spawn events this far from boss
        bossEventBarrageCount: 3,// projectiles fired per received event
    },
    optimizer_boss: {
        id: 'optimizer_boss',
        name: 'The Optimizer',
        health: 1000,
        speed: 0.018,
        damage: 45,
        attackRange: 16,
        sightRange: 24,
        spriteIndex: 8,
        score: 5000,
        attackCooldown: 1200,
        isRanged: true,
        isBoss: true,
        projSpeed: 0.22,
        projSplash: 1.5,
        bossAbility: 'query_phases',
        bossPhases: [0.75, 0.50, 0.25],
    },
    aggregator_boss: {
        id: 'aggregator_boss',
        name: 'The Aggregator',
        health: 1200,
        speed: 0.015,
        damage: 55,
        attackRange: 8,
        sightRange: 22,
        spriteIndex: 9,
        score: 6000,
        attackCooldown: 2500,
        isRanged: false,
        isBoss: true,
        bossAbility: 'split_on_damage',
        bossPhases: [0.5],
        bossSplitType: 'aggregator_shard',
        bossSplitCount: 2,
    },
    stakeholder_boss: {
        id: 'stakeholder_boss',
        name: 'The Stakeholder',
        health: 1500,
        speed: 0.008,
        damage: 0,           // does not attack directly — fires business requirements
        attackRange: 1,
        sightRange: 26,
        spriteIndex: 10,
        score: 8000,
        attackCooldown: 99999,
        isRanged: false,
        isBoss: true,
        immuneToAll: true,   // only dashboards can deal damage
        bossAbility: 'business_requirements',
        bossReqInterval: 5000,  // ms between requirement barrages
        bossReqCount: 1,        // requirements per barrage
        bossReqDamage: 18,      // damage per req that hits player
        bossReqSpeed: 0.045,    // speed of flying requirements
        regenRate: 50,          // HP regenerated per second (needs 3+ dashboards to overcome)
    },
    null_pointer: {
        id: 'null_pointer',
        name: 'NULL Pointer',
        health: 20,
        speed: 0.055,
        damage: 8,
        attackRange: 1.2,
        sightRange: 14,
        spriteIndex: 11,
        score: 50,
        attackCooldown: 600,
        isRanged: false,
    },
    aggregator_shard: {
        id: 'aggregator_shard',
        name: 'Partial Aggregate',
        health: 150,
        speed: 0.030,
        damage: 20,
        attackRange: 5,
        sightRange: 18,
        spriteIndex: 12,
        score: 500,
        attackCooldown: 1800,
        isRanged: false,
        isBoss: true,
    },
    urgent_ticket: {
        id: 'urgent_ticket',
        name: 'Urgent Ticket',      // spawned by The Stakeholder — blocking, nonsensical, will not die quietly
        health: 35,
        speed: 0.045,
        damage: 12,
        attackRange: 1.3,
        sightRange: 16,
        spriteIndex: 13,
        score: 75,
        attackCooldown: 800,
        isRanged: false,
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
    weapon_shotgun:       { id: 'weapon_shotgun',       name: 'Parallel Jobs',    weaponId: 'data_shotgun',      ammoType: 'shells',  ammoBonus: 10, spriteIndex: 10 },
    weapon_launcher:      { id: 'weapon_launcher',      name: 'ETL Bazooka',      weaponId: 'pipeline_launcher', ammoType: 'rockets', ammoBonus: 5,  spriteIndex: 11 },
    weapon_kai:           { id: 'weapon_kai',           name: 'KAI Assistant',    weaponId: 'kai_assistant',     ammoType: 'tokens',  ammoBonus: 3000, spriteIndex: 12 },
    weapon_chainsaw:      { id: 'weapon_chainsaw',      name: 'Kill Job',         weaponId: 'chainsaw',          ammoType: null,      ammoBonus: 0,  spriteIndex: 18 },
    weapon_super_shotgun: { id: 'weapon_super_shotgun', name: 'Conditional Flow', weaponId: 'super_shotgun',     ammoType: 'shells',  ammoBonus: 4,  spriteIndex: 19 },
    weapon_chaingun:      { id: 'weapon_chaingun',      name: 'Webhook',          weaponId: 'chaingun',          ammoType: 'bullets', ammoBonus: 40, spriteIndex: 20 },
    weapon_plasma:        { id: 'weapon_plasma',        name: 'Data Stream',      weaponId: 'plasma_rifle',      ammoType: 'energy',  ammoBonus: 40, spriteIndex: 21 },
    ammo_energy:          { id: 'ammo_energy',          name: 'Snowflake Credits', ammoType: 'energy',            amount: 40,          spriteIndex: 22 },
};

// L2 Type Cast mechanic constants
export const L2_DATA_TYPES = ['INT', 'VARCHAR', 'BOOLEAN', 'FLOAT', 'DATE'];
export const L2_COLUMN_DEFS = [
    { name: 'id',         type: 'INT'     },
    { name: 'name',       type: 'VARCHAR' },
    { name: 'active',     type: 'BOOLEAN' },
    { name: 'salary',     type: 'FLOAT'   },
    { name: 'created_at', type: 'DATE'    },
];
export const L2_RECORDS_BY_DIFFICULTY = [5, 10, 15];
export const L2_RECORD_SPEED    = 0.0009;
export const L2_SPAWN_INTERVALS = [6000, 4000, 3000];
export const L2_MAX_CONCURRENT  = [2, 2, 3];
export const L2_COLUMN_HIT_R2   = 0.64;
export const L2_CAST_HIT_R2     = 0.36;
