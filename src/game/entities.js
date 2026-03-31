// Entity system — Enemies, Items, Projectiles + EntityManager

import { ENEMY_TYPES, ITEM_TYPES, WEAPON_DEFS, L2_DATA_TYPES, L2_COLUMN_DEFS, L2_RECORDS_BY_DIFFICULTY, L2_RECORD_SPEED, L2_SPAWN_INTERVALS, L2_MAX_CONCURRENT, L2_COLUMN_HIT_R2, L2_CAST_HIT_R2 } from '../config.js';
import { isWall, hasLineOfSight } from '../engine/map.js';

// ─── Colors ───────────────────────────────────────────────────────────────────

const ENEMY_COLORS = {
    data_zombie:     [0.1, 0.8, 0.1],
    pipeline_demon:  [0.2, 0.3, 1.0],
    config_monster:  [1.0, 0.5, 0.0],
    server_boss:     [1.0, 0.1, 0.1],
    flow_specter:    [0.65, 0.2, 1.0],  // violet/purple
    sql_mutant:      [1.0,  0.72, 0.0], // amber
    extractor_boss:     [1.0, 0.3, 0.1],   // orange-red
    validator_boss:     [1.0, 1.0, 0.0],   // yellow
    optimizer_boss:     [0.0, 0.9, 0.3],   // bright green
    aggregator_boss:    [0.1, 0.5, 1.0],   // bright blue
    stakeholder_boss:   [1.0, 0.8, 0.0],   // gold
    null_pointer:       [1.0, 0.0, 1.0],   // magenta
    aggregator_shard:   [0.1, 0.4, 0.9],   // medium blue
    urgent_ticket:      [0.0, 0.7, 1.0],   // Jira blue
    trigger_boss:       [0.0, 1.0, 0.9],   // cyan/teal
};

const ITEM_COLORS = {
    health_small:    [0.0, 0.9, 0.2],
    health_large:    [0.0, 1.0, 0.4],
    ammo_bullets:    [0.9, 0.8, 0.0],
    ammo_shells:     [0.9, 0.5, 0.1],
    ammo_rockets:    [0.2, 0.9, 0.2],
    armor:           [0.1, 0.4, 1.0],
    weapon_shotgun:  [0.9, 0.5, 0.2],
    weapon_launcher: [0.2, 0.9, 0.2],
    weapon_bfd:      [0.0, 0.9, 0.9],
    weapon_kai:           [0.9, 0.2, 0.9],
    weapon_chainsaw:      [1.0, 0.5, 0.0],
    weapon_super_shotgun: [1.0, 0.4, 0.0],
    weapon_chaingun:      [0.5, 0.7, 0.9],
    weapon_plasma:        [0.0, 1.0, 0.6],
    ammo_energy:          [0.0, 0.8, 0.5],
};

// Table names from tables.csv — fetched once, assigned randomly to each enemy
let _tableNames = [];
(async () => {
    try {
        const text = await fetch('./tables.csv').then(r => r.text());
        _tableNames = text.trim().split('\n').slice(1)   // skip header
            .map(l => l.trim()).filter(Boolean);
    } catch (e) {
        // fallback if fetch fails
        _tableNames = ['in_raw_contacts','out_fact_orders','tmp_dedup','stg_events'];
    }
})();

function _randomTable() {
    if (_tableNames.length === 0) return 'loading...';
    return _tableNames[Math.floor(Math.random() * _tableNames.length)];
}

// Flow step names for flow_specter enemies — each one is a haunted scheduled job
const _FLOW_STEP_NAMES = [
    'hourly_sync', 'realtime_ingest', 'nightly_export',
    'webhook_trigger', 'cdc_listener', 'batch_transform',
    'incremental_load', 'full_refresh', 'event_stream',
    'daily_snapshot', 'reporting_run', 'scheduled_job',
];

function _randomFlowName() {
    return _FLOW_STEP_NAMES[Math.floor(Math.random() * _FLOW_STEP_NAMES.length)];
}

// Draws a database table entity — grid with header, column headers, data rows
function _drawTableSprite(ctx, body, acc, tableName) {
    // Dark window background
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(3, 2, 58, 62);

    // Header bar (colored by enemy type)
    ctx.fillStyle = body;
    ctx.fillRect(3, 2, 58, 14);

    // Table name split over 2 lines in the header
    const name = tableName || 'unknown_table';
    const mid  = Math.ceil(name.length / 2);
    let brk    = name.lastIndexOf('_', mid);
    if (brk < 2) brk = name.indexOf('_', mid);
    if (brk < 0) brk = mid;
    const hdr1 = name.substring(0, brk);
    const hdr2 = name.substring(brk + 1);

    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth   = 1;
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 4px monospace';
    ctx.textAlign   = 'center';
    if (hdr2) {
        ctx.strokeText(hdr1, 32, 8);  ctx.fillText(hdr1, 32, 8);
        ctx.strokeText(hdr2, 32, 14); ctx.fillText(hdr2, 32, 14);
    } else {
        ctx.strokeText(hdr1, 32, 11); ctx.fillText(hdr1, 32, 11);
    }

    // Column header row
    ctx.fillStyle = '#1a1a32';
    ctx.fillRect(3, 16, 58, 7);
    ctx.fillStyle = acc;
    ctx.font      = 'bold 3.5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('id',    5,  22);
    ctx.fillText('name',  14, 22);
    ctx.fillText('value', 34, 22);
    ctx.fillText('ts',    52, 22);

    // Vertical column dividers
    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth   = 0.5;
    [12, 32, 50].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x, 64); ctx.stroke();
    });

    // Data rows — deterministic mock data bars
    const rowY   = [23, 31, 39, 47, 55];
    const idW    = [5, 4, 6, 3, 5];
    const nameW  = [14, 9, 16, 11, 13];
    const valW   = [10, 7, 12, 8, 9];
    for (let r = 0; r < 5; r++) {
        const ry = rowY[r];
        ctx.fillStyle = r % 2 === 0 ? '#0f0f20' : '#161628';
        ctx.fillRect(3, ry, 58, 7);

        // id: small grey bar
        ctx.fillStyle = '#556677';
        ctx.fillRect(4, ry + 2, idW[r], 3);

        // name: accent colored bar
        ctx.fillStyle   = acc;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(13, ry + 2, nameW[r], 3);
        ctx.globalAlpha = 1.0;

        // value: green bar
        ctx.fillStyle = '#44aa55';
        ctx.fillRect(33, ry + 2, valW[r], 3);

        // ts: tiny fixed-width grey bar
        ctx.fillStyle = '#556688';
        ctx.fillRect(51, ry + 2, 5, 3);
    }

    // Outer border + horizontal dividers
    ctx.strokeStyle = acc;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(3, 2, 58, 62);
    ctx.lineWidth   = 0.8;
    ctx.beginPath(); ctx.moveTo(3, 16); ctx.lineTo(61, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3, 23); ctx.lineTo(61, 23); ctx.stroke();
}

// Draws a Keboola Flow flowchart entity (in 64-unit scaled context)
function _drawFlowSprite(ctx, body, acc, flowName) {
    // Start oval
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.ellipse(32, 7, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FLOW', 32, 9);

    // Connector line down
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(32, 12); ctx.lineTo(32, 18); ctx.stroke();

    // Process box
    ctx.fillStyle = body;
    ctx.fillRect(14, 18, 36, 11);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(14, 18, 36, 11);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((flowName || 'execute').substring(0, 11), 32, 26);

    // Connector line down
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(32, 29); ctx.lineTo(32, 35); ctx.stroke();

    // Diamond (decision node)
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(32, 35); ctx.lineTo(47, 43); ctx.lineTo(32, 51); ctx.lineTo(17, 43);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ERROR?', 32, 45);

    // Retry arrow looping back (red — the infinite retry)
    ctx.strokeStyle = '#ff5555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(47, 43);
    ctx.lineTo(56, 43);
    ctx.lineTo(56, 22);
    ctx.lineTo(50, 22);
    ctx.stroke();
    // Arrow tip pointing into process box
    ctx.fillStyle = '#ff5555';
    ctx.beginPath();
    ctx.moveTo(50, 22); ctx.lineTo(54, 18); ctx.lineTo(54, 26);
    ctx.closePath();
    ctx.fill();
    // YES label
    ctx.fillStyle = '#ff5555';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('YES', 57, 36);
}

// Draws a Transformation SQL editor entity (in 64-unit scaled context)
function _drawSqlSprite(ctx, body, acc) {
    // Dark editor window
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(6, 2, 52, 60);

    // Title bar
    ctx.fillStyle = acc;
    ctx.fillRect(6, 2, 52, 9);

    // macOS-style window dots
    ctx.fillStyle = '#ff5f56'; ctx.beginPath(); ctx.arc(11, 6.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbd2e'; ctx.beginPath(); ctx.arc(17, 6.5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#27c93f'; ctx.beginPath(); ctx.arc(23, 6.5, 2, 0, Math.PI * 2); ctx.fill();

    // Filename
    ctx.fillStyle = '#000';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QUERY.sql', 46, 10);

    // SQL code lines (syntax highlighted)
    ctx.textAlign = 'left';
    ctx.font = 'bold 4px monospace';
    const lines = [
        { c: '#ff79c6', t: 'SELECT *' },
        { c: '#8be9fd', t: 'FROM dbt_chaos' },
        { c: '#ff79c6', t: 'WHERE 1=1' },
        { c: '#50fa7b', t: '-- no filter lol' },
        { c: '#f1fa8c', t: 'ORDER BY RAND()' },
        { c: '#ff5555', t: 'LIMIT 999999' },
    ];
    lines.forEach((l, i) => {
        ctx.fillStyle = l.c;
        ctx.fillText(l.t, 8, 19 + i * 7);
    });

    // Blinking cursor
    ctx.fillStyle = '#f8f8f2';
    ctx.fillRect(8, 58, 2, 4);
}

// Item effect hint shown on the floating label
const AMMO_SHORT = { bullets: 'SQLS', shells: 'APIC', rockets: 'BTCH', energy: 'CRDT' };

// ─── Boss-specific sprite drawing functions ───────────────────────────────────

// Preload the extractor icon so it's ready when the boss sprite is first drawn.
// Guard against non-browser environments (e.g. Node.js test runner).
const _extractorIcon = typeof Image !== 'undefined' ? new Image() : null;
if (_extractorIcon) _extractorIcon.src = '/textures/boss_extractor.png';

function _drawExtractorSprite(ctx, body, acc) {
    if (_extractorIcon && _extractorIcon.complete && _extractorIcon.naturalWidth > 0) {
        // Draw the Keboola Generic Extractor icon centered in the 64×64 sprite area.
        ctx.drawImage(_extractorIcon, 0, 4, 64, 56);
    } else {
        // Fallback while image is loading: simple placeholder
        ctx.fillStyle = body;
        ctx.fillRect(8, 8, 48, 48);
        ctx.fillStyle = '#ff4400';
        ctx.font = 'bold 5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EXTRACTOR', 32, 58);
    }
}

function _drawValidatorSprite(ctx, body, acc, phase) {
    // Checklist with some items crossed out (validation failures)
    ctx.fillStyle = '#0a180a';
    ctx.fillRect(4, 4, 56, 56);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, 4, 56, 56);
    // Title
    ctx.fillStyle = body;
    ctx.fillRect(4, 4, 56, 10);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VALIDATE', 32, 11);
    // Checklist items — some pass, some fail based on phase
    const items = ['type_check', 'not_null', 'uniqueness', 'range_val', 'ref_integ'];
    const failed = phase > 0 ? [1, 3] : phase > 1 ? [0, 1, 3, 4] : [];
    items.forEach((item, i) => {
        const y = 20 + i * 9;
        const isFail = failed.includes(i);
        ctx.fillStyle = isFail ? '#550000' : '#003300';
        ctx.fillRect(5, y, 54, 8);
        ctx.fillStyle = isFail ? '#ff4444' : '#44ff44';
        ctx.font = 'bold 3.5px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(isFail ? '✗' : '✓', 7, y + 6);
        ctx.fillText(item.substring(0, 10), 14, y + 6);
    });
    ctx.fillStyle = acc;
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PHASE ${phase+1}`, 32, 60);
}

function _drawOptimizerSprite(ctx, body, acc) {
    // EXPLAIN PLAN — cascading query steps
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(4, 2, 56, 60);
    ctx.fillStyle = acc;
    ctx.fillRect(4, 2, 56, 9);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXPLAIN PLAN', 32, 8);
    // Plan steps cascading
    const steps = ['FULL SCAN', '↓ FILTER', '↓ HASH JOIN', '↓ SORT', '↓ LIMIT 0'];
    steps.forEach((step, i) => {
        const indent = i * 4;
        const y = 16 + i * 10;
        ctx.fillStyle = i === 0 ? '#550000' : i < 3 ? '#332200' : '#001133';
        ctx.fillRect(4 + indent, y, 56 - indent, 8);
        ctx.strokeStyle = acc;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(4 + indent, y, 56 - indent, 8);
        ctx.fillStyle = i === 0 ? '#ff6666' : '#aaaaff';
        ctx.font = `bold ${i === 0 ? 4.5 : 4}px monospace`;
        ctx.textAlign = 'left';
        ctx.fillText(step, 6 + indent, y + 6);
    });
}

function _drawAggregatorSprite(ctx, body, acc) {
    // 3D cube / CUBE() symbol
    ctx.fillStyle = '#0a0a22';
    ctx.fillRect(4, 4, 56, 56);
    // Top face
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(32, 10); ctx.lineTo(54, 20); ctx.lineTo(32, 30); ctx.lineTo(10, 20);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = 1.5; ctx.stroke();
    // Left face
    ctx.fillStyle = `rgba(${parseInt(body.slice(4))},0.65)`;
    ctx.beginPath();
    ctx.moveTo(10, 20); ctx.lineTo(32, 30); ctx.lineTo(32, 52); ctx.lineTo(10, 42);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Right face
    ctx.fillStyle = `rgba(${parseInt(body.slice(4))},0.85)`;
    ctx.beginPath();
    ctx.moveTo(54, 20); ctx.lineTo(32, 30); ctx.lineTo(32, 52); ctx.lineTo(54, 42);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // CUBE label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CUBE()', 32, 62);
}

function _drawAggregatorShardSprite(ctx, body, acc) {
    // Small cube fragment
    ctx.fillStyle = '#0a0a22';
    ctx.fillRect(8, 8, 48, 48);
    // Simplified cube
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(32, 16); ctx.lineTo(48, 24); ctx.lineTo(32, 32); ctx.lineTo(16, 24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = acc; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(16, 24); ctx.lineTo(32, 32); ctx.lineTo(32, 48); ctx.lineTo(16, 40);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48, 24); ctx.lineTo(32, 32); ctx.lineTo(32, 48); ctx.lineTo(48, 40);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Crack lines
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, 20); ctx.lineTo(20, 30); ctx.lineTo(28, 26); ctx.stroke();
    ctx.fillStyle = acc;
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PARTIAL', 32, 62);
}

function _drawStakeholderSprite(ctx, body, acc) {
    ctx.textAlign = 'center';

    // ── Legs ─────────────────────────────────────────────────────────────────
    // Left leg
    ctx.fillStyle = '#111128';
    ctx.fillRect(20, 46, 9, 14);
    // Left shoe
    ctx.fillStyle = '#080810';
    ctx.fillRect(18, 57, 12, 5);
    // Right leg
    ctx.fillStyle = '#111128';
    ctx.fillRect(35, 46, 9, 14);
    // Right shoe
    ctx.fillStyle = '#080810';
    ctx.fillRect(34, 57, 12, 5);

    // ── Torso / suit ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#1a1a3a';
    ctx.fillRect(17, 26, 30, 22);
    // Suit lapels
    ctx.fillStyle = '#12122a';
    ctx.beginPath(); ctx.moveTo(17, 26); ctx.lineTo(28, 34); ctx.lineTo(24, 48); ctx.lineTo(17, 48); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(47, 26); ctx.lineTo(36, 34); ctx.lineTo(40, 48); ctx.lineTo(47, 48); ctx.closePath(); ctx.fill();
    // White shirt + collar
    ctx.fillStyle = '#eeeeff';
    ctx.beginPath(); ctx.moveTo(25, 26); ctx.lineTo(32, 33); ctx.lineTo(39, 26); ctx.closePath(); ctx.fill();
    // Tie
    ctx.fillStyle = acc;
    ctx.beginPath();
    ctx.moveTo(29, 28); ctx.lineTo(35, 28); ctx.lineTo(34, 44); ctx.lineTo(32, 47); ctx.lineTo(30, 44);
    ctx.closePath(); ctx.fill();
    // Suit buttons
    ctx.fillStyle = '#8888aa';
    [37, 41].forEach(y => {
        ctx.beginPath(); ctx.arc(32, y, 1, 0, Math.PI * 2); ctx.fill();
    });

    // ── Arms ─────────────────────────────────────────────────────────────────
    // Left arm (raised slightly — gesturing)
    ctx.fillStyle = '#1a1a3a';
    ctx.save();
    ctx.translate(14, 30); ctx.rotate(0.4);
    ctx.fillRect(-3, 0, 7, 16);
    ctx.restore();
    // Left hand
    ctx.fillStyle = '#e8b89a';
    ctx.beginPath(); ctx.ellipse(10, 44, 4, 3.5, 0.4, 0, Math.PI * 2); ctx.fill();

    // Right arm (raised — holding a chart)
    ctx.fillStyle = '#1a1a3a';
    ctx.save();
    ctx.translate(50, 30); ctx.rotate(-0.4);
    ctx.fillRect(-4, 0, 7, 16);
    ctx.restore();
    // Right hand holding mini chart
    ctx.fillStyle = '#e8b89a';
    ctx.beginPath(); ctx.ellipse(54, 44, 4, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
    // Mini chart in hand
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 5px monospace';
    ctx.fillText('📈', 56, 38);

    // ── Head ─────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#e8b89a';
    ctx.beginPath(); ctx.ellipse(32, 16, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c49070'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(32, 16, 11, 13, 0, 0, Math.PI * 2); ctx.stroke();
    // Hair
    ctx.fillStyle = '#2a1800';
    ctx.beginPath(); ctx.ellipse(32, 5, 11, 5, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(21, 5, 22, 5);
    // Dollar-sign eyes
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('$', 26, 18);
    ctx.fillText('$', 38, 18);
    // Smug grin
    ctx.strokeStyle = '#7a3a1a'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(32, 23, 5, 0.15, Math.PI - 0.15); ctx.stroke();

    // Name badge on suit
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 33, 24, 10);
    ctx.strokeStyle = acc; ctx.lineWidth = 0.8;
    ctx.strokeRect(20, 33, 24, 10);
    ctx.fillStyle = '#000033';
    ctx.font = 'bold 3.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('business', 32, 39);
    ctx.fillText('Stakeholder', 32, 43);
}

function _drawTriggerBossSprite(ctx, body, acc) {
    // Keboola-style flow diagram: [TABLE] --on:update--> [TRIGGER] ---> [FLOW]
    ctx.fillStyle = '#001a1a';
    ctx.fillRect(2, 2, 60, 60);
    ctx.strokeStyle = '#004444';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, 60, 60);

    // Left node — source table
    ctx.fillStyle = '#002222';
    ctx.fillRect(3, 22, 16, 12);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 22, 16, 12);
    ctx.fillStyle = body;
    ctx.font = 'bold 3.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TABLE', 11, 29);

    // Arrow left -> center
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(19, 28); ctx.lineTo(23, 28); ctx.stroke();
    ctx.fillStyle = '#00ffff';
    ctx.beginPath(); ctx.moveTo(23, 25); ctx.lineTo(27, 28); ctx.lineTo(23, 31); ctx.closePath(); ctx.fill();

    // Center node — trigger (glowing, larger)
    ctx.fillStyle = '#003333';
    ctx.fillRect(27, 16, 18, 22);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(27, 16, 18, 22);

    // Lightning bolt (trigger symbol)
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(38, 18); ctx.lineTo(33, 26); ctx.lineTo(36, 26);
    ctx.lineTo(31, 36); ctx.lineTo(39, 25); ctx.lineTo(35, 25);
    ctx.closePath(); ctx.fill();

    // Arrow center -> right
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(45, 27); ctx.lineTo(49, 27); ctx.stroke();
    ctx.fillStyle = '#00ffff';
    ctx.beginPath(); ctx.moveTo(49, 24); ctx.lineTo(53, 27); ctx.lineTo(49, 30); ctx.closePath(); ctx.fill();

    // Right node — triggered flow
    ctx.fillStyle = '#002222';
    ctx.fillRect(53, 22, 9, 12);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1;
    ctx.strokeRect(53, 22, 9, 12);
    ctx.fillStyle = body;
    ctx.font = 'bold 3px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FLOW', 57, 29);

    // "on: table_updated" label at bottom
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 4.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('on: table_updated', 32, 58);
}

// ─── Business Requirement flying objects ──────────────────────────────────────

const _BIZ_REQ_TEXTS = [
    ['Make it pop', 'with AI'],
    ['Real-time', 'everything'],
    ['Add blockchain', 'NOW'],
    ['Pivot the pivot', 'table'],
    ['Why is it slow?', 'fix ASAP'],
    ['CEO saw Tableau', 'wants same'],
    ['Needs drill-down', 'to row level'],
    ['Export to PDF', 'AND Excel'],
    ['Mobile app', 'by Friday'],
    ['More KPIs', 'less logic'],
    ['Just use', 'ChatGPT'],
    ['Make numbers', 'go up'],
    ['Self-service BI', 'for everyone'],
    ['Why no', 'real-time sync?'],
    ['Move fast', 'break prod'],
];

function _drawBizReqSprite(ctx, lines) {
    ctx.fillStyle = '#1a0008';
    ctx.fillRect(2, 2, 60, 60);
    ctx.strokeStyle = '#ff2244';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 60, 60);
    // Top priority banner
    ctx.fillStyle = '#cc0022';
    ctx.fillRect(2, 2, 60, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEW REQUIREMENT', 32, 10);
    // Requirement text lines
    ctx.fillStyle = '#ffcccc';
    ctx.font = 'bold 7px monospace';
    const n = lines.length;
    lines.forEach((line, i) => {
        ctx.fillText(line, 32, 26 + i * 10);
    });
    // URGENT footer
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 5px monospace';
    ctx.fillText('!! URGENT !!', 32, 55);
    ctx.strokeStyle = '#ff0033';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 56, 56);
}

// ─── Dashboard friendly ally sprites ──────────────────────────────────────────

const _DASHBOARD_NAMES = [
    'Revenue YTD', 'Churn Rate', 'MRR Trends',
    'Q4 Pipeline', 'NPS Score', 'DAU/MAU',
    'Conversion %', 'CAC Trend', 'LTV Chart',
    'Funnel Drop', 'GMV Delta', 'ARR Forecast',
];

function _drawDashboardSprite(ctx, name) {
    ctx.fillStyle = '#001a0e';
    ctx.fillRect(2, 2, 60, 60);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 60, 60);
    // Title bar
    ctx.fillStyle = '#003322';
    ctx.fillRect(2, 2, 60, 11);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 4.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name || 'Dashboard', 32, 9.5);
    // Bar chart
    const barH = [18, 28, 22, 36, 30, 40];
    barH.forEach((h, i) => {
        ctx.fillStyle = i === barH.length - 1 ? '#00ff44' : '#009944';
        ctx.fillRect(5 + i * 9, 52 - h, 7, h);
    });
    // Trend line overlay
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const pts = [12, 22, 18, 33, 26, 37];
    ctx.moveTo(5, 52 - pts[0]);
    pts.forEach((v, i) => { if (i > 0) ctx.lineTo(5 + i * 9, 52 - v); });
    ctx.stroke();
    // ALLY label
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ ALLY ]', 32, 61);
}

// ─── Urgent Ticket nonsense requirements ─────────────────────────────────────

const _TICKET_TEXTS = [
    ['URGENT', 'make it pop'],
    ['P0', 'add blockchain'],
    ['BLOCKER', 'why so slow?'],
    ['CRITICAL', 'needs more AI'],
    ['URGENT', 'logo too small'],
    ['P0', 'just make it', 'real-time'],
    ['BLOCKER', 'fix the thing'],
    ['CRITICAL', 'wrong shade', 'of blue'],
    ['URGENT', 'stakeholder', 'wants charts'],
    ['P0', 'need this', 'by yesterday'],
    ['BLOCKER', 'can we pivot?'],
    ['CRITICAL', 'prod is slow', 'pls check'],
    ['URGENT', 'make numbers', 'go up'],
    ['P0', 'synergy lacking'],
    ['BLOCKER', 'not enough', 'disruption'],
    ['CRITICAL', 'CEO saw demo', 'wants changes'],
];

function _drawUrgentTicketSprite(ctx, body, acc, ticketText) {
    const [priority, ...lines] = ticketText;
    // Jira-style ticket card
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(2, 2, 60, 60);
    ctx.strokeStyle = acc;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, 60, 60);

    // Priority badge (top left)
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(2, 2, 60, 11);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`!! ${priority} !!`, 32, 10);

    // Ticket key (fake Jira ID)
    ctx.fillStyle = '#3388cc';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PROD-????', 5, 20);

    // Requirement lines
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
        ctx.fillText(line, 32, 30 + i * 8);
    });

    // Status: OVERDUE
    ctx.fillStyle = '#ff6600';
    ctx.font = 'bold 4px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('STATUS: OVERDUE', 5, 52);

    // Assignee: you
    ctx.fillStyle = '#555';
    ctx.font = 'bold 3.5px monospace';
    ctx.fillText('Assignee: you', 5, 59);
}

// ─── Explosion ────────────────────────────────────────────────────────────────

function spawnExplosion(x, y, radius, scene) {
    const sphere = BABYLON.MeshBuilder.CreateSphere('expl', { diameter: radius * 0.4 }, scene);
    sphere.position = new BABYLON.Vector3(x, 0.5, y);
    const mat = new BABYLON.StandardMaterial('expl_mat_' + Math.random(), scene);
    mat.emissiveColor = new BABYLON.Color3(1.0, 0.6, 0.0);
    sphere.material   = mat;
    let timer = 250;
    function tick() {
        timer -= scene.getEngine().getDeltaTime();
        const t = Math.max(0, timer / 250);
        sphere.scaling.setAll(1 + (1 - t) * 2);
        mat.emissiveColor = new BABYLON.Color3(t, t * 0.4, 0);
        if (timer <= 0) { sphere.dispose(); mat.dispose(); scene.unregisterAfterRender(tick); }
    }
    scene.registerAfterRender(tick);
}

// ─── AI states ────────────────────────────────────────────────────────────────

const STATE = { IDLE: 0, ALERT: 1, CHASE: 2, ATTACK: 3, DEAD: 4 };

let _enemySerial = 0;

// ─── Boss Ability Controller ──────────────────────────────────────────────────

class BossAbilityController {
    constructor(enemy) {
        this._enemy = enemy;
        this._em    = null;  // set by EntityManager after spawn
        this._timers = {};
        this._phase  = 0;
        this._splitDone = false;
    }

    tick(dt, player, audio) {
        const def = this._enemy.def;
        if (!def.bossAbility || !this._em) return;

        // Phase transitions
        if (def.bossPhases) {
            const hpRatio = this._enemy.health / def.health;
            for (let i = 0; i < def.bossPhases.length; i++) {
                if (hpRatio <= def.bossPhases[i] && this._phase <= i) {
                    this._phase = i + 1;
                    this._onPhaseChange(i + 1, player, audio, def);
                }
            }
        }

        switch (def.bossAbility) {
            case 'spawn_duplicates':       this._tickSpawnDuplicates(dt, player, audio); break;
            case 'scheduled_reports':      this._tickScheduledReports(dt, player, audio, def); break;
            case 'table_events':           this._tickTableEvents(dt, player, audio, def); break;
            case 'business_requirements':  this._tickBusinessRequirements(dt, player, audio, def); break;
            default: break;
        }
    }

    onDeath(audio) {
        const def = this._enemy.def;
        if (def.bossAbility === 'split_on_damage' && !this._splitDone) {
            this._splitDone = true;
            this._doSplit(audio, def);
        }
    }

    _onPhaseChange(phase, player, audio, def) {
        if (def.bossSpawnOnPhase && this._em) {
            const count = def.bossSpawnCount ?? 3;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const sx = this._enemy.x + Math.cos(angle) * 1.8;
                const sy = this._enemy.y + Math.sin(angle) * 1.8;
                this._em._spawnEnemy(def.bossSpawnOnPhase, sx, sy);
            }
        }
        if (audio) audio.play('enemy_alert');
    }

    _tickSpawnDuplicates(dt, player, audio) {
        const def = this._enemy.def;
        // Revive a random dead enemy periodically
        this._timers.revive = (this._timers.revive ?? 0) - dt;
        if (this._timers.revive <= 0) {
            this._timers.revive = def.bossReviveCooldown ?? 8000;
            if (this._em) this._em._reviveRandomDead(audio);
        }
    }

    _tickScheduledReports(dt, player, audio, def) {
        // Projectile barrage every bossScheduledInterval ms
        this._timers.report = (this._timers.report ?? 0) - dt;
        if (this._timers.report <= 0) {
            this._timers.report = def.bossScheduledInterval ?? 5000;
            const count = def.bossReportCount ?? 5;
            const dx    = player.x - this._enemy.x;
            const dy    = player.y - this._enemy.y;
            const len   = Math.sqrt(dx * dx + dy * dy);
            if (len >= 0.01) {
                const ndx = dx / len;
                const ndy = dy / len;
                for (let i = 0; i < count; i++) {
                    const spread = ((i / (count - 1)) - 0.5) * 0.6;
                    const cos = Math.cos(spread);
                    const sin = Math.sin(spread);
                    const fdx = ndx * cos - ndy * sin;
                    const fdy = ndx * sin + ndy * cos;
                    this._em._spawnEnemyProjectile(
                        this._enemy.x + fdx * 0.7,
                        this._enemy.y + fdy * 0.7,
                        fdx, fdy,
                        this._enemy.damage,
                        def.projSpeed ?? 0.3,
                    );
                }
                if (audio) audio.play('enemy_shoot');
            }
        }

        // Spawn urgent tickets every 12 seconds (separate timer)
        this._timers.ticket = (this._timers.ticket ?? 0) - dt;
        if (this._timers.ticket <= 0) {
            this._timers.ticket = 12000;
            const angles = [Math.PI * 0.5, Math.PI, Math.PI * 1.5];
            for (const angle of angles) {
                const sx = this._enemy.x + Math.cos(angle) * 2.5;
                const sy = this._enemy.y + Math.sin(angle) * 2.5;
                if (this._em) this._em._spawnEnemy('urgent_ticket', sx, sy);
            }
            if (audio) audio.play('enemy_alert');
        }
    }

    _doSplit(audio, def) {
        if (!this._em) return;
        const count = def.bossSplitCount ?? 2;
        const kind  = def.bossSplitType ?? 'aggregator_shard';
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const sx = this._enemy.x + Math.cos(angle) * 1.5;
            const sy = this._enemy.y + Math.sin(angle) * 1.5;
            this._em._spawnEnemy(kind, sx, sy);
        }
        if (audio) audio.play('enemy_alert');
    }

    _tickBusinessRequirements(dt, player, audio, def) {
        // Fire a spread of business requirements toward the player every N ms.
        // Requirements can be intercepted by KAI Assistant and converted into Dashboards.
        this._timers.req = (this._timers.req ?? 0) - dt;
        if (this._timers.req <= 0) {
            this._timers.req = def.bossReqInterval ?? 3200;
            const count = def.bossReqCount ?? 3;
            const dx = player.x - this._enemy.x;
            const dy = player.y - this._enemy.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.01 || !this._em) return;
            const ndx = dx / len;
            const ndy = dy / len;
            for (let i = 0; i < count; i++) {
                const spread = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * 0.9;
                const cos = Math.cos(spread);
                const sin = Math.sin(spread);
                const fdx = ndx * cos - ndy * sin;
                const fdy = ndx * sin + ndy * cos;
                this._em._spawnBusinessRequirement(
                    this._enemy.x + fdx * 0.8,
                    this._enemy.y + fdy * 0.8,
                    player, def,
                );
            }
            if (audio) audio.play('enemy_shoot');
        }
    }

    _tickTableEvents(dt, player, audio, def) {
        // Periodically spawn a table event that travels toward this boss.
        // Player must intercept it — each hit damages the boss.
        // Each event that reaches the boss triggers a projectile barrage.
        this._timers.event = (this._timers.event ?? 0) - dt;
        if (this._timers.event <= 0) {
            this._timers.event = def.bossEventInterval ?? 3500;
            if (this._em) {
                const radius = def.bossEventRadius ?? 9;
                // Retry up to 8 angles to avoid spawning inside a wall
                for (let attempt = 0; attempt < 8; attempt++) {
                    const angle = Math.random() * Math.PI * 2;
                    const sx = this._enemy.x + Math.cos(angle) * radius;
                    const sy = this._enemy.y + Math.sin(angle) * radius;
                    if (!isWall(this._em._map, sx, sy)) {
                        this._em._spawnTableEvent(sx, sy, this._enemy.x, this._enemy.y);
                        break;
                    }
                }
            }
        }
    }

    _onTableEventReceived(player, audio, def) {
        // Boss was reached by a table event — fire a barrage toward player
        const count = def.bossEventBarrageCount ?? 3;
        const dx = player.x - this._enemy.x;
        const dy = player.y - this._enemy.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.01 || !this._em) return;
        const ndx = dx / len;
        const ndy = dy / len;
        for (let i = 0; i < count; i++) {
            const spread = ((i / (count - 1)) - 0.5) * 0.55;
            const cos = Math.cos(spread);
            const sin = Math.sin(spread);
            const fdx = ndx * cos - ndy * sin;
            const fdy = ndx * sin + ndy * cos;
            this._em._spawnEnemyProjectile(
                this._enemy.x + fdx * 0.7,
                this._enemy.y + fdy * 0.7,
                fdx, fdy,
                this._enemy.damage,
                def.projSpeed ?? 0.26,
            );
        }
        if (audio) audio.play('enemy_shoot');
    }
}

// ─── Enemy ────────────────────────────────────────────────────────────────────

export class Enemy {
    constructor(kind, x, y, scene, damageMult = 1.0) {
        this.def     = ENEMY_TYPES[kind];
        this.x       = x;
        this.y       = y;
        this.removed = false;
        this.health  = this.def.health;
        this.state   = STATE.IDLE;
        this.damage  = Math.round(this.def.damage * damageMult);

        this._attackTimer = 0;
        this._alertTimer  = 0;
        this._wanderTimer = 0;
        this._wanderDX    = 0;
        this._wanderDY    = 0;
        this._hitFlash    = 0;
        this.deathTimer   = 0;
        this.score        = 0;

        // Boss facing direction — bosses turn slowly and only fire forward
        const initAngle = Math.random() * Math.PI * 2;
        this._facingX = Math.cos(initAngle);
        this._facingY = Math.sin(initAngle);
        this._scene       = scene;
        this._abilityCtrl = this.def.bossAbility ? new BossAbilityController(this) : null;
        // Assign kind-appropriate label — tables for table enemies, flow names for flows, tickets for urgent_ticket
        this._tableName   = kind === 'flow_specter'       ? _randomFlowName()
                          : kind === 'urgent_ticket'     ? _TICKET_TEXTS[Math.floor(Math.random() * _TICKET_TEXTS.length)]
                          : kind === 'extractor_boss'    ? 'Generic_extractor'
                          : kind === 'trigger_boss'      ? 'on: table_updated'
                          : kind === 'stakeholder_boss'  ? ''
                          : _randomTable();

        this._createMesh(kind, scene);
    }

    _createMesh(kind, scene) {
        const isBoss = this.def.isBoss;
        const w  = isBoss ? 1.1  : 0.75;
        const h  = isBoss ? 1.3  : 0.85;
        const sz = isBoss ? 192  : 128;   // texture resolution

        const id     = ++_enemySerial;
        this._meshId = id;

        // Per-enemy DynamicTexture — not cached — so we can repaint the HP bar
        this._spriteTex = new BABYLON.DynamicTexture(`etex_${id}`, { width: sz, height: sz }, scene, false);
        this._spriteSz  = sz;

        this.mesh = BABYLON.MeshBuilder.CreatePlane(`enemy_${id}`, { width: w, height: h }, scene);
        this.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        this.mesh.position      = new BABYLON.Vector3(this.x, isBoss ? 0.65 : 0.5, this.y);
        this.mesh.isPickable    = false;

        const rgb = ENEMY_COLORS[kind] ?? [0.5, 0.5, 0.5];
        this._baseColor = new BABYLON.Color3(rgb[0], rgb[1], rgb[2]);

        const mat = new BABYLON.StandardMaterial(`em_${id}`, scene);
        mat.diffuseTexture  = this._spriteTex;
        mat.emissiveColor   = this._baseColor.scale(0.6);
        mat.backFaceCulling = false;
        this.mesh.material  = mat;

        this._drawSprite(kind);
    }

    // Paints figure + label + HP bar onto the sprite texture.
    // Called once at spawn, then again on every hit.
    _drawSprite(kindArg) {
        const kind   = kindArg ?? this.def.id;
        const ctx    = this._spriteTex.getContext();
        const sz     = this._spriteSz;
        const isBoss = this.def.isBoss;
        const scale  = sz / 64;

        ctx.clearRect(0, 0, sz, sz);

        const rgb  = ENEMY_COLORS[kind] ?? [0.5, 0.5, 0.5];
        const body = `rgb(${Math.round(rgb[0]*180)},${Math.round(rgb[1]*180)},${Math.round(rgb[2]*180)})`;
        const acc  = `rgb(${Math.round(rgb[0]*255)},${Math.round(rgb[1]*255)},${Math.round(rgb[2]*255)})`;

        // Draw the figure scaled up to sz×sz
        ctx.save();
        ctx.scale(scale, scale);

        if (kind === 'flow_specter') {
            _drawFlowSprite(ctx, body, acc, this._tableName);
        } else if (kind === 'sql_mutant') {
            _drawSqlSprite(ctx, body, acc);
        } else if (kind === 'urgent_ticket') {
            _drawUrgentTicketSprite(ctx, body, acc, this._tableName);
        } else if (isBoss) {
            switch (kind) {
                case 'extractor_boss':   _drawExtractorSprite(ctx, body, acc);  break;
                case 'trigger_boss':     _drawTriggerBossSprite(ctx, body, acc); break;
                case 'optimizer_boss':   _drawOptimizerSprite(ctx, body, acc);  break;
                case 'aggregator_boss':  _drawAggregatorSprite(ctx, body, acc); break;
                case 'stakeholder_boss': _drawStakeholderSprite(ctx, body, acc);break;
                case 'aggregator_shard': _drawAggregatorShardSprite(ctx, body, acc); break;
                default:
                    // Generic boss (server_boss)
                    ctx.fillStyle = body;
                    ctx.fillRect(8, 8, 48, 48);
                    ctx.fillStyle = acc;
                    ctx.fillRect(12, 12, 14, 14);
                    ctx.fillRect(38, 12, 14, 14);
                    ctx.fillRect(12, 40, 40, 6);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(15, 17, 8, 5);
                    ctx.fillRect(41, 17, 8, 5);
            }
        } else {
            // Table-type enemies (data_zombie, pipeline_demon, config_monster) look like DB tables
            _drawTableSprite(ctx, body, acc, this._tableName);
        }

        ctx.restore();

        // ── Table name overlay — boss only, skipped if tableName is empty ──────
        if (isBoss && this._tableName) {
            const fullName = this._tableName ?? 'unknown_table';
            const mid      = Math.ceil(fullName.length / 2);
            let breakAt = fullName.lastIndexOf('_', mid);
            if (breakAt < 3) breakAt = fullName.indexOf('_', mid);
            if (breakAt < 0) breakAt = mid;
            const line1 = fullName.substring(0, breakAt);
            const line2 = fullName.substring(breakAt + 1);

            const fontSize   = 17;
            const lineHeight = fontSize * 1.25;
            const baseTextY  = Math.round(33 * scale);

            ctx.font      = `bold ${fontSize}px monospace`;
            ctx.textAlign = 'center';

            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.lineWidth   = fontSize * 0.22;
            ctx.strokeText(line1, sz / 2, baseTextY);
            ctx.strokeText(line2, sz / 2, baseTextY + lineHeight);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(line1, sz / 2, baseTextY);
            ctx.fillStyle = '#dddddd';
            ctx.fillText(line2, sz / 2, baseTextY + lineHeight);
        }

        // ── HP bar at the bottom of the sprite ────────────────────────────────
        const hpRatio = Math.max(0, this.health / this.def.health);
        const barH    = isBoss ? 11 : 8;
        const barY    = sz - barH - 2;
        const barX    = 4;
        const barW    = sz - 8;
        const hpCol   = hpRatio > 0.6 ? '#00ee44' : hpRatio > 0.25 ? '#ffaa00' : '#ee2200';

        ctx.fillStyle = '#1a0000';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hpCol;
        ctx.fillRect(barX, barY, Math.round(barW * hpRatio), barH);

        // Flavor label inside HP bar based on enemy kind
        const hp = Math.ceil(this.health);
        const hpLabel = kind === 'flow_specter'  ? `${hp} retries`
                      : kind === 'sql_mutant'    ? `${hp}% scanned`
                      : kind === 'urgent_ticket' ? `priority: P${hp}`
                      : kind === 'trigger_boss'  ? `${hp} events`
                      : `${hp} rows`;
        ctx.fillStyle = '#ffffff';
        ctx.font      = `bold ${isBoss ? 9 : 7}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(hpLabel, sz / 2, barY + barH - 1);

        this._spriteTex.update();
    }

    isAlive() { return this.state !== STATE.DEAD; }

    takeDamage(amount, audio, fromEvent = false, fromAlly = false) {
        if (this.state === STATE.DEAD) return;
        if (this.def.immuneToAll && !fromAlly) return;
        if (this.def.immuneToDirect && !fromEvent && !fromAlly) return;
        this.health -= amount;
        this._hitFlash = 180;
        if (this.health <= 0) {
            this.health = 0;
            this.state  = STATE.DEAD;
            this.deathTimer = 600;
            this.score  = this.def.score;
            audio.play('enemy_death');
            if (this._abilityCtrl) this._abilityCtrl.onDeath(audio);
        } else {
            if (this.state === STATE.IDLE) {
                this.state = STATE.ALERT;
                this._alertTimer = 400;
                audio.play('enemy_alert');
            }
        }
        // Repaint sprite to update HP bar and label
        this._drawSprite();
    }

    update(dt, player, map, audio, projectiles) {
        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.z = this.y;

            if (this._hitFlash > 0) {
                this._hitFlash -= dt;
                this.mesh.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
            } else {
                this.mesh.material.emissiveColor = this._baseColor.scale(0.6);
            }
        }

        if (this.state === STATE.DEAD) {
            this.deathTimer -= dt;
            if (this.mesh) {
                this.mesh.position.y = Math.max(-0.6, this.mesh.position.y - dt * 0.0015);
                this.mesh.scaling.y  = Math.max(0.01, this.mesh.scaling.y  - dt * 0.0025);
            }
            if (this.deathTimer <= 0) {
                if (this.mesh) {
                    this.mesh.material?.dispose();
                    this.mesh.dispose();
                    this.mesh = null;
                }
                if (this._spriteTex) { this._spriteTex.dispose(); this._spriteTex = null; }
                this.removed = true;
            }
            return;
        }

        const dx   = player.x - this.x;
        const dy   = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const canSee = dist < this.def.sightRange &&
            hasLineOfSight(map, this.x, this.y, player.x, player.y);

        // ── Boss facing: turn slowly toward player only when line of sight ──
        if (this.def.isBoss && canSee && dist > 0.01) {
            const TURN_SPEED = 0.0012;  // radians per ms (~70 deg/s)
            const targetX = dx / dist;
            const targetY = dy / dist;
            // Cross product determines turn direction
            const cross = this._facingX * targetY - this._facingY * targetX;
            const turnAmount = TURN_SPEED * dt;
            const angle = Math.atan2(this._facingY, this._facingX);
            const newAngle = angle + Math.sign(cross) * Math.min(turnAmount, Math.abs(Math.asin(Math.min(1, Math.abs(cross)))));
            this._facingX = Math.cos(newAngle);
            this._facingY = Math.sin(newAngle);
        }

        // How well the boss is aimed at the player (1.0 = perfect, -1.0 = backwards)
        const facingDot = dist > 0.01
            ? (this._facingX * dx + this._facingY * dy) / dist
            : 1;
        // Boss can only fire when facing player within ~18 degrees
        const bossFacingPlayer = !this.def.isBoss || facingDot > 0.95;

        if (this.state === STATE.IDLE) {
            if (canSee) { this.state = STATE.ALERT; this._alertTimer = 350; audio.play('enemy_alert'); }
            else        { this._wander(dt, map); }
        } else if (this.state === STATE.ALERT) {
            this._alertTimer -= dt;
            if (this._alertTimer <= 0) this.state = STATE.CHASE;
        } else if (this.state === STATE.CHASE) {
            if (!canSee && dist > this.def.sightRange * 1.5) {
                this.state = STATE.IDLE;
            } else if (dist <= this.def.attackRange) {
                this.state = STATE.ATTACK;
                this._attackTimer = 0;
            } else {
                this._moveToward(dt, player.x, player.y, map);
            }
        } else if (this.state === STATE.ATTACK) {
            this._attackTimer -= dt;
            if (dist > this.def.attackRange * 1.4) { this.state = STATE.CHASE; return; }

            if (this._attackTimer <= 0) {
                this._attackTimer = this.def.attackCooldown;
                if (this.def.isRanged) {
                    if (canSee && bossFacingPlayer) {
                        // Bosses fire in their facing direction, normal enemies aim directly
                        const fdx = this.def.isBoss ? this._facingX : dx / dist;
                        const fdy = this.def.isBoss ? this._facingY : dy / dist;
                        projectiles.push(new Projectile(
                            this.x + fdx * 0.6, this.y + fdy * 0.6,
                            fdx, fdy,
                            this.damage, 'enemy',
                            this._scene,
                            this.def.projSplash ?? 0,
                            this.def.projSpeed  ?? 0.2,
                        ));
                        audio.play('enemy_shoot');
                    }
                } else {
                    if (dist <= this.def.attackRange && bossFacingPlayer) {
                        player.takeDamage(this.damage);
                        audio.play('player_hurt');
                    }
                }
            }
            if (!this.def.isRanged) this._moveToward(dt * 0.3, player.x, player.y, map);
        }

        // Tick boss ability controller (call at end of update, after state machine)
        if (this._abilityCtrl) this._abilityCtrl.tick(dt, player, audio);

        // Health regeneration
        if (this.def.regenRate && this.state !== STATE.DEAD) {
            const prev = Math.floor(this.health);
            this.health = Math.min(this.def.health, this.health + this.def.regenRate * (dt / 1000));
            if (Math.floor(this.health) !== prev) this._drawSprite();
        }
    }

    _moveToward(dt, tx, ty, map) {
        const dx   = tx - this.x;
        const dy   = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.01) return;
        const speed = this.def.speed * (dt / 16);
        const mx    = (dx / dist) * speed;
        const my    = (dy / dist) * speed;
        const R     = 0.25;
        if (!isWall(map, this.x + mx + Math.sign(mx) * R, this.y)) this.x += mx;
        if (!isWall(map, this.x, this.y + my + Math.sign(my) * R)) this.y += my;
    }

    _wander(dt, map) {
        this._wanderTimer -= dt;
        if (this._wanderTimer <= 0) {
            this._wanderTimer = 800 + Math.random() * 1200;
            const angle = Math.random() * Math.PI * 2;
            this._wanderDX = Math.cos(angle);
            this._wanderDY = Math.sin(angle);
        }
        const speed = this.def.speed * 0.4 * (dt / 16);
        const R     = 0.25;
        if (!isWall(map, this.x + this._wanderDX * speed + Math.sign(this._wanderDX) * R, this.y))
            this.x += this._wanderDX * speed;
        else this._wanderTimer = 0;
        if (!isWall(map, this.x, this.y + this._wanderDY * speed + Math.sign(this._wanderDY) * R))
            this.y += this._wanderDY * speed;
        else this._wanderTimer = 0;
    }
}

// ─── Item ─────────────────────────────────────────────────────────────────────

let _itemSerial = 0;

export class Item {
    constructor(kind, x, y, scene) {
        this.def       = ITEM_TYPES[kind];
        this.x         = x;
        this.y         = y;
        this.removed   = false;
        this._bobTimer = Math.random() * Math.PI * 2;

        this._createMesh(kind, scene);
        this._createLabel(kind, scene);
    }

    _createMesh(kind, scene) {
        const id     = ++_itemSerial;
        this._itemId = id;

        const sz  = 96;
        const tex = new BABYLON.DynamicTexture(`itm_${id}`, { width: sz, height: sz }, scene, false);
        tex.hasAlpha  = true;
        this._iconTex = tex;

        const iconCtx = tex.getContext();
        iconCtx.clearRect(0, 0, sz, sz);
        _drawItemIcon(iconCtx, kind, sz);
        tex.update();

        this.mesh = BABYLON.MeshBuilder.CreatePlane(`item_${id}`, { width: 0.58, height: 0.58 }, scene);
        this.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        this.mesh.position      = new BABYLON.Vector3(this.x, 0.3, this.y);
        this.mesh.isPickable    = false;

        const mat = new BABYLON.StandardMaterial(`itm_mat_${id}`, scene);
        mat.diffuseTexture             = tex;
        mat.diffuseTexture.hasAlpha    = true;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor              = new BABYLON.Color3(1, 1, 1);
        mat.backFaceCulling            = false;
        this.mesh.material             = mat;
    }

    _createLabel(kind, scene) {
        const id  = this._itemId;
        const tw  = 256;
        const th  = 64;

        const tex      = new BABYLON.DynamicTexture(`ilbl_${id}`, { width: tw, height: th }, scene, false);
        tex.hasAlpha   = true;
        this._labelTex = tex;

        this.labelMesh = BABYLON.MeshBuilder.CreatePlane(`ilbl_${id}`, { width: 0.9, height: 0.22 }, scene);
        this.labelMesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        this.labelMesh.position      = new BABYLON.Vector3(this.x, 0.68, this.y);
        this.labelMesh.isPickable    = false;

        const mat = new BABYLON.StandardMaterial(`ilbl_mat_${id}`, scene);
        mat.diffuseTexture             = tex;
        mat.diffuseTexture.hasAlpha    = true;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor              = new BABYLON.Color3(1, 1, 1);
        mat.backFaceCulling            = false;
        this.labelMesh.material        = mat;

        // Draw label once (static)
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, tw, th);

        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(0, 0, tw, th);

        const rgb = ITEM_COLORS[kind] ?? [1, 1, 1];
        const col = `rgb(${Math.round(rgb[0]*255)},${Math.round(rgb[1]*255)},${Math.round(rgb[2]*255)})`;

        ctx.strokeStyle = col;
        ctx.lineWidth   = 2;
        ctx.strokeRect(1, 1, tw - 2, th - 2);

        ctx.fillStyle = col;
        ctx.font      = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.def.name, tw / 2, 26);

        ctx.fillStyle = '#dddddd';
        ctx.font      = '13px monospace';
        ctx.fillText(this._effectText(), tw / 2, 48);

        tex.update();
    }

    _effectText() {
        const d = this.def;
        if (d.heal)             return `+${d.heal} CPU%`;
        if (d.armor)            return `+${d.armor} SLA%`;
        if (d.weaponId)         return `[ NEW COMPONENT ]`;
        if (d.ammoType && d.amount)
            return `+${d.amount} ${AMMO_SHORT[d.ammoType] ?? d.ammoType}`;
        return '';
    }

    update(dt) {
        this._bobTimer += dt * 0.003;
        if (this.mesh) {
            this.mesh.position.y = 0.25 + Math.sin(this._bobTimer) * 0.1;
            this.mesh.rotation.y = this._bobTimer * 0.5;
        }
        if (this.labelMesh && this.mesh) {
            this.labelMesh.position.x = this.x;
            this.labelMesh.position.z = this.y;
            this.labelMesh.position.y = this.mesh.position.y + 0.40;
        }
    }

    tryPickup(player, weaponSystem, audio) {
        if (this.removed) return false;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) > 0.7) return false;

        const d = this.def;

        if (d.heal) {
            if (player.health >= 100) return false;
            player.addHealth(d.heal);
            audio.play('pickup_health');
        } else if (d.armor) {
            if (player.armor >= 100) return false;
            player.addArmor(d.armor);
            audio.play('pickup_health');
        } else if (d.ammoType && !d.weaponId) {
            if (player.ammo[d.ammoType] >= 200) return false;
            player.addAmmo(d.ammoType, d.amount);
            audio.play('pickup_ammo');
        } else if (d.weaponId) {
            const alreadyHad = player.hasWeapon(d.weaponId);
            player.giveWeapon(d.weaponId);
            if (d.ammoType) player.addAmmo(d.ammoType, d.ammoBonus);
            if (!alreadyHad) weaponSystem._requestSwitchExternal(player, d.weaponId);
            audio.play('pickup_weapon');
        }

        if (this.mesh)      { this.mesh.material?.dispose(); this.mesh.dispose(); this.mesh = null; }
        if (this._iconTex)  { this._iconTex.dispose(); this._iconTex = null; }
        if (this.labelMesh) { this.labelMesh.material?.dispose(); this.labelMesh.dispose(); this.labelMesh = null; }
        if (this._labelTex) { this._labelTex.dispose(); this._labelTex = null; }
        this.removed = true;
        return true;
    }
}

// ─── Item icon drawing ────────────────────────────────────────────────────────

function _iconBg(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
}

function _drawItemIcon(ctx, kind, sz) {
    const cx = sz / 2, cy = sz / 2;
    ctx.textBaseline = 'alphabetic';

    switch (kind) {
        case 'health_small': { // Coffee ☕
            _iconBg(ctx, cx, cy, sz * 0.46, '#2a0e00');
            // Mug body
            ctx.fillStyle = '#c07840';
            ctx.beginPath(); ctx.roundRect(cx - 15, cy - 8, 28, 24, 4); ctx.fill();
            // Coffee surface
            ctx.fillStyle = '#1a0800';
            ctx.fillRect(cx - 13, cy - 6, 24, 6);
            // Handle
            ctx.strokeStyle = '#c07840'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(cx + 19, cy + 4, 9, -Math.PI / 2, Math.PI / 2); ctx.stroke();
            // Saucer
            ctx.fillStyle = '#a06030';
            ctx.beginPath(); ctx.ellipse(cx, cy + 16, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Steam wisps
            ctx.strokeStyle = 'rgba(180,210,255,0.75)'; ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const sx = cx - 8 + i * 8;
                ctx.beginPath();
                ctx.moveTo(sx, cy - 12);
                ctx.bezierCurveTo(sx - 5, cy - 20, sx + 5, cy - 27, sx, cy - 34);
                ctx.stroke();
            }
            // Label
            ctx.fillStyle = '#ffcc88'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
            ctx.fillText('+10 CPU%', cx, sz - 4);
            break;
        }

        case 'health_large': { // Red Bull 🐂
            _iconBg(ctx, cx, cy, sz * 0.46, '#1a0000');
            // Can body
            ctx.fillStyle = '#cccccc';
            ctx.beginPath(); ctx.roundRect(cx - 12, cy - 20, 24, 36, 3); ctx.fill();
            // Red top band
            ctx.fillStyle = '#cc0000';
            ctx.beginPath(); ctx.roundRect(cx - 12, cy - 20, 24, 14, [3,3,0,0]); ctx.fill();
            // Wings
            ctx.fillStyle = '#cc0000';
            ctx.beginPath(); ctx.moveTo(cx-12,cy-10); ctx.lineTo(cx-26,cy-20); ctx.lineTo(cx-12,cy+4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx+12,cy-10); ctx.lineTo(cx+26,cy-20); ctx.lineTo(cx+12,cy+4); ctx.fill();
            // Text on can
            ctx.fillStyle = '#cc0000'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
            ctx.fillText('RED', cx, cy + 0); ctx.fillText('BULL', cx, cy + 9);
            ctx.fillStyle = '#ffaaaa'; ctx.font = 'bold 10px monospace';
            ctx.fillText('+25 CPU%', cx, sz - 4);
            break;
        }

        case 'ammo_bullets': { // SQL Queries — stacked DB cylinders
            _iconBg(ctx, cx, cy, sz * 0.46, '#001022');
            const dbCols = ['#0055bb', '#0077ee', '#33aaff'];
            const dbYs = [cy - 14, cy - 2, cy + 10];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = dbCols[i];
                ctx.fillRect(cx - 16, dbYs[i] - 4, 32, 10);
                ctx.beginPath(); ctx.ellipse(cx, dbYs[i] - 4, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#002255';
                ctx.beginPath(); ctx.ellipse(cx, dbYs[i] + 6, 16, 5, 0, 0, Math.PI); ctx.fill();
            }
            ctx.fillStyle = '#aaccff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText('SELECT *', cx, sz - 4);
            break;
        }

        case 'ammo_shells': { // API Calls — {} with arrows
            _iconBg(ctx, cx, cy, sz * 0.46, '#1a0f00');
            ctx.fillStyle = '#ff8800'; ctx.font = 'bold 38px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('{}', cx, cy - 6);
            ctx.textBaseline = 'alphabetic';
            // Arrow right
            ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx - 18, cy + 18); ctx.lineTo(cx + 18, cy + 18); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + 12, cy + 12); ctx.lineTo(cx + 18, cy + 18); ctx.lineTo(cx + 12, cy + 24); ctx.stroke();
            ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText('REST API', cx, sz - 4);
            break;
        }

        case 'ammo_rockets': { // Batch Jobs — spinning gear
            _iconBg(ctx, cx, cy, sz * 0.46, '#001500');
            // Gear teeth
            ctx.fillStyle = '#22aa22';
            for (let i = 0; i < 8; i++) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((i / 8) * Math.PI * 2);
                ctx.fillRect(-4, 16, 8, 8);
                ctx.restore();
            }
            // Gear disc
            ctx.fillStyle = '#33bb33';
            ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.fill();
            // Hole
            ctx.fillStyle = '#001500';
            ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
            // Spokes
            ctx.strokeStyle = '#22aa22'; ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
                const a = (i / 3) * Math.PI;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a)*6, cy + Math.sin(a)*6);
                ctx.lineTo(cx + Math.cos(a)*14, cy + Math.sin(a)*14);
                ctx.moveTo(cx - Math.cos(a)*6, cy - Math.sin(a)*6);
                ctx.lineTo(cx - Math.cos(a)*14, cy - Math.sin(a)*14);
                ctx.stroke();
            }
            ctx.fillStyle = '#88ff88'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText('BATCH JOB', cx, sz - 4);
            break;
        }

        case 'armor': { // SLA Guarantee — shield
            _iconBg(ctx, cx, cy, sz * 0.46, '#00001a');
            // Shield
            ctx.fillStyle = '#1155dd';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 26);
            ctx.lineTo(cx + 20, cy - 14); ctx.lineTo(cx + 20, cy + 2);
            ctx.quadraticCurveTo(cx + 20, cy + 18, cx, cy + 28);
            ctx.quadraticCurveTo(cx - 20, cy + 18, cx - 20, cy + 2);
            ctx.lineTo(cx - 20, cy - 14); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#4477ff'; ctx.lineWidth = 2; ctx.stroke();
            // Text inside
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
            ctx.fillText('99.9%', cx, cy + 2);
            ctx.font = '8px monospace'; ctx.fillText('UPTIME', cx, cy + 14);
            ctx.fillStyle = '#88aaff'; ctx.font = 'bold 9px monospace';
            ctx.fillText('SLA ✓', cx, sz - 4);
            break;
        }

        case 'weapon_shotgun': { // Scatter Query — double barrel
            _iconBg(ctx, cx, cy, sz * 0.46, '#1a0800');
            // Two barrels
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(cx - 10, cy - 22, 10, 34); ctx.fillRect(cx + 2, cy - 22, 10, 34);
            // Barrel ends
            ctx.fillStyle = '#884400';
            ctx.fillRect(cx - 10, cy - 26, 10, 6); ctx.fillRect(cx + 2, cy - 26, 10, 6);
            // Stock
            ctx.fillStyle = '#774422';
            ctx.beginPath(); ctx.roundRect(cx - 14, cy + 10, 32, 12, 3); ctx.fill();
            // Guard
            ctx.fillStyle = '#996633';
            ctx.fillRect(cx - 14, cy + 6, 32, 6);
            // Scatter dots (visual joke — data points flying)
            ctx.fillStyle = '#ffcc44';
            const dots = [[-24,-28],[-30,-18],[-28,-8],[-32,-22],[-20,-32]];
            for (const [dx, dy] of dots) { ctx.beginPath(); ctx.arc(cx+dx, cy+dy, 2, 0, Math.PI*2); ctx.fill(); }
            ctx.fillStyle = '#ffbb44'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('SCATTER', cx, sz - 4);
            break;
        }

        case 'weapon_launcher': { // ETL Bazooka — rocket with pipeline
            _iconBg(ctx, cx, cy, sz * 0.46, '#001400');
            // Rocket nose
            ctx.fillStyle = '#ff3300';
            ctx.beginPath(); ctx.moveTo(cx+30,cy); ctx.lineTo(cx+16,cy-9); ctx.lineTo(cx+16,cy+9); ctx.fill();
            // Body
            ctx.fillStyle = '#22cc22';
            ctx.beginPath(); ctx.roundRect(cx-18, cy-9, 34, 18, 4); ctx.fill();
            // Fins
            ctx.fillStyle = '#118811';
            ctx.beginPath(); ctx.moveTo(cx-18,cy-9); ctx.lineTo(cx-30,cy-20); ctx.lineTo(cx-18,cy); ctx.fill();
            ctx.beginPath(); ctx.moveTo(cx-18,cy+9); ctx.lineTo(cx-30,cy+20); ctx.lineTo(cx-18,cy); ctx.fill();
            // Exhaust
            ctx.fillStyle = 'rgba(255,150,0,0.8)';
            ctx.beginPath(); ctx.ellipse(cx-22, cy, 8, 5, 0, 0, Math.PI*2); ctx.fill();
            // ETL text
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; ctx.fillText('ETL', cx, cy); ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#88ff88'; ctx.font = 'bold 8px monospace';
            ctx.fillText('BAZOOKA', cx, sz - 4);
            break;
        }

        case 'weapon_bfd': { // BFD 9000 — big data energy orb
            _iconBg(ctx, cx, cy, sz * 0.46, '#001a1a');
            // Outer glow rings
            ctx.strokeStyle = 'rgba(0,220,220,0.2)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI*2); ctx.stroke();
            ctx.strokeStyle = 'rgba(0,220,220,0.35)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI*2); ctx.stroke();
            // Orb
            ctx.fillStyle = '#00aacc';
            ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI*2); ctx.fill();
            // Sheen
            ctx.fillStyle = 'rgba(180,255,255,0.5)';
            ctx.beginPath(); ctx.ellipse(cx-6, cy-6, 8, 7, -0.5, 0, Math.PI*2); ctx.fill();
            // Lightning bolt
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(cx+3, cy-13); ctx.lineTo(cx-5, cy-1); ctx.lineTo(cx+1, cy-1);
            ctx.lineTo(cx-3, cy+13); ctx.lineTo(cx+8, cy-2); ctx.lineTo(cx+2, cy-2);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#00ffff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
            ctx.fillText('BFD 9000', cx, sz - 4);
            break;
        }

        case 'weapon_chainsaw': {
            _iconBg(ctx, cx, cy, sz * 0.46, '#1a0800');
            // Chain bar
            ctx.fillStyle = '#555';
            ctx.fillRect(cx - 22, cy - 4, 34, 8);
            ctx.fillStyle = '#888';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(cx - 18 + i * 7, cy - 8, 5, 5);
                ctx.fillRect(cx - 18 + i * 7, cy + 3, 5, 5);
            }
            // Motor body
            ctx.fillStyle = '#ff8800';
            ctx.beginPath(); ctx.roundRect(cx - 6, cy - 12, 18, 24, 3); ctx.fill();
            ctx.fillStyle = '#cc5500';
            ctx.beginPath(); ctx.roundRect(cx - 4, cy - 10, 14, 6, 2); ctx.fill();
            ctx.fillStyle = '#ff8800'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('KILL JOB', cx, sz - 4);
            break;
        }
        case 'weapon_super_shotgun': {
            _iconBg(ctx, cx, cy, sz * 0.46, '#1a0800');
            // Two barrels
            ctx.fillStyle = '#cc6600';
            ctx.fillRect(cx - 14, cy - 24, 10, 36); ctx.fillRect(cx + 2, cy - 24, 10, 36);
            ctx.fillStyle = '#884400';
            ctx.fillRect(cx - 14, cy - 28, 10, 6); ctx.fillRect(cx + 2, cy - 28, 10, 6);
            // Stock
            ctx.fillStyle = '#774422';
            ctx.beginPath(); ctx.roundRect(cx - 18, cy + 10, 36, 12, 3); ctx.fill();
            ctx.fillStyle = '#ff6600'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('COND FLOW', cx, sz - 4);
            break;
        }
        case 'weapon_chaingun': {
            _iconBg(ctx, cx, cy, sz * 0.46, '#0a1520');
            // Three barrels
            ctx.fillStyle = '#446688';
            ctx.fillRect(cx - 18, cy - 24, 8, 32); ctx.fillRect(cx - 5, cy - 24, 8, 32); ctx.fillRect(cx + 8, cy - 24, 8, 32);
            // Drum
            ctx.fillStyle = '#88aacc';
            ctx.beginPath(); ctx.arc(cx - 1, cy - 10, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#334455';
            ctx.beginPath(); ctx.arc(cx - 1, cy - 10, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#88aacc'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('WEBHOOK', cx, sz - 4);
            break;
        }
        case 'weapon_plasma': {
            _iconBg(ctx, cx, cy, sz * 0.46, '#001a10');
            // Barrel
            ctx.fillStyle = '#1a3a2a';
            ctx.fillRect(cx - 6, cy - 28, 12, 36);
            // Energy cell glow
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath(); ctx.arc(cx, cy - 10, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(0,255,170,0.5)';
            ctx.beginPath(); ctx.arc(cx, cy - 10, 16, 0, Math.PI * 2); ctx.fill();
            // Bolt
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(cx + 2, cy - 18); ctx.lineTo(cx - 4, cy - 8); ctx.lineTo(cx, cy - 8);
            ctx.lineTo(cx - 2, cy - 2); ctx.lineTo(cx + 6, cy - 12); ctx.lineTo(cx + 2, cy - 12);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#00ffaa'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('STREAM', cx, sz - 4);
            break;
        }
        case 'ammo_energy': {
            _iconBg(ctx, cx, cy, sz * 0.46, '#001510');
            // Energy crystal
            ctx.fillStyle = '#00cc88';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 22); ctx.lineTo(cx + 12, cy - 5); ctx.lineTo(cx + 8, cy + 14);
            ctx.lineTo(cx - 8, cy + 14); ctx.lineTo(cx - 12, cy - 5);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(0,255,170,0.5)';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 8, cy - 4); ctx.lineTo(cx - 8, cy - 4);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#00ffaa'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
            ctx.fillText('CREDITS', cx, sz - 4);
            break;
        }

        default: {
            _iconBg(ctx, cx, cy, sz * 0.46, '#111111');
            ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; ctx.fillText('?', cx, cy); ctx.textBaseline = 'alphabetic';
        }
    }
}

// ─── Projectile ───────────────────────────────────────────────────────────────

const PROJ_COLORS = {
    player_normal: [1.0, 0.9, 0.2],
    player_rocket: [0.2, 1.0, 0.2],
    player_bfd:    [0.0, 0.9, 0.9],
    enemy:         [1.0, 0.3, 0.0],
};

let _projSerial = 0;

export class Projectile {
    constructor(x, y, dx, dy, damage, owner, scene, splashRadius = 0, speed = 0.25) {
        this.x            = x;
        this.y            = y;
        this.dx           = dx * speed;
        this.dy           = dy * speed;
        this.damage       = damage;
        this.owner        = owner;
        this.splashRadius = splashRadius;
        this.removed      = false;
        this._scene       = scene;

        if (scene) this._createMesh(scene, owner, splashRadius);
    }

    _createMesh(scene, owner, splash) {
        const id   = ++_projSerial;
        const size = splash > 2 ? 0.26 : splash > 0 ? 0.16 : 0.11;

        this.mesh = BABYLON.MeshBuilder.CreateSphere(`proj_${id}`, { diameter: size, segments: 4 }, scene);
        this.mesh.position   = new BABYLON.Vector3(this.x, 0.5, this.y);
        this.mesh.isPickable = false;

        const rgb = owner === 'enemy' ? PROJ_COLORS.enemy
                  : splash > 2       ? PROJ_COLORS.player_bfd
                  : splash > 0       ? PROJ_COLORS.player_rocket
                  :                    PROJ_COLORS.player_normal;

        const mat = new BABYLON.StandardMaterial(`pm_${id}`, scene);
        mat.emissiveColor = new BABYLON.Color3(rgb[0], rgb[1], rgb[2]);
        this.mesh.material = mat;
    }

    update(dt, map) {
        if (this.removed) return;
        const scale = dt / 16;
        const nx    = this.x + this.dx * scale;
        const ny    = this.y + this.dy * scale;

        if (isWall(map, nx, ny)) { this._disposeIfNoSplash(); return; }
        this.x = nx;
        this.y = ny;
        if (this.mesh) { this.mesh.position.x = this.x; this.mesh.position.z = this.y; }
    }

    _disposeIfNoSplash() {
        this.removed = true;
        if (this.mesh && this.splashRadius === 0) {
            this.mesh.material?.dispose();
            this.mesh.dispose();
            this.mesh = null;
        }
    }

    disposeMesh() {
        if (this.mesh) { this.mesh.material?.dispose(); this.mesh.dispose(); this.mesh = null; }
    }
}

// ─── TableEvent ───────────────────────────────────────────────────────────────
// Slowly drifts toward the trigger_boss. Player must intercept it to deal damage.
// If it reaches the boss, the boss fires a barrage.

const _TABLE_NAMES_FOR_EVENTS = [
    'in.c-staging.orders', 'in.c-staging.users', 'in.c-staging.events',
    'in.c-raw.clicks', 'in.c-raw.sessions', 'in.c-staging.products',
    'in.c-raw.api_logs', 'in.c-staging.transactions',
];

export class TableEvent {
    constructor(x, y, targetX, targetY, scene) {
        this.x       = x;
        this.y       = y;
        this.removed = false;
        this._scene  = scene;
        this._tableName = _TABLE_NAMES_FOR_EVENTS[
            Math.floor(Math.random() * _TABLE_NAMES_FOR_EVENTS.length)
        ];

        const dx  = targetX - x;
        const dy  = targetY - y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const speed = 0.022;  // slow enough to intercept
        this.dx = (dx / len) * speed;
        this.dy = (dy / len) * speed;

        if (scene) this._createMesh(scene);
    }

    _createMesh(scene) {
        const id = ++_projSerial;
        this._meshId = id;

        // Glowing cyan cube
        this.mesh = BABYLON.MeshBuilder.CreateBox(`tevt_${id}`, { size: 0.28 }, scene);
        this.mesh.position   = new BABYLON.Vector3(this.x, 0.5, this.y);
        this.mesh.isPickable = false;

        const mat = new BABYLON.StandardMaterial(`tevm_${id}`, scene);
        mat.emissiveColor = new BABYLON.Color3(0.0, 1.0, 0.9);
        this.mesh.material = mat;

        // Label billboard
        const sz = 256;
        const labelTex = new BABYLON.DynamicTexture(`tevl_${id}`, { width: sz, height: 32 }, scene, false);
        labelTex.hasAlpha = true;
        const ctx = labelTex.getContext();
        ctx.clearRect(0, 0, sz, 32);
        ctx.fillStyle = 'rgba(0,20,20,0.85)';
        ctx.fillRect(0, 0, sz, 32);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, sz - 2, 30);
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Table update', sz / 2, 21);
        labelTex.update();

        this.labelMesh = BABYLON.MeshBuilder.CreatePlane(`tevlm_${id}`, { width: 1.4, height: 0.18 }, scene);
        this.labelMesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        this.labelMesh.position      = new BABYLON.Vector3(this.x, 0.85, this.y);
        this.labelMesh.isPickable    = false;

        const lmat = new BABYLON.StandardMaterial(`tevlmat_${id}`, scene);
        lmat.diffuseTexture             = labelTex;
        lmat.diffuseTexture.hasAlpha    = true;
        lmat.useAlphaFromDiffuseTexture = true;
        lmat.emissiveColor              = new BABYLON.Color3(1, 1, 1);
        lmat.backFaceCulling            = false;
        this.labelMesh.material         = lmat;
        this._labelTex = labelTex;
    }

    update(dt, map) {
        if (this.removed) return;
        const scale = dt / 16;
        const nx = this.x + this.dx * scale;
        const ny = this.y + this.dy * scale;
        if (isWall(map, nx, ny)) { this.dispose(); return; }
        this.x = nx;
        this.y = ny;
        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.z = this.y;
            this.mesh.rotation.y += dt * 0.003;
        }
        if (this.labelMesh) {
            this.labelMesh.position.x = this.x;
            this.labelMesh.position.z = this.y;
        }
    }

    dispose() {
        this.removed = true;
        if (this._labelTex) { this._labelTex.dispose(); this._labelTex = null; }
        if (this.labelMesh) { this.labelMesh.material?.dispose(); this.labelMesh.dispose(); this.labelMesh = null; }
        if (this.mesh)      { this.mesh.material?.dispose(); this.mesh.dispose(); this.mesh = null; }
    }
}

// ─── BusinessRequirement ─────────────────────────────────────────────────────
// Fired by The Stakeholder toward the player.
// KAI Assistant projectile that hits it converts it to a friendly Dashboard.
// Any other projectile just destroys it. Reaching the player deals damage.

let _bizReqSerial = 0;

export class BusinessRequirement {
    constructor(x, y, targetPlayer, scene, speed = 0.085, damage = 18) {
        this.x       = x;
        this.y       = y;
        this.damage  = damage;
        this.removed = false;
        this._scene  = scene;
        this._text   = _BIZ_REQ_TEXTS[Math.floor(Math.random() * _BIZ_REQ_TEXTS.length)];

        const dx  = targetPlayer.x - x;
        const dy  = targetPlayer.y - y;
        const len = Math.sqrt(dx * dx + dy * dy);
        this.dx = len > 0.01 ? (dx / len) * speed : 0;
        this.dy = len > 0.01 ? (dy / len) * speed : speed;

        if (scene) this._createMesh(scene);
    }

    _createMesh(scene) {
        const id = ++_bizReqSerial;
        this._id = id;

        const sz  = 128;
        const tex = new BABYLON.DynamicTexture(`brq_tex_${id}`, { width: sz, height: sz }, scene, false);
        tex.hasAlpha = true;
        const ctx = tex.getContext();
        ctx.save(); ctx.scale(2, 2);
        _drawBizReqSprite(ctx, this._text);
        ctx.restore();
        tex.update();
        this._tex = tex;

        this.mesh = BABYLON.MeshBuilder.CreatePlane(`bizreq_${id}`, { width: 0.52, height: 0.52 }, scene);
        this.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        this.mesh.position      = new BABYLON.Vector3(this.x, 0.5, this.y);
        this.mesh.isPickable    = false;

        const mat = new BABYLON.StandardMaterial(`brq_mat_${id}`, scene);
        mat.diffuseTexture             = tex;
        mat.diffuseTexture.hasAlpha    = true;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor              = new BABYLON.Color3(1, 0.15, 0.25);
        mat.backFaceCulling            = false;
        this.mesh.material             = mat;
    }

    update(dt, map) {
        if (this.removed) return;
        const scale = dt / 16;
        const nx = this.x + this.dx * scale;
        const ny = this.y + this.dy * scale;
        if (isWall(map, nx, ny)) { this.dispose(); return; }
        this.x = nx;
        this.y = ny;
        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.z = this.y;
        }
    }

    dispose() {
        this.removed = true;
        if (this._tex)  { this._tex.dispose(); this._tex = null; }
        if (this.mesh)  { this.mesh.material?.dispose(); this.mesh.dispose(); this.mesh = null; }
    }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Friendly ally created when a KAI Assistant projectile converts a BusinessRequirement.
// Seeks The Stakeholder, stays in range, and fires at it periodically.
// Dashboards are the only entities that can damage The Stakeholder.

let _dashboardSerial = 0;

class Dashboard {
    constructor(x, y, scene) {
        this.x       = x;
        this.y       = y;
        this.removed = false;
        this._scene  = scene;
        this._name   = _DASHBOARD_NAMES[Math.floor(Math.random() * _DASHBOARD_NAMES.length)];
        this._fireTimer  = 1500 + Math.random() * 1000;
        this._fireRate   = 2200;
        this._damage     = 45;
        this._speed      = 0.018;
        this._attackRange = 7;

        if (scene) this._createMesh(scene);
    }

    _createMesh(scene) {
        const id = ++_dashboardSerial;
        this._id = id;

        const sz  = 128;
        const tex = new BABYLON.DynamicTexture(`dash_tex_${id}`, { width: sz, height: sz }, scene, false);
        const ctx = tex.getContext();
        ctx.save(); ctx.scale(2, 2);
        _drawDashboardSprite(ctx, this._name);
        ctx.restore();
        tex.update();
        this._tex = tex;

        this.mesh = BABYLON.MeshBuilder.CreatePlane(`dashboard_${id}`, { width: 0.7, height: 0.7 }, scene);
        this.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        this.mesh.position      = new BABYLON.Vector3(this.x, 0.5, this.y);
        this.mesh.isPickable    = false;

        const mat = new BABYLON.StandardMaterial(`dash_mat_${id}`, scene);
        mat.diffuseTexture  = tex;
        mat.emissiveColor   = new BABYLON.Color3(0, 0.7, 0.4);
        mat.backFaceCulling = false;
        this.mesh.material  = mat;
    }

    update(dt, enemies, map, projectiles) {
        if (this.removed) return;

        const boss = enemies.find(e => e.isAlive() && e.def.id === 'stakeholder_boss');
        if (!boss) {
            // No boss — gently hover in place
            if (this.mesh) this.mesh.rotation.y += dt * 0.001;
            return;
        }

        const dx   = boss.x - this.x;
        const dy   = boss.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this._attackRange) {
            // Move toward boss
            const speed = this._speed * (dt / 16);
            const mx = (dx / dist) * speed;
            const my = (dy / dist) * speed;
            if (!isWall(map, this.x + mx + Math.sign(mx) * 0.2, this.y)) this.x += mx;
            if (!isWall(map, this.x, this.y + my + Math.sign(my) * 0.2)) this.y += my;
        } else {
            // In range — fire at boss
            this._fireTimer -= dt;
            if (this._fireTimer <= 0 && dist > 0.1) {
                this._fireTimer = this._fireRate;
                projectiles.push(new Projectile(
                    this.x + (dx / dist) * 0.5,
                    this.y + (dy / dist) * 0.5,
                    dx / dist, dy / dist,
                    this._damage, 'ally',
                    this._scene, 0, 0.28,
                ));
            }
        }

        if (this.mesh) {
            this.mesh.position.x = this.x;
            this.mesh.position.z = this.y;
            this.mesh.rotation.y += dt * 0.0012;
        }
    }

    dispose() {
        this.removed = true;
        if (this._tex)  { this._tex.dispose(); this._tex = null; }
        if (this.mesh)  { this.mesh.material?.dispose(); this.mesh.dispose(); this.mesh = null; }
    }
}

// ─── ColumnBlock ──────────────────────────────────────────────────────────────

const L2_TYPE_COLORS = {
    INT:     '#4488ff',
    VARCHAR: '#ff8844',
    BOOLEAN: '#44cc44',
    FLOAT:   '#ffcc00',
    DATE:    '#cc44ff',
};

class ColumnBlock {
    constructor(scene, colDef, x, y) {
        this.columnName = colDef.name;
        this.columnType = colDef.type;
        this.x = x;
        this.y = y;
        this._scene = scene;

        const sz = 128;
        this._tex = new BABYLON.DynamicTexture(`col_tex_${colDef.name}`, { width: sz, height: sz * 2 }, scene, false);
        this._drawTexture();

        this.mesh = BABYLON.MeshBuilder.CreateBox(`col_${colDef.name}`, { width: 0.6, height: 1.1, depth: 0.6 }, scene);
        this.mesh.position = new BABYLON.Vector3(x, 0.55, y);
        const mat = new BABYLON.StandardMaterial(`col_mat_${colDef.name}`, scene);
        mat.diffuseTexture = this._tex;
        mat.backFaceCulling = false;
        this.mesh.material = mat;
    }

    _drawTexture() {
        const ctx = this._tex.getContext();
        const W = 128, H = 256;
        const color = L2_TYPE_COLORS[this.columnType] ?? '#ffffff';

        ctx.clearRect(0, 0, W, H);

        // Babylon.js box UV maps textures flipped on both axes — draw rotated 180°
        ctx.save();
        ctx.translate(W, H);
        ctx.scale(-1, -1);

        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(0, 0, W, H);

        // Header bar
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, W, 36);

        // Column name in header
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.columnName, W / 2, 24);

        // Divider
        ctx.fillStyle = color;
        ctx.fillRect(0, 40, W, 2);

        // Type label
        ctx.fillStyle = color;
        ctx.font = 'bold 18px monospace';
        ctx.fillText(this.columnType, W / 2, 80);

        // Schema label
        ctx.fillStyle = '#888888';
        ctx.font = '11px monospace';
        ctx.fillText('NOT NULL', W / 2, 110);

        // Arrow pointing down toward incoming records
        ctx.fillStyle = color;
        ctx.font = 'bold 20px monospace';
        ctx.fillText('▼', W / 2, 160);

        ctx.restore();
        ctx.textAlign = 'left';
        this._tex.update();
    }

    dispose() {
        this._tex.dispose();
        this.mesh.material?.dispose();
        this.mesh.dispose();
    }
}

// ─── RecordBlock ──────────────────────────────────────────────────────────────

class RecordBlock {
    constructor(scene, targetColumn, value, startType, id) {
        this.targetColumn = targetColumn;
        this.value        = value;
        this.currentType  = startType;
        this.x            = targetColumn.x + (Math.random() - 0.5) * 0.4;
        this.y            = 13.5;
        this._alive       = true;
        this._id          = id;
        this._scene       = scene;

        const sz = 128;
        this._tex = new BABYLON.DynamicTexture(`rec_tex_${id}`, { width: sz, height: sz }, scene, false);
        this._drawTexture();

        this.mesh = BABYLON.MeshBuilder.CreateBox(`rec_${id}`, { width: 0.55, height: 0.55, depth: 0.55 }, scene);
        this.mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
        this.mesh.position = new BABYLON.Vector3(this.x, 0.45, this.y);
        const mat = new BABYLON.StandardMaterial(`rec_mat_${id}`, scene);
        mat.diffuseTexture = this._tex;
        mat.backFaceCulling = false;
        this.mesh.material = mat;
    }

    _drawTexture() {
        const ctx = this._tex.getContext();
        const W = 128, H = 128;
        const color = L2_TYPE_COLORS[this.currentType] ?? '#ffffff';

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(0, 0, W, H);

        // Colored border strip on left
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 5, H);

        // Value text
        ctx.fillStyle = '#ffff88';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.value, W / 2 + 2, 42);

        // Divider
        ctx.fillStyle = '#333333';
        ctx.fillRect(8, 56, W - 10, 1);

        // Type label (colored, large)
        ctx.fillStyle = color;
        ctx.font = 'bold 16px monospace';
        ctx.fillText(this.currentType, W / 2 + 2, 88);

        // Target column indicator
        ctx.fillStyle = '#666666';
        ctx.font = '10px monospace';
        ctx.fillText('→ ' + this.targetColumn.columnName, W / 2 + 2, 112);

        ctx.textAlign = 'left';
        this._tex.update();
    }

    cycle() {
        const idx = L2_DATA_TYPES.indexOf(this.currentType);
        this.currentType = L2_DATA_TYPES[(idx + 1) % L2_DATA_TYPES.length];
        this._drawTexture();
    }

    update(dt) {
        this.y -= L2_RECORD_SPEED * dt;
        this.mesh.position.z = this.y;
    }

    dispose() {
        this._tex.dispose();
        this.mesh.material?.dispose();
        this.mesh.dispose();
        this._alive = false;
    }
}

// ─── EntityManager ────────────────────────────────────────────────────────────

export class EntityManager {
    constructor(level, audio, scene, difficulty = 1) {
        this._map        = level.map;
        this._audio      = audio;
        this._scene      = scene;
        this.enemies     = [];
        this.items       = [];
        this.projectiles = [];
        this._scoreQueue    = 0;
        this._bossDead      = false;
        this._deadPool      = [];
        this._difficulty    = difficulty;
        this._hadBoss       = false;
        this.tableEvents         = [];
        this.businessRequirements = [];
        this.dashboards           = [];
        this._stakeholderMode     = level.mode === 'stakeholder_fight';
        this._pendingMessage = null;
        // L2 Type Cast mode state
        this._l2Mode         = level.mode === 'type_cast';
        this._l2Columns      = [];
        this._l2Records      = [];
        this._l2TotalRecords = 0;
        this._l2Inserted     = 0;
        this._l2SpawnTimer   = 0;
        this._l2SpawnIdx     = 0;
        this._l2Mismatch     = false;
        this._l2MismatchMsg  = '';
        this._l2SpawnList    = [];

        const DAMAGE_MULT = [0.6, 1.0, 1.4];
        const damageMult  = DAMAGE_MULT[difficulty] ?? 1.0;

        for (const spawn of level.entitySpawns) {
            if (spawn.type === 'enemy') {
                if ((spawn.minDifficulty ?? 0) <= difficulty) {
                    const e = new Enemy(spawn.kind, spawn.x, spawn.y, scene, damageMult);
                    if (e._abilityCtrl) e._abilityCtrl._em = this;
                    this.enemies.push(e);
                    if (ENEMY_TYPES[spawn.kind]?.isBoss) this._hadBoss = true;
                }
            } else if (spawn.type === 'item') {
                this.items.push(new Item(spawn.kind, spawn.x, spawn.y, scene));
            }
        }
        if (this._l2Mode) this._initL2Mode(difficulty);
    }

    getMap() { return this._map; }

    _spawnEnemy(kind, x, y) {
        const damageMult = [0.6, 1.0, 1.4][this._difficulty] ?? 1.0;
        const e = new Enemy(kind, x, y, this._scene, damageMult);
        if (e._abilityCtrl) { e._abilityCtrl._em = this; }
        this.enemies.push(e);
    }

    _spawnEnemyProjectile(x, y, dx, dy, damage, speed = 0.25) {
        this.projectiles.push(new Projectile(x, y, dx, dy, damage, 'enemy', this._scene, 0, speed));
    }

    _spawnTableEvent(x, y, targetX, targetY) {
        this.tableEvents.push(new TableEvent(x, y, targetX, targetY, this._scene));
    }

    _spawnBusinessRequirement(x, y, player, def) {
        this.businessRequirements.push(new BusinessRequirement(
            x, y, player, this._scene,
            def.bossReqSpeed ?? 0.085,
            def.bossReqDamage ?? 18,
        ));
    }

    _convertToDashboard(x, y) {
        this.dashboards.push(new Dashboard(x, y, this._scene));
        if (this._audio) this._audio.play('pickup_weapon');
    }

    getDashboardCount() { return this.dashboards.length; }

    _initL2Mode(difficulty) {
        const colXs = [2.5, 4.5, 7.5, 10.5, 13.5];
        for (let i = 0; i < L2_COLUMN_DEFS.length; i++) {
            this._l2Columns.push(new ColumnBlock(this._scene, L2_COLUMN_DEFS[i], colXs[i], 2.5));
        }

        this._l2TotalRecords = L2_RECORDS_BY_DIFFICULTY[difficulty] ?? 10;

        // Pre-build spawn list
        const VALUES = {
            INT:     ['42', '1337', '0', '404', '9999', '7', '256'],
            VARCHAR: ["'Alice'", "'Bob'", "'NULL'", "'data'", "'hello'"],
            BOOLEAN: ['true', 'false', 'true', 'false'],
            FLOAT:   ['3.14', '99.9', '0.001', '1.5', '42.0'],
            DATE:    ["'2024-01-01'", "'NOW()'", "'2023-12-31'"],
        };
        for (let i = 0; i < this._l2TotalRecords; i++) {
            const colIdx    = i % L2_COLUMN_DEFS.length;
            const colDef    = L2_COLUMN_DEFS[colIdx];
            const vals      = VALUES[colDef.type];
            const value     = vals[i % vals.length];
            const startType = L2_DATA_TYPES[Math.floor(Math.random() * L2_DATA_TYPES.length)];
            this._l2SpawnList.push({ colIdx, value, startType });
        }
    }

    _updateL2Mode(dt, player) {
        const maxConcurrent = L2_MAX_CONCURRENT[this._difficulty] ?? 2;
        const spawnInterval = L2_SPAWN_INTERVALS[this._difficulty] ?? 5000;

        this._l2SpawnTimer += dt;
        if (this._l2SpawnTimer >= spawnInterval &&
            this._l2Records.length < maxConcurrent &&
            this._l2SpawnIdx < this._l2TotalRecords) {
            const spec   = this._l2SpawnList[this._l2SpawnIdx++];
            const col    = this._l2Columns[spec.colIdx];
            const rec    = new RecordBlock(this._scene, col, spec.value, spec.startType, this._l2SpawnIdx);
            this._l2Records.push(rec);
            this._l2SpawnTimer = 0;
        }

        const toRemove = [];
        for (const rec of this._l2Records) {
            rec.update(dt);

            const dx = rec.x - rec.targetColumn.x;
            const dy = rec.y - rec.targetColumn.y;
            if (dx * dx + dy * dy < L2_COLUMN_HIT_R2) {
                if (rec.currentType === rec.targetColumn.columnType) {
                    this._l2Inserted++;
                    this._scoreQueue += 500;
                    this._pendingMessage = `INSERT OK: ${rec.value}::${rec.currentType} → ${rec.targetColumn.columnName}`;
                } else {
                    this._l2Mismatch    = true;
                    this._l2MismatchMsg = `TYPE MISMATCH: column '${rec.targetColumn.columnName}' expects ${rec.targetColumn.columnType}, got ${rec.currentType}`;
                    player.takeDamage(9999);
                }
                rec.dispose();
                toRemove.push(rec);
            }
        }
        this._l2Records = this._l2Records.filter(r => !toRemove.includes(r));
    }

    _castCanonFire(player) {
        const dx = player.dirX;
        const dy = player.dirY;
        const STEP = 0.08;
        const MAX_STEPS = Math.ceil(30 / STEP);

        let tx = player.x + dx * 0.4;
        let ty = player.y + dy * 0.4;

        for (let i = 0; i < MAX_STEPS; i++) {
            tx += dx * STEP;
            ty += dy * STEP;
            if (isWall(this._map, tx, ty)) break;

            for (const rec of this._l2Records) {
                const ex = rec.x - tx;
                const ey = rec.y - ty;
                if (ex * ex + ey * ey < L2_CAST_HIT_R2) {
                    rec.cycle();
                    if (this._audio) this._audio.play('cast_hit');
                    return;
                }
            }
        }
    }

    _hitTableEvent(evt, _weaponDamage) {
        // Player intercepted a table event — damage the immune boss and remove the event.
        // Damage is always maxHP/6 so it takes exactly 6 interceptions to kill the boss,
        // regardless of which weapon the player used.
        evt.dispose();
        this._scoreQueue += 100;
        for (const enemy of this.enemies) {
            if (enemy.def.immuneToDirect && enemy.isAlive()) {
                const dmg = Math.ceil(enemy.def.health / 6);
                enemy.takeDamage(dmg, this._audio, true);
                if (!enemy.isAlive()) this._scoreQueue += enemy.score;
                break;
            }
        }
        if (this._audio) this._audio.play('enemy_alert');
    }

    _reviveRandomDead(audio) {
        // Spawn a new zombie near the dead zone of the map
        const dead = this._deadPool;
        if (!dead || dead.length === 0) return;
        const src = dead[Math.floor(Math.random() * dead.length)];
        this._spawnEnemy('data_zombie', src.x + (Math.random() - 0.5) * 2, src.y + (Math.random() - 0.5) * 2);
        if (audio) audio.play('enemy_alert');
    }

    firePlayerWeapon(player, def) {
        if (def.dropAll) {
            for (const enemy of this.enemies) {
                if (!enemy.isAlive()) continue;
                if (enemy.def.isBoss) continue;  // bosses survive DROP ALL TABLES
                enemy.takeDamage(def.damage, this._audio);
                if (!enemy.isAlive()) this._scoreQueue += enemy.score;
            }
            return;
        }
        if (def.hitscanCast) { this._castCanonFire(player); return; }
        if (def.melee)     { this._meleeFire(player, def);   return; }
        if (def.pellets)   { this._shotgunFire(player, def); return; }
        if (def.projectile) {
            const proj = new Projectile(
                player.x + player.dirX * 0.5,
                player.y + player.dirY * 0.5,
                player.dirX, player.dirY,
                def.damage, 'player',
                this._scene,
                def.splashRadius ?? 0,
                def.projSpeed ?? 0.25,
            );
            if (def.id === 'kai_assistant') proj.isKai = true;
            this.projectiles.push(proj);
            return;
        }
        this._hitscanFire(player, def, player.dirX, player.dirY);
    }

    _hitscanFire(player, def, dx, dy) {
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return;
        dx /= len; dy /= len;

        const STEP     = 0.08;
        const HIT_R2   = 0.36;
        const MAX_STEPS = Math.ceil(30 / STEP);

        let tx = player.x + dx * 0.4;
        let ty = player.y + dy * 0.4;

        for (let i = 0; i < MAX_STEPS; i++) {
            tx += dx * STEP;
            ty += dy * STEP;
            if (isWall(this._map, tx, ty)) break;
            // Check table events first — intercepting one damages the immune boss
            for (const evt of this.tableEvents) {
                if (evt.removed) continue;
                const ex = evt.x - tx;
                const ey = evt.y - ty;
                if (ex * ex + ey * ey < HIT_R2) {
                    this._hitTableEvent(evt, def.damage);
                    return;
                }
            }
            for (const enemy of this.enemies) {
                if (!enemy.isAlive()) continue;
                const ex = enemy.x - tx;
                const ey = enemy.y - ty;
                if (ex * ex + ey * ey < HIT_R2) {
                    if (enemy.def.immuneToAll) {
                        this._pendingMessage = 'Player fire has no effect. Convert requirements with KAI Assistant to spawn Dashboards.';
                        return;
                    }
                    if (enemy.def.immuneToDirect) {
                        this._pendingMessage = "You can't kill triggered flows. You must kill all update events.";
                        return;
                    }
                    enemy.takeDamage(def.damage, this._audio);
                    if (!enemy.isAlive()) this._scoreQueue += enemy.score;
                    return;
                }
            }
        }
    }

    _meleeFire(player, def) {
        for (const enemy of this.enemies) {
            if (!enemy.isAlive()) continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            if (Math.sqrt(dx * dx + dy * dy) < def.meleeRange) {
                const dot = dx * player.dirX + dy * player.dirY;
                if (dot > 0.3) {
                    enemy.takeDamage(def.damage, this._audio);
                    if (!enemy.isAlive()) this._scoreQueue += enemy.score;
                }
            }
        }
    }

    _shotgunFire(player, def) {
        for (let i = 0; i < def.pellets; i++) {
            const angle = (Math.random() - 0.5) * 2 * def.spread;
            const cos   = Math.cos(angle);
            const sin   = Math.sin(angle);
            const dx    = player.dirX * cos - player.dirY * sin;
            const dy    = player.dirX * sin + player.dirY * cos;
            this.projectiles.push(new Projectile(
                player.x + player.dirX * 0.5,
                player.y + player.dirY * 0.5,
                dx, dy,
                def.damage, 'player',
                this._scene,
                0,
                def.projSpeed ?? 0.5,
            ));
        }
    }

    update(dt, player) {
        if (this._l2Mode) this._updateL2Mode(dt, player);
        for (const e of this.enemies)     e.update(dt, player, this._map, this._audio, this.projectiles);
        for (const item of this.items)    item.update(dt);

        // Update table events and check if any reached an immune boss
        for (const evt of this.tableEvents) {
            evt.update(dt, this._map);
            if (!evt.removed) {
                for (const enemy of this.enemies) {
                    if (!enemy.def.immuneToDirect || !enemy.isAlive()) continue;
                    const dx = enemy.x - evt.x;
                    const dy = enemy.y - evt.y;
                    if (dx * dx + dy * dy < 0.64) {
                        // Event reached the boss — trigger barrage
                        if (enemy._abilityCtrl) {
                            enemy._abilityCtrl._onTableEventReceived(player, this._audio, enemy.def);
                        }
                        evt.dispose();
                        break;
                    }
                }
            }
        }
        this.tableEvents = this.tableEvents.filter(e => !e.removed);

        // ── Business requirements (stakeholder fight mode) ────────────────────
        if (this._stakeholderMode) {
            for (const br of this.businessRequirements) {
                br.update(dt, this._map);
                if (!br.removed) {
                    const bdx = player.x - br.x;
                    const bdy = player.y - br.y;
                    if (bdx * bdx + bdy * bdy < 0.22) {
                        player.takeDamage(br.damage);
                        this._audio.play('player_hurt');
                        br.dispose();
                    }
                }
            }
            this.businessRequirements = this.businessRequirements.filter(br => !br.removed);

            // Dashboards move and fire at boss
            for (const db of this.dashboards) {
                db.update(dt, this.enemies, this._map, this.projectiles);
            }
        }

        for (const p of this.projectiles) {
            const wasRemoved = p.removed;
            p.update(dt, this._map);
            const hitWall = !wasRemoved && p.removed;

            if (p.owner === 'ally') {
                // Dashboard projectile — only harms stakeholder_boss (bypasses immuneToAll)
                if (!p.removed) {
                    for (const enemy of this.enemies) {
                        if (!enemy.isAlive() || enemy.def.id !== 'stakeholder_boss') continue;
                        const dx = enemy.x - p.x;
                        const dy = enemy.y - p.y;
                        if (dx * dx + dy * dy < 0.25) {
                            enemy.takeDamage(p.damage, this._audio, false, true);
                            if (!enemy.isAlive()) this._scoreQueue += enemy.score;
                            p.removed = true; p.disposeMesh();
                            break;
                        }
                    }
                }
            } else if (p.owner === 'player') {
                let detonated = hitWall && p.splashRadius > 0;

                // Check player projectile hitting a table event
                if (!p.removed) {
                    for (const evt of this.tableEvents) {
                        if (evt.removed) continue;
                        const ex = evt.x - p.x;
                        const ey = evt.y - p.y;
                        if (ex * ex + ey * ey < 0.16) {
                            this._hitTableEvent(evt, p.damage);
                            p.removed = true; p.disposeMesh();
                            break;
                        }
                    }
                }

                // Check KAI projectile hitting a business requirement → convert to dashboard
                if (!p.removed && p.isKai && this._stakeholderMode) {
                    for (const br of this.businessRequirements) {
                        if (br.removed) continue;
                        const ex = br.x - p.x;
                        const ey = br.y - p.y;
                        if (ex * ex + ey * ey < 0.22) {
                            this._convertToDashboard(br.x, br.y);
                            this._pendingMessage = `Requirement converted! ${this.dashboards.length} dashboard${this.dashboards.length !== 1 ? 's' : ''} fighting for you.`;
                            this._scoreQueue += 300;
                            br.dispose();
                            p.removed = true; p.disposeMesh();
                            break;
                        }
                    }
                }

                if (!p.removed || hitWall) {
                    for (const enemy of this.enemies) {
                        if (!enemy.isAlive()) continue;
                        const dx = enemy.x - p.x;
                        const dy = enemy.y - p.y;
                        if (dx * dx + dy * dy < 0.16) {
                            if (enemy.def.immuneToAll) {
                                this._pendingMessage = 'Player fire has no effect. Convert requirements with KAI Assistant.';
                                p.removed = true; p.disposeMesh(); break;
                            }
                            if (enemy.def.immuneToDirect) {
                                this._pendingMessage = "You can't kill triggered flows. You must kill all update events.";
                                p.removed = true; p.disposeMesh(); break;
                            }
                            if (p.splashRadius === 0) {
                                enemy.takeDamage(p.damage, this._audio);
                                if (!enemy.isAlive()) this._scoreQueue += enemy.score;
                                p.removed = true; p.disposeMesh(); break;
                            } else {
                                detonated = true; p.removed = true; break;
                            }
                        }
                    }
                }

                if (detonated) {
                    p.disposeMesh();
                    spawnExplosion(p.x, p.y, p.splashRadius, this._scene);
                    for (const enemy of this.enemies) {
                        if (!enemy.isAlive()) continue;
                        if (enemy.def.immuneToAll || enemy.def.immuneToDirect) continue;
                        const dx = enemy.x - p.x;
                        const dy = enemy.y - p.y;
                        const d  = Math.sqrt(dx * dx + dy * dy);
                        if (d < p.splashRadius) {
                            enemy.takeDamage(_splashDmg(d, p.splashRadius, p.damage), this._audio);
                            if (!enemy.isAlive()) this._scoreQueue += enemy.score;
                        }
                    }
                    const pdx = player.x - p.x;
                    const pdy = player.y - p.y;
                    const pd  = Math.sqrt(pdx * pdx + pdy * pdy);
                    if (pd < p.splashRadius)
                        player.takeDamage(_splashDmg(pd, p.splashRadius, Math.floor(p.damage * 0.5)));
                }
            } else if (p.owner === 'enemy') {
                const dx = player.x - p.x;
                const dy = player.y - p.y;
                if (dx * dx + dy * dy < 0.16) {
                    player.takeDamage(p.damage);
                    this._audio.play('player_hurt');
                    p.removed = true; p.disposeMesh();
                }
            }
        }

        this.projectiles = this.projectiles.filter(p => !p.removed);
        this.enemies     = this.enemies.filter(e => {
            if (e.removed && !e.def.isBoss) {
                this._deadPool.push({ x: e.x, y: e.y, kind: e.def.id });
                if (this._deadPool.length > 10) this._deadPool.shift();
            }
            return !e.removed;
        });
        this.items       = this.items.filter(i => !i.removed);
    }

    checkPickups(player, weaponSystem) {
        for (const item of this.items) item.tryPickup(player, weaponSystem, this._audio);
    }

    bossDefeated() {
        if (this._bossDead === true) return true;
        const bosses = this.enemies.filter(e => e.def.isBoss);
        // Also count bosses that have been removed (dead and disposed)
        const activeBossCount = bosses.length;
        if (activeBossCount === 0 && this._deadPool.some(d => d.kind?.endsWith('_boss') || d.kind === 'aggregator_shard')) {
            // All bosses were spawned and are now dead/removed
            return this._hadBoss;
        }
        return bosses.length > 0 && bosses.every(e => !e.isAlive());
    }

    allEnemiesDefeated() {
        if (this._l2Mode) {
            return this._l2Inserted >= this._l2TotalRecords &&
                   this._l2SpawnIdx >= this._l2TotalRecords;
        }
        return this.bossDefeated();
    }

    popMessage() {
        const msg = this._pendingMessage;
        this._pendingMessage = null;
        return msg;
    }

    collectScore() {
        const s = this._scoreQueue;
        this._scoreQueue = 0;
        return s;
    }

    isTypeMismatch()       { return this._l2Mismatch; }
    getTypeMismatchMessage() { return this._l2MismatchMsg; }
    getL2Progress()        { return { inserted: this._l2Inserted, total: this._l2TotalRecords }; }

    dispose() {
        for (const e of this.enemies) {
            if (e.mesh)      { e.mesh.material?.dispose(); e.mesh.dispose(); }
            if (e._spriteTex) e._spriteTex.dispose();
        }
        for (const i of this.items) {
            if (i.mesh)      { i.mesh.material?.dispose(); i.mesh.dispose(); }
            if (i.labelMesh) { i.labelMesh.material?.dispose(); i.labelMesh.dispose(); }
        }
        for (const evt of this.tableEvents) evt.dispose();
        for (const br of this.businessRequirements) br.dispose();
        for (const db of this.dashboards) db.dispose();
        for (const p of this.projectiles) p.disposeMesh();
        this.enemies = []; this.items = []; this.projectiles = [];
        this.businessRequirements = []; this.dashboards = [];
        for (const col of (this._l2Columns ?? [])) col.dispose();
        for (const rec of (this._l2Records  ?? [])) rec.dispose();
        this._l2Columns = []; this._l2Records = [];
    }
}

function _splashDmg(dist, radius, maxDamage) {
    return Math.floor(maxDamage * (1 - dist / radius));
}
