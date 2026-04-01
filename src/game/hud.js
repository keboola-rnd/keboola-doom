// HUD — classic Doom-style status bar
// Drawn on a fullscreen 2D canvas overlay on top of the Babylon render canvas.

import { MINIMAP_CELL, MINIMAP_MARGIN, WEAPON_DEFS, MAX_AMMO } from '../config.js';

// Bar height in CSS pixels
const BAR_H = 90;

// Colors matching original Doom status bar palette
const C = {
    barBg:       '#3c2415',
    panelBg:     '#281808',
    panelHi:     '#6a4228',
    panelLo:     '#180c04',
    numYellow:   '#ffdd00',
    numRed:      '#cc1100',
    numGreen:    '#00cc44',
    numBlue:     '#4488ff',
    numDim:      '#443322',
    labelBrown:  '#aa8855',
    faceBoxBg:   '#2a1a0a',
    faceSkin:    '#d49060',
    faceHair:    '#3a1800',
    faceEye:     '#ffffff',
    facePupil:   '#1a1400',
    faceBlood:   '#880000',
    faceBloodBr: '#cc2200',
    faceTooth:   '#ddddcc',
    faceGum:     '#cc3322',
    armsOwned:   '#ccaa44',
    armsMissing: '#2a1a08',
};

// Weapon order for arms grid (skip fist=1)
const ARMS_ORDER  = ['chainsaw', 'sql_gun', 'data_shotgun', 'super_shotgun', 'chaingun', 'pipeline_launcher', 'plasma_rifle', 'kai_assistant', 'drop_all_tables'];
const ARMS_LABELS = ['2', '3', '4', '5', '6', '7', '8', '9', '0'];

const AMMO_ROWS = [
    { key: 'bullets', label: 'SQLS' },   // SQL queries
    { key: 'shells',  label: 'APIC' },   // API calls
    { key: 'rockets', label: 'BTCH' },   // batch jobs
    { key: 'energy',  label: 'CRDT' },   // Snowflake credits
    { key: 'tokens',  label: 'TOKN' },   // KAI LLM tokens
    { key: 'ddl',     label: 'DDL ' },   // DROP ALL TABLES operations
];

export class HUD {
    constructor() {
        this._showMinimap = true;
        // Face animation state
        this._faceDir   = 0;   // -1 left, 0 forward, 1 right
        this._faceTick  = 0;
        this._faceOuch  = 0;   // ouch expression timer
        this._faceRage  = 0;   // grin after kill timer
    }

    toggleMinimap() { this._showMinimap = !this._showMinimap; }

    // Called each frame; weaponSystem.isFiring() drives the grin
    notifyKill()   { this._faceRage  = 800; }
    notifyHurt()   { this._faceOuch  = 400; }

    draw(ctx, player, weaponSystem, score, killsLeft, enemies, missionId, missionName, elapsedSeconds) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;
        ctx.clearRect(0, 0, W, H);

        if (player.isHurt())        this._drawHurtFlash(ctx, player.hurtTimer, W, H);
        if (weaponSystem.hasFlash()) this._drawMuzzleFlash(ctx, weaponSystem.flashTimer, W, H);

        this._drawWeaponSprite(ctx, player, weaponSystem, W, H);
        this._drawBar(ctx, player, weaponSystem, score, killsLeft, W, H);
        this._drawScore(ctx, score, killsLeft, W, missionId);
        if (this._showMinimap)       this._drawMinimap(ctx, player, enemies);
        this._drawBossBar(ctx, enemies, W, H);
        if (missionId) this._drawMissionTag(ctx, missionId, missionName, W);
        this._drawTimer(ctx, elapsedSeconds, W);
    }

    // ── Full status bar ───────────────────────────────────────────────────────

    _drawBar(ctx, player, weaponSystem, score, killsLeft, W, H) {
        const Y = H - BAR_H;

        // ── Background ──
        ctx.fillStyle = C.barBg;
        ctx.fillRect(0, Y, W, BAR_H);

        // Top raised edge
        ctx.fillStyle = C.panelHi;
        ctx.fillRect(0, Y, W, 2);
        // Bottom shadow
        ctx.fillStyle = C.panelLo;
        ctx.fillRect(0, H - 2, W, 2);

        // ── Section positions ──
        const CX   = W / 2;
        const FACE_W = 76;
        const FACE_X = CX - FACE_W / 2;

        const ammoX   = 10;
        const hpX     = ammoX + 118;
        const armsX   = hpX  + 118;
        const faceX   = FACE_X;
        const armoX   = faceX + FACE_W + 12;
        const keysX   = armoX + 118;
        const tableX  = W - 168;

        // ── AMMO (current weapon) ──
        const def     = WEAPON_DEFS[player.activeWeapon];
        const curAmmo = def.ammoType ? (player.ammo[def.ammoType] ?? 0) : null;
        this._panel(ctx, ammoX, Y, 108, BAR_H);
        this._label(ctx, ammoX + 54, Y + 15, 'AMMO');
        this._bigNumber(ctx, ammoX + 8, Y + 20, curAmmo !== null ? String(curAmmo) : '---',
            curAmmo === null ? C.numDim :
            curAmmo === 0    ? C.numRed : C.numYellow);

        // ── HEALTH ──
        const hpColor = player.health > 60 ? C.numGreen
                      : player.health > 25  ? C.numYellow
                      :                       C.numRed;
        this._panel(ctx, hpX, Y, 108, BAR_H);
        this._label(ctx, hpX + 54, Y + 15, 'CPU%');
        this._bigNumber(ctx, hpX + 8, Y + 20, String(player.health), hpColor);
        ctx.fillStyle = C.labelBrown;
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('%', hpX + 93, Y + 66);

        // ── ARMS grid + active weapon name ──
        this._drawArms(ctx, armsX, Y, BAR_H, player, faceX);

        // ── FACE ──
        this._updateFace(player);
        this._drawFace(ctx, faceX, Y, FACE_W, BAR_H, player);

        // ── ARMOR ──
        const arColor = player.armor > 0 ? C.numBlue : C.numDim;
        this._panel(ctx, armoX, Y, 108, BAR_H);
        this._label(ctx, armoX + 54, Y + 15, 'SLA%');
        this._bigNumber(ctx, armoX + 8, Y + 20, String(player.armor), arColor);
        ctx.fillStyle = C.labelBrown;
        ctx.font = 'bold 16px Courier New';
        ctx.fillText('%', armoX + 93, Y + 66);

        // ── AMMO TABLE ──
        if (tableX > armoX + 125) {
            this._drawAmmoTable(ctx, tableX, Y, BAR_H, player);
        }
    }

    // ── Recessed panel ────────────────────────────────────────────────────────

    _panel(ctx, x, y, w, h) {
        const PAD = 4;
        ctx.fillStyle = C.panelLo;
        ctx.fillRect(x, y + PAD, w, h - PAD * 2);
        ctx.fillStyle = C.panelBg;
        ctx.fillRect(x + 1, y + PAD + 1, w - 2, h - PAD * 2 - 2);
        // Highlight top-left edge
        ctx.fillStyle = C.panelHi;
        ctx.fillRect(x, y + PAD, w, 1);
        ctx.fillRect(x, y + PAD, 1, h - PAD * 2);
    }

    // ── Label (small brown text) ──────────────────────────────────────────────

    _label(ctx, cx, y, text) {
        ctx.fillStyle = C.labelBrown;
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(text, cx, y);
        ctx.textAlign = 'left';
    }

    // ── Big doom-style number ─────────────────────────────────────────────────

    _bigNumber(ctx, x, y, text, color) {
        ctx.fillStyle = color;
        ctx.font = 'bold 42px Courier New';
        ctx.fillText(text, x, y + 48);
    }

    // ── ARMS grid (weapons owned) ─────────────────────────────────────────────

    _drawArms(ctx, x, y, h, player, faceX) {
        const w = 108;
        this._panel(ctx, x, y, w, h);

        ctx.font = 'bold 14px Courier New';
        const cols = 3;
        const cw = 30, rh = 24;   // 3 rows × 24px = 72, fits within BAR_H=90
        const ox = x + 8, oy = y + 12;

        for (let i = 0; i < ARMS_ORDER.length; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const wx  = ox + col * cw;
            const wy  = oy + row * rh;
            const id  = ARMS_ORDER[i];
            const owned  = player.hasWeapon(id);
            const active = player.activeWeapon === id;

            if (active) {
                ctx.fillStyle = '#554422';
                ctx.fillRect(wx - 2, wy - 2, cw - 4, rh - 4);
            }

            ctx.fillStyle = owned ? C.armsOwned : C.armsMissing;
            ctx.fillText(ARMS_LABELS[i], wx + 2, wy + 16);

            if (active) {
                ctx.strokeStyle = C.numYellow;
                ctx.lineWidth   = 1;
                ctx.strokeRect(wx - 2, wy - 2, cw - 4, rh - 4);
            }
        }

        // Active weapon name — to the right of the arms grid
        if (faceX !== undefined) {
            const def  = WEAPON_DEFS[player.activeWeapon];
            const name = def ? def.name : '';
            const nx   = x + w + 6;
            const nw   = faceX - nx - 6;
            if (nw > 30) {
                ctx.save();
                ctx.rect(nx, y + 4, nw, h - 8);
                ctx.clip();
                ctx.font = 'bold 11px Courier New';
                ctx.fillStyle = C.labelBrown;
                ctx.fillText('COMPONENT', nx, y + 16);
                ctx.font = 'bold 14px Courier New';
                ctx.fillStyle = C.numYellow;
                // Word-wrap: split on space and draw up to 2 lines
                const words = name.split(' ');
                let line1 = '', line2 = '';
                for (const w of words) {
                    const test = line1 ? line1 + ' ' + w : w;
                    if (ctx.measureText(test).width <= nw) { line1 = test; }
                    else { line2 = line2 ? line2 + ' ' + w : w; }
                }
                ctx.fillText(line1, nx, y + 34);
                if (line2) ctx.fillText(line2, nx, y + 52);
                ctx.restore();
            }
        }
    }

    // ── Keboola octopus face ──────────────────────────────────────────────────

    _updateFace(player) {
        this._faceTick += 16;
        if (this._faceOuch > 0) this._faceOuch -= 16;
        if (this._faceRage  > 0) this._faceRage  -= 16;

        if (this._faceTick % 900 < 16) {
            this._faceDir = [-1, 0, 0, 0, 1][Math.floor(Math.random() * 5)];
        }
        if (player.isHurt()) {
            this._faceOuch = 400;
            this._faceDir  = 0;
        }
    }

    _drawFace(ctx, x, y, fw, fh, player) {
        const hp   = player.health;
        const ouch = this._faceOuch > 0;
        const rage = this._faceRage > 0;
        const dead = hp <= 0;
        const god  = player.godMode;

        // Background box
        ctx.fillStyle = C.faceBoxBg;
        ctx.fillRect(x, y + 4, fw, fh - 8);
        ctx.fillStyle = C.panelLo;
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.panelLo;
        ctx.strokeRect(x, y + 4, fw, fh - 8);

        const cx = x + fw / 2;
        const cy = y + fh / 2 - 2;
        const sc = fw / 76;

        // Health-based body color: healthy=Keboola teal, hurt=darker, critical=grey-blue
        const bodyColor = dead   ? '#2a4455'
                        : hp < 25 ? '#005577'
                        : hp < 60 ? '#0077aa'
                        :           '#00aacc';
        const darkBody  = dead   ? '#1a2a33'
                        : hp < 25 ? '#003344'
                        :           '#005577';

        // ── Tentacles (drawn first, behind body) ──
        const tentCount = 6;
        const tentBaseY = cy + 14 * sc;
        const tentSpan  = 28 * sc;
        ctx.strokeStyle = dead ? '#1a3344' : (hp < 40 ? '#005577' : '#0099bb');
        ctx.lineWidth   = 3 * sc;
        ctx.lineCap     = 'round';
        for (let i = 0; i < tentCount; i++) {
            const t   = i / (tentCount - 1);
            const tx  = cx - tentSpan / 2 + t * tentSpan;
            const wobble = Math.sin(this._faceTick * 0.004 + i * 1.1) * 4 * sc;
            const curl  = dead ? 0 : (ouch ? -3 * sc : wobble);
            ctx.beginPath();
            ctx.moveTo(tx, tentBaseY);
            ctx.quadraticCurveTo(
                tx + curl, tentBaseY + 9 * sc,
                tx + curl * 1.5, tentBaseY + 16 * sc,
            );
            ctx.stroke();
        }

        // ── Body (round head) ──
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18 * sc, 20 * sc, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight spot (top-left sheen)
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx - 5 * sc, cy - 8 * sc, 6 * sc, 5 * sc, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // Low-health cracks / damage marks
        if (hp < 40) {
            ctx.strokeStyle = darkBody;
            ctx.lineWidth = 1.5 * sc;
            ctx.beginPath();
            ctx.moveTo(cx - 4 * sc, cy - 10 * sc);
            ctx.lineTo(cx - 2 * sc, cy - 4 * sc);
            ctx.lineTo(cx - 6 * sc, cy);
            ctx.stroke();
        }
        if (hp < 20) {
            ctx.beginPath();
            ctx.moveTo(cx + 6 * sc, cy - 8 * sc);
            ctx.lineTo(cx + 8 * sc, cy - 2 * sc);
            ctx.stroke();
        }

        // ── Eyes ──
        const eyeOff = this._faceDir * 3 * sc;
        const eyeR   = 6 * sc;
        const eyeLX  = cx - 9 * sc + eyeOff;
        const eyeRX  = cx + 9 * sc + eyeOff;
        const eyeY   = cy - 5 * sc;

        if (dead) {
            // X eyes
            ctx.strokeStyle = '#ff3300';
            ctx.lineWidth = 2 * sc;
            ctx.lineCap = 'round';
            for (const ex of [eyeLX, eyeRX]) {
                ctx.beginPath(); ctx.moveTo(ex - 4*sc, eyeY - 4*sc); ctx.lineTo(ex + 4*sc, eyeY + 4*sc); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(ex + 4*sc, eyeY - 4*sc); ctx.lineTo(ex - 4*sc, eyeY + 4*sc); ctx.stroke();
            }
        } else if (ouch) {
            // Squinting — flat arcs
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5 * sc;
            ctx.lineCap = 'round';
            for (const ex of [eyeLX, eyeRX]) {
                ctx.beginPath();
                ctx.arc(ex, eyeY + 2 * sc, eyeR * 0.7, Math.PI, 0);
                ctx.stroke();
            }
        } else {
            // Normal round eyes — white or bloodshot in god mode
            const scleraPulse = god ? 0.5 + 0.5 * Math.sin(Date.now() * 0.004) : 0;
            ctx.fillStyle = god ? `rgba(255,${Math.round(180 - scleraPulse * 80)},${Math.round(180 - scleraPulse * 80)},1)` : '#ffffff';
            ctx.beginPath(); ctx.ellipse(eyeLX, eyeY, eyeR, eyeR, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(eyeRX, eyeY, eyeR, eyeR, 0, 0, Math.PI * 2); ctx.fill();

            // Bloodshot veins in god mode
            if (god) {
                ctx.strokeStyle = `rgba(200,0,0,${0.5 + scleraPulse * 0.5})`;
                ctx.lineWidth = 0.8 * sc;
                for (const [ex, ey2, a] of [
                    [eyeLX, eyeY, 0.4], [eyeLX, eyeY, 1.2], [eyeLX, eyeY, 2.5],
                    [eyeRX, eyeY, 0.8], [eyeRX, eyeY, 1.9], [eyeRX, eyeY, 3.0],
                ]) {
                    ctx.beginPath();
                    ctx.moveTo(ex + Math.cos(a) * eyeR * 0.35, ey2 + Math.sin(a) * eyeR * 0.35);
                    ctx.lineTo(ex + Math.cos(a) * eyeR * 0.9,  ey2 + Math.sin(a) * eyeR * 0.9);
                    ctx.stroke();
                }
            }

            // Pupils — shift based on gaze direction
            const pupilShift = this._faceDir * 2 * sc;
            ctx.fillStyle = god ? '#cc0000' : darkBody;
            const pr = rage ? eyeR * 0.55 : eyeR * 0.45;
            ctx.beginPath(); ctx.ellipse(eyeLX + pupilShift, eyeY + sc, pr, pr * 1.1, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(eyeRX + pupilShift, eyeY + sc, pr, pr * 1.1, 0, 0, Math.PI * 2); ctx.fill();

            // God mode: pulsující červená záře kolem očí
            if (god) {
                const glowAlpha = 0.3 + scleraPulse * 0.4;
                ctx.strokeStyle = `rgba(255,0,0,${glowAlpha})`;
                ctx.lineWidth = 2.5 * sc;
                ctx.beginPath(); ctx.ellipse(eyeLX, eyeY, eyeR * 1.3, eyeR * 1.3, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(eyeRX, eyeY, eyeR * 1.3, eyeR * 1.3, 0, 0, Math.PI * 2); ctx.stroke();
            }

            // Rage: red glowing pupils
            if (rage && !god) {
                ctx.fillStyle = 'rgba(255,50,0,0.7)';
                ctx.beginPath(); ctx.ellipse(eyeLX + pupilShift, eyeY + sc, pr * 0.5, pr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(eyeRX + pupilShift, eyeY + sc, pr * 0.5, pr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            }
        }

        // ── Mouth ──
        const mouthY = cy + 9 * sc;
        ctx.lineWidth = 2 * sc;
        ctx.lineCap   = 'round';
        if (dead) {
            // Wavy dead mouth
            ctx.strokeStyle = darkBody;
            ctx.beginPath();
            ctx.moveTo(cx - 8 * sc, mouthY);
            ctx.bezierCurveTo(cx - 4*sc, mouthY + 3*sc, cx + 4*sc, mouthY - 3*sc, cx + 8*sc, mouthY);
            ctx.stroke();
        } else if (rage) {
            // Wide grin showing "teeth" (sucker marks)
            ctx.strokeStyle = '#003344';
            ctx.beginPath();
            ctx.arc(cx, mouthY, 8 * sc, 0, Math.PI);
            ctx.stroke();
            ctx.fillStyle = '#003344';
            for (let i = 0; i < 3; i++) {
                const tx2 = cx - 6 * sc + i * 6 * sc;
                ctx.beginPath(); ctx.arc(tx2, mouthY + 2 * sc, 2 * sc, 0, Math.PI * 2); ctx.fill();
            }
        } else if (hp < 25) {
            // Worried frown
            ctx.strokeStyle = darkBody;
            ctx.beginPath();
            ctx.arc(cx, mouthY + 4 * sc, 7 * sc, Math.PI, 0, true);
            ctx.stroke();
        } else if (ouch) {
            // Open oval mouth (hurt)
            ctx.fillStyle = darkBody;
            ctx.beginPath(); ctx.ellipse(cx, mouthY, 6 * sc, 4 * sc, 0, 0, Math.PI * 2); ctx.fill();
        } else {
            // Neutral smile
            ctx.strokeStyle = darkBody;
            ctx.beginPath();
            ctx.arc(cx, mouthY - 2 * sc, 7 * sc, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }
    }

    // ── Ammo counts table ─────────────────────────────────────────────────────

    _drawAmmoTable(ctx, x, y, h, player) {
        const w = 158;
        this._panel(ctx, x, y, w, h);

        // Header
        ctx.fillStyle = C.labelBrown;
        ctx.font = 'bold 10px Courier New';
        ctx.fillText('TYPE', x + 8,  y + 16);
        ctx.fillText('CUR',  x + 80, y + 16);
        ctx.fillText('MAX',  x + 118, y + 16);

        ctx.fillStyle = C.panelHi;
        ctx.fillRect(x + 4, y + 19, w - 8, 1);

        const rowH = (h - 28) / AMMO_ROWS.length;

        AMMO_ROWS.forEach(({ key, label }, i) => {
            const ry  = y + 22 + i * rowH;
            const cur = player.ammo[key] ?? 0;
            const max = MAX_AMMO[key] ?? 0;
            const isActive = WEAPON_DEFS[player.activeWeapon]?.ammoType === key;

            // Highlight active ammo type
            if (isActive) {
                ctx.fillStyle = '#3a2810';
                ctx.fillRect(x + 4, ry, w - 8, rowH - 2);
            }

            ctx.fillStyle = isActive ? C.numYellow : C.labelBrown;
            ctx.font = `${isActive ? 'bold' : ''} 11px Courier New`;
            ctx.fillText(label, x + 8, ry + rowH - 6);

            ctx.fillStyle = cur === 0 ? C.numDim : isActive ? C.numYellow : '#aaaaaa';
            ctx.font = `bold 13px Courier New`;
            ctx.textAlign = 'right';
            ctx.fillText(String(cur).padStart(3), x + 110, ry + rowH - 5);
            ctx.fillStyle = C.numDim;
            ctx.font = '11px Courier New';
            ctx.fillText(String(max), x + 150, ry + rowH - 5);
            ctx.textAlign = 'left';
        });
    }

    // ── Weapon sprite (2D overlay in viewport) ────────────────────────────────

    _drawWeaponSprite(ctx, player, weaponSystem, W, H) {
        const lowerRaise = weaponSystem.getLowerRaise();
        const fireKick   = weaponSystem.isFiring() ? 1 : 0;
        const bobY       = Math.sin(player.bobPhase) * player.bobSpeed * 6;
        const baseY      = H - BAR_H + 20 + bobY + lowerRaise * 100 + fireKick * 16;

        ctx.save();
        // Scale up 1.8x so weapon feels large and present — all weapon draw methods
        // use coordinates relative to origin (0,0) centered at barrel midpoint
        ctx.translate(W / 2, baseY);
        ctx.scale(1.8, 1.8);

        const COLORS = {
            fist:              '#d49060',
            chainsaw:          '#ff8800',
            sql_gun:           '#aaaaaa',
            data_shotgun:      '#cc8844',
            super_shotgun:     '#ff6600',
            chaingun:          '#88aacc',
            pipeline_launcher: '#44cc44',
            plasma_rifle:      '#00ffaa',
            kai_assistant:     '#ff44ff',
            cast_canon:        '#00ddff',
        };
        const color = COLORS[player.activeWeapon] ?? '#888888';

        switch (player.activeWeapon) {
            case 'fist':              this._wFist(ctx, fireKick, color);    break;
            case 'chainsaw':          this._wChainsaw(ctx, fireKick, color);      break;
            case 'sql_gun':           this._wPistol(ctx, color);            break;
            case 'data_shotgun':      this._wShotgun(ctx, color);           break;
            case 'super_shotgun':     this._wSuperShotgun(ctx, color);            break;
            case 'chaingun':          this._wChaingun(ctx, color);                break;
            case 'pipeline_launcher': this._wLauncher(ctx, color);          break;
            case 'plasma_rifle':      this._wPlasmaRifle(ctx, color);             break;
            case 'kai_assistant':     this._wKAI(ctx, color);               break;
            case 'cast_canon':        this._wCastCanon(ctx, fireKick, color); break;
        }

        ctx.restore();
    }

    // All weapons drawn centered on (0,0) = barrel/muzzle point, extending down into view
    // This makes every weapon "point forward" into the screen from player's perspective

    _wFist(ctx, kick, color) {
        const oy = kick * -14;
        // Right fist (main)
        ctx.fillStyle = '#c07040';
        ctx.fillRect(-10, -70 + oy, 44, 56);
        ctx.fillStyle = color;
        ctx.fillRect(-8,  -68 + oy, 40, 22);
        // Knuckles
        for (let i = 0; i < 4; i++) ctx.fillRect(-6 + i * 9, -80 + oy, 7, 14);
        // Left fist (background, dimmer)
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(-60, -58 + oy * 0.5, 40, 52);
        ctx.fillStyle = '#c07040';
        ctx.fillRect(-58, -56 + oy * 0.5, 36, 18);
        ctx.globalAlpha = 1;
    }

    _wPistol(ctx, color) {
        // Barrel (centered at 0,0 = muzzle end)
        ctx.fillStyle = '#444';
        ctx.fillRect(-6, -55, 12, 55);
        // Slide
        ctx.fillStyle = '#555';
        ctx.fillRect(-14, -48, 28, 38);
        // Grip
        ctx.fillStyle = color;
        ctx.fillRect(-10, -14, 22, 50);
        // Guard
        ctx.fillStyle = '#666';
        ctx.fillRect(-14, -16, 28, 6);
        // Sight
        ctx.fillStyle = '#333';
        ctx.fillRect(-2, -58, 4, 6);
    }

    _wShotgun(ctx, color) {
        // Barrel (centered at 0 = muzzle)
        ctx.fillStyle = '#333';
        ctx.fillRect(-8, -60, 16, 60);
        ctx.fillStyle = '#444';
        ctx.fillRect(-6, -58, 12, 56);
        // Pump / fore-end
        ctx.fillStyle = '#555';
        ctx.fillRect(-18, -35, 36, 14);
        // Receiver
        ctx.fillStyle = '#445544';
        ctx.fillRect(-22, -22, 44, 18);
        // Stock
        ctx.fillStyle = color;
        ctx.fillRect(-18,  -8, 36, 50);
        // Barrel ring
        ctx.fillStyle = '#888';
        ctx.fillRect(-9, -45, 18, 5);
    }

    _wLauncher(ctx, color) {
        // Tube (centered at barrel exit)
        ctx.fillStyle = '#224422';
        ctx.beginPath(); ctx.ellipse(0, -10, 14, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#446644';
        ctx.beginPath(); ctx.ellipse(0, -10, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Main tube body
        ctx.fillStyle = color;
        ctx.fillRect(-16, -10, 32, 65);
        ctx.fillStyle = '#336633';
        ctx.fillRect(-16, -10, 32, 5);
        // Sight
        ctx.fillStyle = '#55aa55';
        ctx.fillRect(-5, -24, 10, 16);
        // Grip
        ctx.fillStyle = '#335533';
        ctx.fillRect(-8, 50, 16, 30);
    }

    _wBFD(ctx, color) {
        // Energy orb (at barrel = center top)
        const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5;
        ctx.fillStyle = `rgba(0,255,255,${0.5 + pulse * 0.5})`;
        ctx.beginPath(); ctx.ellipse(0, -8, 18 + pulse * 5, 18 + pulse * 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#aaffff';
        ctx.beginPath(); ctx.ellipse(-4, -12, 8, 8, 0, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = '#224444';
        ctx.fillRect(-34, 5, 68, 35);
        // Vents
        ctx.fillStyle = color;
        for (let i = 0; i < 4; i++) ctx.fillRect(-26, 9 + i * 7, 50, 4);
        // Grip
        ctx.fillStyle = '#113333';
        ctx.fillRect(-8, 38, 16, 35);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.strokeRect(-34, 5, 68, 35);
    }

    _wKAI(ctx, color) {
        // A glowing chat bubble / AI orb — the most powerful weapon in the data center
        const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
        const glow  = 0.4 + pulse * 0.6;

        // Outer corona
        ctx.fillStyle = `rgba(255,0,255,${glow * 0.25})`;
        ctx.beginPath(); ctx.ellipse(0, -15, 38 + pulse * 8, 38 + pulse * 8, 0, 0, Math.PI * 2); ctx.fill();

        // Main orb
        ctx.fillStyle = `rgba(180,0,255,${0.7 + pulse * 0.3})`;
        ctx.beginPath(); ctx.ellipse(0, -15, 24, 24, 0, 0, Math.PI * 2); ctx.fill();

        // Inner bright core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(-6, -20, 9, 9, 0, 0, Math.PI * 2); ctx.fill();

        // "KAI" text on the orb
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('KAI', 0, -10);
        ctx.textAlign = 'left';

        // Handle / grip
        ctx.fillStyle = '#440044';
        ctx.fillRect(-8, 8, 16, 45);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.strokeRect(-8, 8, 16, 45);

        // Energy sparks
        ctx.strokeStyle = `rgba(255,100,255,${glow})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const a = (Date.now() * 0.003 + i * Math.PI / 2) % (Math.PI * 2);
            const r = 30 + pulse * 6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * 22, -15 + Math.sin(a) * 22);
            ctx.lineTo(Math.cos(a) * r,  -15 + Math.sin(a) * r);
            ctx.stroke();
        }
    }

    _wCastCanon(ctx, kick, color) {
        // A futuristic type-casting cannon — cylindrical barrel with SQL type ring
        const oy = kick * -12;

        // Barrel (long, centered)
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(-10, -70 + oy, 20, 70);
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(-7, -68 + oy, 14, 66);

        // Type ring (glowing ring around barrel mid-point)
        const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3 + pulse * 2;
        ctx.beginPath();
        ctx.ellipse(0, -40 + oy, 14, 6, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Second ring
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6 + pulse * 0.4;
        ctx.beginPath();
        ctx.ellipse(0, -28 + oy, 12, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Muzzle glow
        ctx.fillStyle = `rgba(0,220,255,${0.3 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(0, -70 + oy, 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Grip / handle
        ctx.fillStyle = '#0a2a3a';
        ctx.fillRect(-12, -10 + oy, 24, 40);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5;
        ctx.strokeRect(-12, -10 + oy, 24, 40);

        // CAST label on grip
        ctx.fillStyle = color;
        ctx.font = 'bold 8px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('CAST', 0, 14 + oy);
        ctx.textAlign = 'left';
    }

    _wChainsaw(ctx, kick, color) {
        const oy = kick * -10;
        // Main body bar
        ctx.fillStyle = '#442200';
        ctx.fillRect(-12, -20 + oy, 24, 70);
        // Chain guide bar (horizontal)
        ctx.fillStyle = '#333';
        ctx.fillRect(-8, -60 + oy, 16, 44);
        ctx.fillStyle = '#555';
        ctx.fillRect(-6, -58 + oy, 12, 40);
        // Chain teeth
        ctx.fillStyle = '#aaa';
        for (let i = 0; i < 7; i++) {
            ctx.fillRect(-10, -55 + oy + i * 6, 4, 4);
            ctx.fillRect(6,   -55 + oy + i * 6, 4, 4);
        }
        // Engine / motor block
        ctx.fillStyle = color;
        ctx.fillRect(-16, -5 + oy, 32, 22);
        // Exhaust vents
        ctx.fillStyle = '#221100';
        for (let i = 0; i < 3; i++) ctx.fillRect(-12, -2 + oy + i * 7, 24, 4);
        // Handle
        ctx.fillStyle = '#331100';
        ctx.fillRect(-10, 16 + oy, 20, 40);
        // Trigger
        ctx.fillStyle = '#553300';
        ctx.fillRect(4, 28 + oy, 12, 10);
    }

    _wSuperShotgun(ctx, color) {
        // Two barrels side by side (centered)
        ctx.fillStyle = '#333';
        ctx.fillRect(-14, -60, 12, 60);
        ctx.fillRect(2,   -60, 12, 60);
        // Barrel shine
        ctx.fillStyle = '#555';
        ctx.fillRect(-12, -58, 8, 54);
        ctx.fillRect(4,   -58, 8, 54);
        // Barrel muzzles
        ctx.fillStyle = '#222';
        ctx.fillRect(-14, -62, 12, 4);
        ctx.fillRect(2,   -62, 12, 4);
        // Pump / fore-end (wider than single shotgun)
        ctx.fillStyle = '#666';
        ctx.fillRect(-20, -38, 40, 12);
        // Receiver
        ctx.fillStyle = '#445544';
        ctx.fillRect(-26, -26, 52, 20);
        // Stock
        ctx.fillStyle = color;
        ctx.fillRect(-22,  -8, 44, 50);
        // Barrel rings
        ctx.fillStyle = '#888';
        ctx.fillRect(-15, -48, 26, 4);
    }

    _wChaingun(ctx, color) {
        // 3 rotating barrels hint (draw 3 barrel circles)
        const spin = (Date.now() * 0.005) % (Math.PI * 2);
        for (let i = 0; i < 3; i++) {
            const a = spin + (i * Math.PI * 2) / 3;
            const bx = Math.cos(a) * 8;
            const by = Math.sin(a) * 4;
            ctx.fillStyle = '#444';
            ctx.fillRect(bx - 5, -55 + by, 10, 50);
            ctx.fillStyle = '#666';
            ctx.fillRect(bx - 3, -53 + by, 6, 46);
        }
        // Central drum/housing
        ctx.fillStyle = '#334455';
        ctx.beginPath();
        ctx.ellipse(0, -12, 16, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, -12, 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillStyle = '#2a3a4a';
        ctx.fillRect(-20, 0, 40, 40);
        // Grip
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(-8, 36, 16, 32);
        // Ammo belt suggestion
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, 15);
        ctx.lineTo(-32, 40);
        ctx.stroke();
    }

    _wPlasmaRifle(ctx, color) {
        // Energy cell glow
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
        ctx.fillStyle = `rgba(0,255,170,${0.3 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.ellipse(0, -20, 10 + pulse * 4, 10 + pulse * 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Barrel
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(-6, -65, 12, 65);
        ctx.fillStyle = '#2a3a2a';
        ctx.fillRect(-4, -63, 8, 61);
        // Body
        ctx.fillStyle = '#1a3a2a';
        ctx.fillRect(-18, -10, 36, 40);
        // Energy cell (glowing rectangular module)
        ctx.fillStyle = color;
        ctx.fillRect(-14, -6, 12, 20);
        ctx.fillStyle = `rgba(0,255,170,${0.6 + pulse * 0.4})`;
        ctx.fillRect(-12, -4, 8, 16);
        // Vents on right side
        ctx.fillStyle = '#113322';
        for (let i = 0; i < 3; i++) ctx.fillRect(6, -4 + i * 9, 10, 6);
        // Sight rail
        ctx.fillStyle = '#0a1a0a';
        ctx.fillRect(-4, -20, 8, 12);
        // Grip
        ctx.fillStyle = '#112211';
        ctx.fillRect(-8, 28, 16, 36);
        // Grip accent
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(-18, -10, 36, 40);
    }

    // ── Screen overlays ───────────────────────────────────────────────────────

    _drawMuzzleFlash(ctx, timer, W, H) {
        const alpha = Math.min(0.28, (timer / 70) * 0.28);
        ctx.fillStyle = `rgba(255,210,60,${alpha})`;
        ctx.fillRect(0, 0, W, H - BAR_H);
    }

    _drawHurtFlash(ctx, timer, W, H) {
        const alpha = Math.min(0.5, (timer / 300) * 0.5);
        ctx.fillStyle = `rgba(180,0,0,${alpha})`;
        ctx.fillRect(0, 0, W, H);
    }

    // ── Minimap ───────────────────────────────────────────────────────────────

    _drawMinimap(ctx, player, enemies = []) {
        const map = player._map;
        if (!map) return;
        const cols = map[0].length;
        const rows = map.length;
        const cs   = MINIMAP_CELL;
        const mx   = MINIMAP_MARGIN;
        const my   = MINIMAP_MARGIN;

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(mx - 2, my - 2, cols * cs + 4, rows * cs + 4);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cell = map[row][col];
                if (cell > 0) {
                    ctx.fillStyle = ['#665544','#446688','#774433','#336644'][cell-1] ?? '#665544';
                    ctx.fillRect(mx + col * cs, my + row * cs, cs - 1, cs - 1);
                }
            }
        }

        const px = mx + player.x * cs;
        const py = my + player.y * cs;
        ctx.fillStyle = '#ffee00';
        ctx.beginPath();
        ctx.arc(px, py, cs * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffee00';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + player.dirX * cs * 2.5, py + player.dirY * cs * 2.5);
        ctx.stroke();

        // Enemy dots — colored by type, with short type label
        const ENEMY_COLORS = {
            data_zombie:    '#ff4444',
            pipeline_demon: '#ff8800',
            config_monster: '#ffdd00',
            server_boss:    '#ff44ff',
            flow_specter:   '#44ffff',
            sql_mutant:     '#44ff44',
            trigger_boss:   '#00ffe5',
        };
        const ENEMY_LABELS = {
            data_zombie:    'Z',
            pipeline_demon: 'D',
            config_monster: 'M',
            server_boss:    'B',
            flow_specter:   'F',
            sql_mutant:     'S',
            trigger_boss:   'T',
        };
        for (const enemy of enemies) {
            if (!enemy.isAlive()) continue;
            const ex = mx + enemy.x * cs;
            const ey = my + enemy.y * cs;
            const col = ENEMY_COLORS[enemy.kind] ?? '#ffffff';
            ctx.fillStyle = col;
            const r = enemy.kind === 'server_boss' ? cs * 0.9 : cs * 0.6;
            ctx.beginPath();
            ctx.arc(ex, ey, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = `bold ${Math.round(r * 1.4)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(ENEMY_LABELS[enemy.kind] ?? '?', ex, ey + r * 0.45);
        }
        ctx.textAlign = 'left';
    }

    // ── Score overlay (top center, classic Doom intermission style) ──────────

    _drawScore(ctx, score, killsLeft, W, missionId) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(W / 2 - 90, 6, 180, 30);
        ctx.fillStyle = C.numYellow;
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(String(score).padStart(7, '0'), W / 2, 24);
        ctx.fillStyle = C.numRed;
        ctx.font = '11px Courier New';
        if (missionId === 'L2') {
            ctx.fillText(`INSERTS REMAINING: ${killsLeft}`, W / 2, 34);
        } else {
            ctx.fillText(`${killsLeft} ERRORS ACTIVE`, W / 2, 34);
        }
        ctx.textAlign = 'left';
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // ── Boss HP bar ───────────────────────────────────────────────────────────

    _drawBossBar(ctx, enemies, W, H) {
        const boss = enemies.find(e => e.def?.isBoss && e.isAlive?.());
        if (!boss) return;

        const barW = Math.min(500, W * 0.45);
        const barX = (W - barW) / 2;
        const barY = 14;
        const barH = 18;
        const ratio = Math.max(0, boss.health / boss.def.health);

        // Background panel
        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(barX - 6, barY - 22, barW + 12, barH + 28);

        // Boss name
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`[ ${boss.def.name.toUpperCase()} ]`, W / 2, barY - 4);

        // HP bar background
        ctx.fillStyle = '#220000';
        ctx.fillRect(barX, barY, barW, barH);

        // HP fill
        const hpCol = ratio > 0.5 ? '#cc2200' : ratio > 0.25 ? '#ff6600' : '#ff0000';
        ctx.fillStyle = hpCol;
        ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);

        // Phase markers
        if (boss.def.bossPhases) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            for (const threshold of boss.def.bossPhases) {
                const px = barX + barW * threshold;
                ctx.beginPath();
                ctx.moveTo(px, barY);
                ctx.lineTo(px, barY + barH);
                ctx.stroke();
            }
        }

        // HP text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${boss.health} / ${boss.def.health}`, W / 2, barY + barH - 2);

        ctx.textAlign = 'left';
    }

    // ── Mission tag ───────────────────────────────────────────────────────────

    _drawMissionTag(ctx, missionId, missionName, W) {
        const text = `${missionId} — ${missionName}`;
        ctx.font = 'bold 11px Courier New';
        const tw = ctx.measureText(text).width;

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(8, 8, tw + 16, 22);

        ctx.fillStyle = '#44aaff';
        ctx.textAlign = 'left';
        ctx.fillText(text, 16, 24);
    }

    _drawTimer(ctx, seconds, W) {
        if (!seconds) return;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const text = h > 0
            ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
            : `${m}:${String(s).padStart(2,'0')}`;

        ctx.font = 'bold 13px Courier New';
        const tw = ctx.measureText(text).width;
        const x = W - tw - 24;

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(x - 8, 8, tw + 16, 22);

        ctx.fillStyle = '#888';
        ctx.textAlign = 'left';
        ctx.fillText(text, x, 24);
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y,     x + w, y + r,     r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
        ctx.fill();
    }
}
