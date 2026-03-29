// Entity system — Enemies, Items, Projectiles + EntityManager

import { ENEMY_TYPES, ITEM_TYPES, WEAPON_DEFS } from '../config.js';
import { isWall, hasLineOfSight } from '../engine/map.js';

// ─── Colors ───────────────────────────────────────────────────────────────────

const ENEMY_COLORS = {
    data_zombie:     [0.1, 0.8, 0.1],
    pipeline_demon:  [0.2, 0.3, 1.0],
    config_monster:  [1.0, 0.5, 0.0],
    server_boss:     [1.0, 0.1, 0.1],
    flow_specter:    [0.65, 0.2, 1.0],  // violet/purple
    sql_mutant:      [1.0,  0.72, 0.0], // amber
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
        this._scene       = scene;
        // Assign kind-appropriate label — tables for table enemies, flow names for flows
        this._tableName   = kind === 'flow_specter' ? _randomFlowName() : _randomTable();

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
        } else if (isBoss) {
            ctx.fillStyle = body;
            ctx.fillRect(8, 8, 48, 48);
            ctx.fillStyle = acc;
            ctx.fillRect(12, 12, 14, 14);
            ctx.fillRect(38, 12, 14, 14);
            ctx.fillRect(12, 40, 40, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(15, 17, 8, 5);
            ctx.fillRect(41, 17, 8, 5);
        } else {
            // Table-type enemies (data_zombie, pipeline_demon, config_monster) look like DB tables
            _drawTableSprite(ctx, body, acc, this._tableName);
        }

        ctx.restore();

        // ── Table name overlay — boss only (table enemies have name in their header) ──
        if (isBoss) {
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
        const hpLabel = kind === 'flow_specter' ? `${this.health} retries`
                      : kind === 'sql_mutant'   ? `${this.health}% scanned`
                      : `${this.health} rows`;
        ctx.fillStyle = '#ffffff';
        ctx.font      = `bold ${isBoss ? 9 : 7}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(hpLabel, sz / 2, barY + barH - 1);

        this._spriteTex.update();
    }

    isAlive() { return this.state !== STATE.DEAD; }

    takeDamage(amount, audio) {
        if (this.state === STATE.DEAD) return;
        this.health -= amount;
        this._hitFlash = 180;
        if (this.health <= 0) {
            this.health = 0;
            this.state  = STATE.DEAD;
            this.deathTimer = 600;
            this.score  = this.def.score;
            audio.play('enemy_death');
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
                    if (canSee) {
                        const ndx = dx / dist;
                        const ndy = dy / dist;
                        projectiles.push(new Projectile(
                            this.x + ndx * 0.6, this.y + ndy * 0.6,
                            ndx, ndy,
                            this.damage, 'enemy',
                            this._scene,
                            this.def.projSplash ?? 0,
                            this.def.projSpeed  ?? 0.2,
                        ));
                        audio.play('enemy_shoot');
                    }
                } else {
                    if (dist <= this.def.attackRange) {
                        player.takeDamage(this.damage);
                        audio.play('player_hurt');
                    }
                }
            }
            if (!this.def.isRanged) this._moveToward(dt * 0.3, player.x, player.y, map);
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

// ─── EntityManager ────────────────────────────────────────────────────────────

export class EntityManager {
    constructor(level, audio, scene, difficulty = 1) {
        this._map        = level.map;
        this._audio      = audio;
        this._scene      = scene;
        this.enemies     = [];
        this.items       = [];
        this.projectiles = [];
        this._scoreQueue = 0;
        this._bossDead   = false;

        const DAMAGE_MULT = [0.6, 1.0, 1.4];
        const damageMult  = DAMAGE_MULT[difficulty] ?? 1.0;

        for (const spawn of level.entitySpawns) {
            if (spawn.type === 'enemy') {
                if ((spawn.minDifficulty ?? 0) <= difficulty) {
                    this.enemies.push(new Enemy(spawn.kind, spawn.x, spawn.y, scene, damageMult));
                }
            } else if (spawn.type === 'item') {
                this.items.push(new Item(spawn.kind, spawn.x, spawn.y, scene));
            }
        }
    }

    getMap() { return this._map; }

    firePlayerWeapon(player, def) {
        if (def.melee)     { this._meleeFire(player, def);   return; }
        if (def.pellets)   { this._shotgunFire(player, def); return; }
        if (def.projectile) {
            this.projectiles.push(new Projectile(
                player.x + player.dirX * 0.5,
                player.y + player.dirY * 0.5,
                player.dirX, player.dirY,
                def.damage, 'player',
                this._scene,
                def.splashRadius ?? 0,
                def.projSpeed ?? 0.25,
            ));
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
            for (const enemy of this.enemies) {
                if (!enemy.isAlive()) continue;
                const ex = enemy.x - tx;
                const ey = enemy.y - ty;
                if (ex * ex + ey * ey < HIT_R2) {
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
        for (const e of this.enemies)     e.update(dt, player, this._map, this._audio, this.projectiles);
        for (const item of this.items)    item.update(dt);

        for (const p of this.projectiles) {
            const wasRemoved = p.removed;
            p.update(dt, this._map);
            const hitWall = !wasRemoved && p.removed;

            if (p.owner === 'player') {
                let detonated = hitWall && p.splashRadius > 0;

                if (!p.removed || hitWall) {
                    for (const enemy of this.enemies) {
                        if (!enemy.isAlive()) continue;
                        const dx = enemy.x - p.x;
                        const dy = enemy.y - p.y;
                        if (dx * dx + dy * dy < 0.16) {
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
        this.enemies     = this.enemies.filter(e => !e.removed);
        this.items       = this.items.filter(i => !i.removed);
    }

    checkPickups(player, weaponSystem) {
        for (const item of this.items) item.tryPickup(player, weaponSystem, this._audio);
    }

    bossDefeated() {
        return this.enemies.some(e => e.def.isBoss && !e.isAlive()) ||
               (this._bossDead === true);
    }

    allEnemiesDefeated() { return this.bossDefeated(); }

    collectScore() {
        const s = this._scoreQueue;
        this._scoreQueue = 0;
        return s;
    }

    dispose() {
        for (const e of this.enemies) {
            if (e.mesh)      { e.mesh.material?.dispose(); e.mesh.dispose(); }
            if (e._spriteTex) e._spriteTex.dispose();
        }
        for (const i of this.items) {
            if (i.mesh)      { i.mesh.material?.dispose(); i.mesh.dispose(); }
            if (i.labelMesh) { i.labelMesh.material?.dispose(); i.labelMesh.dispose(); }
        }
        for (const p of this.projectiles) p.disposeMesh();
        this.enemies = []; this.items = []; this.projectiles = [];
    }
}

function _splashDmg(dist, radius, maxDamage) {
    return Math.floor(maxDamage * (1 - dist / radius));
}
