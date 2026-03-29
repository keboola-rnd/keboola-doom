// Procedural texture generation — walls, floor, ceiling, sprites
// All textures stored as Uint32Array (ABGR little-endian = RGBA in canvas)
// color = (alpha << 24) | (blue << 16) | (green << 8) | red

import { TEX_WIDTH, TEX_HEIGHT } from '../config.js';

// Pack RGBA into Uint32 (little-endian canvas format)
function rgb(r, g, b) {
    return (0xFF000000 | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0;
}

function rgba(r, g, b, a) {
    return (((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF)) >>> 0;
}

// Simple deterministic noise
function hash(x, y) {
    let n = x + y * 57;
    n = (n << 13) ^ n;
    return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7FFFFFFF) / 1073741824.0);
}

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

// ─── Wall textures ────────────────────────────────────────────────────────────

// Classic Doom STARTAN-style stone: warm brownish-tan bricks
function makeStoneWall() {
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    const BW = 16, BH = 8;
    for (let y = 0; y < TEX_HEIGHT; y++) {
        for (let x = 0; x < TEX_WIDTH; x++) {
            const row = Math.floor(y / BH);
            const offset = (row & 1) ? 8 : 0;
            const bx = (x + offset) % BW;
            const by = y % BH;
            const mortar = bx === 0 || by === 0;
            let r, g, b;
            if (mortar) {
                r = 70; g = 55; b = 40;
            } else {
                const n = hash(Math.floor((x + offset) / BW), row) * 22;
                r = clamp(148 + n, 100, 200);
                g = clamp(108 + n, 72, 150);
                b = clamp(72  + n, 45, 110);
            }
            tex[y * TEX_WIDTH + x] = rgb(r, g, b);
        }
    }
    return tex;
}

// Classic Doom METAL-style: gray-brown panels with rivets, no blue
function makeMetalWall() {
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    for (let y = 0; y < TEX_HEIGHT; y++) {
        for (let x = 0; x < TEX_WIDTH; x++) {
            const panelEdge = (y % 16 < 2) || (x % 32 < 2);
            const rivetY = y % 16 === 8;
            const rivetX = ((x + 8) % 32) < 4;
            const rivet  = rivetY && rivetX;

            let r, g, b;
            if (rivet) {
                r = 160; g = 145; b = 125;
            } else if (panelEdge) {
                r = 40; g = 32; b = 24;
            } else {
                const gloss = (Math.sin(x * 0.3) * 5 + Math.cos(y * 0.2) * 3);
                r = clamp(95  + gloss, 60, 140);
                g = clamp(82  + gloss, 50, 120);
                b = clamp(68  + gloss, 40, 100);
            }
            tex[y * TEX_WIDTH + x] = rgb(r, g, b);
        }
    }
    return tex;
}

// Classic Doom REDWALL-style: dark reddish-brown bricks
function makeBrickWall() {
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    const BW = 14, BH = 7;
    for (let y = 0; y < TEX_HEIGHT; y++) {
        for (let x = 0; x < TEX_WIDTH; x++) {
            const row    = Math.floor(y / BH);
            const offset = (row & 1) ? 7 : 0;
            const bx = (x + offset) % BW;
            const by = y % BH;
            const mortar = bx <= 1 || by <= 1;
            let r, g, b;
            if (mortar) {
                r = 90; g = 72; b = 55;
            } else {
                const n = hash(Math.floor((x + offset) / BW) * 3, row * 7) * 20;
                r = clamp(175 + n, 130, 215);
                g = clamp(68  + n * 0.4, 45, 100);
                b = clamp(48  + n * 0.2, 30, 75);
            }
            tex[y * TEX_WIDTH + x] = rgb(r, g, b);
        }
    }
    return tex;
}

// Classic Doom COMPUTE-style: gray-brown tech panels with dim indicator lights
function makeTechWall() {
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    for (let y = 0; y < TEX_HEIGHT; y++) {
        for (let x = 0; x < TEX_WIDTH; x++) {
            const traceH = (y % 8 === 4) && (x % 16 < 12);
            const traceV = (x % 16 === 0) && (y % 8 < 4);
            const led    = (x % 16 === 14) && (y % 8 === 4);
            const panel  = (y % 32 < 2) || (x % 32 < 2);

            let r, g, b;
            if (led) {
                // Dim amber/red LEDs — more authentic than bright cyan
                r = 200; g = 80; b = 10;
            } else if (traceH || traceV) {
                r = 80; g = 65; b = 45;
            } else if (panel) {
                r = 28; g = 22; b = 16;
            } else {
                const noise = hash(x, y) * 10;
                r = clamp(72  + noise, 50, 110);
                g = clamp(58  + noise, 38, 90);
                b = clamp(44  + noise, 28, 70);
            }
            tex[y * TEX_WIDTH + x] = rgb(r, g, b);
        }
    }
    return tex;
}

// ─── Floor / Ceiling ─────────────────────────────────────────────────────────

// Classic Doom FLAT4-style floor: dark brownish-gray stone
function makeFloor() {
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    for (let y = 0; y < TEX_HEIGHT; y++) {
        for (let x = 0; x < TEX_WIDTH; x++) {
            const n = hash(x, y) * 14;
            let r = clamp(52 + n, 35, 80);
            let g = clamp(42 + n, 27, 65);
            let b = clamp(30 + n, 18, 50);
            tex[y * TEX_WIDTH + x] = rgb(r, g, b);
        }
    }
    return tex;
}

// Near-black ceiling — classic Doom looks up into darkness
function makeCeiling() {
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    for (let y = 0; y < TEX_HEIGHT; y++) {
        for (let x = 0; x < TEX_WIDTH; x++) {
            const n = hash(x * 2, y * 2) * 5;
            const r = clamp(18 + n, 10, 28);
            const g = clamp(13 + n, 7,  22);
            const b = clamp(9  + n, 4,  16);
            tex[y * TEX_WIDTH + x] = rgb(r, g, b);
        }
    }
    return tex;
}

// ─── Sprite textures (enemies + items) ───────────────────────────────────────

function drawSprite(drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_WIDTH;
    canvas.height = TEX_HEIGHT;
    const ctx = canvas.getContext('2d');
    drawFn(ctx);
    const imgData = ctx.getImageData(0, 0, TEX_WIDTH, TEX_HEIGHT);
    const raw = imgData.data;
    const tex = new Uint32Array(TEX_WIDTH * TEX_HEIGHT);
    for (let i = 0; i < TEX_WIDTH * TEX_HEIGHT; i++) {
        const r = raw[i * 4];
        const g = raw[i * 4 + 1];
        const b = raw[i * 4 + 2];
        const a = raw[i * 4 + 3];
        tex[i] = rgba(r, g, b, a);
    }
    return tex;
}

// Sprite 0: Data Zombie (green humanoid)
function makeDataZombie() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Body
        ctx.fillStyle = '#3a7a3a';
        ctx.fillRect(20, 28, 24, 24);
        // Head
        ctx.fillStyle = '#4a8a4a';
        ctx.fillRect(22, 10, 20, 20);
        // Red eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(25, 15, 5, 5);
        ctx.fillRect(34, 15, 5, 5);
        // Mouth
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(26, 24, 12, 3);
        // Arms
        ctx.fillStyle = '#3a7a3a';
        ctx.fillRect(8, 28, 12, 8);
        ctx.fillRect(44, 28, 12, 8);
        // Legs
        ctx.fillStyle = '#285028';
        ctx.fillRect(20, 52, 10, 10);
        ctx.fillRect(34, 52, 10, 10);
        // Lab coat hint
        ctx.fillStyle = '#cccccc';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(20, 28, 24, 20);
        ctx.globalAlpha = 1;
        // Outline
        ctx.strokeStyle = '#1a3a1a';
        ctx.lineWidth = 1;
        ctx.strokeRect(20, 28, 24, 24);
        ctx.strokeRect(22, 10, 20, 20);
    });
}

// Sprite 1: Pipeline Demon (orange winged)
function makePipelineDemon() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Wings
        ctx.fillStyle = '#cc4400';
        ctx.beginPath();
        ctx.moveTo(8, 20); ctx.lineTo(25, 35); ctx.lineTo(8, 50);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(56, 20); ctx.lineTo(39, 35); ctx.lineTo(56, 50);
        ctx.fill();
        // Body
        ctx.fillStyle = '#ee6622';
        ctx.fillRect(22, 25, 20, 25);
        // Head
        ctx.fillStyle = '#ff8844';
        ctx.fillRect(24, 8, 16, 18);
        // Horns
        ctx.fillStyle = '#aa2200';
        ctx.fillRect(24, 2, 4, 8);
        ctx.fillRect(36, 2, 4, 8);
        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(26, 12, 5, 5);
        ctx.fillRect(33, 12, 5, 5);
        // Mouth (angry)
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(26, 20, 12, 3);
        // Claws
        ctx.fillStyle = '#aa3300';
        ctx.fillRect(22, 50, 8, 8);
        ctx.fillRect(34, 50, 8, 8);
    });
}

// Sprite 2: Config Monster (gray blob)
function makeConfigMonster() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Blob body
        ctx.fillStyle = '#7a7a8a';
        ctx.beginPath();
        ctx.ellipse(32, 38, 22, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Head blob
        ctx.fillStyle = '#8a8a9a';
        ctx.beginPath();
        ctx.ellipse(32, 22, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Multiple eyes
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(20, 17, 6, 6);
        ctx.fillRect(29, 14, 6, 6);
        ctx.fillRect(38, 17, 6, 6);
        // Tendrils
        ctx.strokeStyle = '#5a5a6a';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(12, 44); ctx.lineTo(4, 58); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(52, 44); ctx.lineTo(60, 58); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(32, 56); ctx.lineTo(32, 62); ctx.stroke();
        // Jagged mouth
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(24, 26, 16, 4);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(25 + i * 4, 26, 2, 2);
        }
    });
}

// Sprite 3: Server Boss (large server rack with face)
function makeServerBoss() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Server chassis
        ctx.fillStyle = '#224488';
        ctx.fillRect(10, 5, 44, 54);
        // Panel lines
        ctx.fillStyle = '#1a3366';
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(10, 5 + i * 9, 44, 2);
        }
        // LEDs (alternating green/red)
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#00ff44' : '#ff2200';
            ctx.fillRect(46, 8 + i * 9, 4, 4);
        }
        // Face — two big glowing eyes
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.ellipse(22, 30, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(42, 30, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye pupils
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.ellipse(22, 30, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(42, 30, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Grille (mouth)
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(18, 42, 28, 10);
        ctx.fillStyle = '#446688';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(20 + i * 5, 42, 3, 10);
        }
        // Outline
        ctx.strokeStyle = '#aaccff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 5, 44, 54);
    });
}

// Item sprites ─────────────────────────────────────────────────────────────────

function makeHealthSmall() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, 18, 28, 28);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(28, 20, 8, 24); // vertical
        ctx.fillRect(20, 28, 24, 8); // horizontal
        ctx.strokeStyle = '#cc0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(18, 18, 28, 28);
    });
}

function makeHealthLarge() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#00aa44';
        ctx.beginPath();
        ctx.ellipse(32, 32, 22, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00ff66';
        ctx.fillRect(27, 18, 10, 28);
        ctx.fillRect(18, 27, 28, 10);
        ctx.strokeStyle = '#008833';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(32, 32, 22, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
    });
}

function makeAmmoBullets() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#ddaa22';
        ctx.fillRect(14, 22, 36, 20);
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(14, 18, 36, 6);
        ctx.fillStyle = '#ccaa11';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(16 + i * 9, 26, 5, 12);
        }
        ctx.strokeStyle = '#aa8800';
        ctx.lineWidth = 1;
        ctx.strokeRect(14, 22, 36, 20);
    });
}

function makeAmmoShells() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#cc6600';
        ctx.fillRect(14, 20, 36, 24);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(14, 17, 36, 5);
        // Shell circles
        ctx.fillStyle = '#884400';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(20 + i * 12, 32, 4, 6, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.strokeStyle = '#884400';
        ctx.lineWidth = 1;
        ctx.strokeRect(14, 20, 36, 24);
    });
}

function makeAmmoRockets() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Crate
        ctx.fillStyle = '#885522';
        ctx.fillRect(12, 18, 40, 28);
        // Rocket shapes inside
        ctx.fillStyle = '#cc2200';
        ctx.fillRect(16, 22, 6, 20);
        ctx.fillRect(26, 22, 6, 20);
        ctx.fillRect(36, 22, 6, 20);
        // Tips
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(17, 18, 4, 6);
        ctx.fillRect(27, 18, 4, 6);
        ctx.fillRect(37, 18, 4, 6);
        ctx.strokeStyle = '#553311';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 18, 40, 28);
    });
}

function makeArmor() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Shield shape
        ctx.fillStyle = '#4477cc';
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.lineTo(52, 18);
        ctx.lineTo(52, 38);
        ctx.lineTo(32, 56);
        ctx.lineTo(12, 38);
        ctx.lineTo(12, 18);
        ctx.closePath();
        ctx.fill();
        // Shine
        ctx.fillStyle = '#88aaff';
        ctx.beginPath();
        ctx.moveTo(32, 12);
        ctx.lineTo(44, 20);
        ctx.lineTo(38, 36);
        ctx.lineTo(32, 40);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#2255aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.lineTo(52, 18);
        ctx.lineTo(52, 38);
        ctx.lineTo(32, 56);
        ctx.lineTo(12, 38);
        ctx.lineTo(12, 18);
        ctx.closePath();
        ctx.stroke();
    });
}

function makeWeaponShotgun() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.fillStyle = '#886644';
        ctx.fillRect(8, 28, 48, 8); // stock
        ctx.fillStyle = '#555555';
        ctx.fillRect(12, 26, 36, 6); // barrel
        ctx.fillStyle = '#333333';
        ctx.fillRect(10, 25, 38, 4); // barrel top
        ctx.fillStyle = '#666655';
        ctx.fillRect(42, 23, 10, 10); // receiver
        ctx.fillStyle = '#888866';
        ctx.fillRect(8, 28, 16, 12); // stock body
    });
}

function makeWeaponLauncher() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Tube launcher
        ctx.fillStyle = '#448844';
        ctx.fillRect(6, 24, 52, 16);
        ctx.fillStyle = '#224422';
        ctx.fillRect(6, 24, 52, 4);
        // Sight
        ctx.fillStyle = '#55aa55';
        ctx.fillRect(28, 18, 8, 8);
        // Grip
        ctx.fillStyle = '#335533';
        ctx.fillRect(40, 38, 8, 12);
        // Muzzle
        ctx.fillStyle = '#66cc66';
        ctx.beginPath();
        ctx.ellipse(8, 32, 5, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#224422';
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 24, 52, 16);
    });
}

function makeWeaponBFD() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Main body
        ctx.fillStyle = '#224444';
        ctx.fillRect(10, 18, 44, 28);
        // Energy orb (front)
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.ellipse(12, 32, 10, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaffff';
        ctx.beginPath();
        ctx.ellipse(10, 28, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Grip
        ctx.fillStyle = '#113333';
        ctx.fillRect(38, 44, 10, 12);
        // Vents
        ctx.fillStyle = '#00aa88';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(26, 22 + i * 6, 20, 3);
        }
        ctx.strokeStyle = '#00cccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 18, 44, 28);
    });
}

// ─── Projectile sprites ───────────────────────────────────────────────────────

// Sprite 13: SQL Gun bullet — bright yellow spark
function makeBulletSprite() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Outer glow
        const g1 = ctx.createRadialGradient(32, 32, 4, 32, 32, 24);
        g1.addColorStop(0, 'rgba(255,220,0,0.9)');
        g1.addColorStop(1, 'rgba(255,100,0,0)');
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.fill();
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(32, 32, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffee44';
        ctx.beginPath(); ctx.arc(32, 32, 5, 0, Math.PI * 2); ctx.fill();
    });
}

// Sprite 14: Shotgun pellet — smaller orange spark
function makePelletSprite() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 16);
        g.addColorStop(0, 'rgba(255,180,50,1)');
        g.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(32, 32, 4, 0, Math.PI * 2); ctx.fill();
    });
}

// Sprite 15: Pipeline Launcher rocket — green capsule with flame tail
function makeRocketSprite() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Flame tail (bottom)
        const flame = ctx.createRadialGradient(32, 48, 2, 32, 48, 16);
        flame.addColorStop(0, 'rgba(255,200,0,1)');
        flame.addColorStop(0.5, 'rgba(255,80,0,0.7)');
        flame.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = flame;
        ctx.beginPath(); ctx.arc(32, 48, 16, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = '#55cc55';
        ctx.beginPath(); ctx.roundRect(26, 14, 12, 32, 4); ctx.fill();
        // Nose cone
        ctx.fillStyle = '#aaffaa';
        ctx.beginPath();
        ctx.moveTo(32, 6); ctx.lineTo(38, 18); ctx.lineTo(26, 18);
        ctx.closePath(); ctx.fill();
        // Fins
        ctx.fillStyle = '#338833';
        ctx.fillRect(18, 38, 10, 8);
        ctx.fillRect(36, 38, 10, 8);
    });
}

// Sprite 16: BFD 9000 ball — large pulsing cyan orb
function makeBFDBallSprite() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        // Outer aura
        const aura = ctx.createRadialGradient(32, 32, 8, 32, 32, 30);
        aura.addColorStop(0, 'rgba(0,255,255,0.8)');
        aura.addColorStop(0.6, 'rgba(0,180,220,0.4)');
        aura.addColorStop(1, 'rgba(0,80,160,0)');
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
        // Mid ring
        ctx.strokeStyle = 'rgba(100,255,255,0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(32, 32, 18, 0, Math.PI * 2); ctx.stroke();
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(32, 32, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#aaffff';
        ctx.beginPath(); ctx.arc(32, 32, 6, 0, Math.PI * 2); ctx.fill();
    });
}

// Sprite 17: Enemy energy bolt — red-orange plasma
function makeEnemyBoltSprite() {
    return drawSprite(ctx => {
        ctx.clearRect(0, 0, 64, 64);
        const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 18);
        g.addColorStop(0, 'rgba(255,100,0,1)');
        g.addColorStop(0.5, 'rgba(220,30,0,0.6)');
        g.addColorStop(1, 'rgba(150,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(32, 32, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcc88';
        ctx.beginPath(); ctx.arc(32, 32, 5, 0, Math.PI * 2); ctx.fill();
    });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateTextures() {
    const walls = [
        makeStoneWall(),   // index 0 → map wall type 1
        makeMetalWall(),   // index 1 → map wall type 2
        makeBrickWall(),   // index 2 → map wall type 3
        makeTechWall(),    // index 3 → map wall type 4
    ];

    const floor   = makeFloor();
    const ceiling = makeCeiling();

    const sprites = [
        makeDataZombie(),       // 0
        makePipelineDemon(),    // 1
        makeConfigMonster(),    // 2
        makeServerBoss(),       // 3
        makeHealthSmall(),      // 4
        makeHealthLarge(),      // 5
        makeAmmoBullets(),      // 6
        makeAmmoShells(),       // 7
        makeAmmoRockets(),      // 8
        makeArmor(),            // 9
        makeWeaponShotgun(),    // 10
        makeWeaponLauncher(),   // 11
        makeWeaponBFD(),        // 12
        // ── Projectile sprites ──
        makeBulletSprite(),     // 13 — sql_gun
        makePelletSprite(),     // 14 — shotgun pellets
        makeRocketSprite(),     // 15 — pipeline launcher
        makeBFDBallSprite(),    // 16 — BFD 9000
        makeEnemyBoltSprite(),  // 17 — enemy projectiles
    ];

    return { walls, floor, ceiling, sprites };
}

// Apply brightness shade to a packed Uint32 color (0.0–1.0)
export function shadeColor(color, shade) {
    const r = Math.floor((color & 0xFF) * shade);
    const g = Math.floor(((color >>> 8) & 0xFF) * shade);
    const b = Math.floor(((color >>> 16) & 0xFF) * shade);
    const a = (color >>> 24);
    return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
