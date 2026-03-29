// Level builder — creates Babylon meshes from the map array

// ─── Wall textures ────────────────────────────────────────────────────────────

function makeWallTexture(scene, type) {
    const sz = 64;
    const dt  = new BABYLON.DynamicTexture(`wall_tex_${type}`, { width: sz, height: sz }, scene, false);
    const ctx = dt.getContext();

    const bases = { 1: '#888888', 2: '#3355aa', 3: '#8B4513', 4: '#226622' };
    const lines = { 1: '#aaaaaa', 2: '#5577cc', 3: '#cc7755', 4: '#44cc44' };

    ctx.fillStyle = bases[type] ?? bases[1];
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = lines[type] ?? lines[1];

    if (type === 1) {
        ctx.lineWidth = 1.5;
        for (let y = 0; y < sz; y += 16)
            for (let x = 0; x < sz; x += 16)
                ctx.strokeRect(x + 1, y + 1, 14, 14);
    } else if (type === 2) {
        ctx.lineWidth = 1;
        for (let y = 0; y < sz; y += 8) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(sz, y); ctx.stroke();
        }
        ctx.fillStyle = lines[2];
        for (let y = 4; y < sz; y += 16)
            for (let x = 4; x < sz; x += 16) {
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
            }
    } else if (type === 3) {
        ctx.lineWidth = 1;
        for (let row = 0; row < sz / 10; row++) {
            const yPos = row * 10;
            const offset = (row % 2) * 16;
            for (let x = -offset; x < sz; x += 32)
                ctx.strokeRect(x + 1, yPos + 1, 30, 8);
        }
    } else if (type === 4) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#00ff66';
        for (let i = 0; i < sz; i += 8) {
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, sz); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(sz, i); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#00ff44';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(32, 16); ctx.lineTo(32, 32); ctx.lineTo(sz, 32); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(16, 48); ctx.lineTo(16, 56); ctx.lineTo(sz, 56); ctx.stroke();
        ctx.fillStyle = '#00ff44';
        [[32, 16], [16, 48], [48, 32]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        });
    }

    dt.update();
    return dt;
}

function makeFloorTexture(scene) {
    const sz = 64;
    const dt  = new BABYLON.DynamicTexture('floor_tex', { width: sz, height: sz }, scene, false);
    const ctx = dt.getContext();
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i < sz; i += 8) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, sz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(sz, i); ctx.stroke();
    }
    dt.update();
    return dt;
}

function makeCeilingTexture(scene) {
    const sz = 64;
    const dt  = new BABYLON.DynamicTexture('ceil_tex', { width: sz, height: sz }, scene, false);
    const ctx = dt.getContext();
    ctx.fillStyle = '#333338';
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = '#28282e';
    ctx.lineWidth = 1;
    for (let i = 0; i < sz; i += 16) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, sz); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(sz, i); ctx.stroke();
    }
    ctx.fillStyle = '#005533';
    for (let y = 8; y < sz; y += 32)
        for (let x = 8; x < sz; x += 32)
            ctx.fillRect(x - 2, y - 2, 4, 4);
    dt.update();
    return dt;
}

// ─── Graffiti ─────────────────────────────────────────────────────────────────

// Data engineering memes + actual error messages spraypainted on the walls.
// lines[0] is the biggest / headline, subsequent lines are smaller.
const GRAFFITI = [
    // Memes
    { lines: ['ACCESS DB', 'IS NOT DEAD'],                color: '#ff6600' },
    { lines: ['NULL IS', 'BEST COLUMN'],                  color: '#00ffcc' },
    { lines: ['not my', 'schema'],                        color: '#aa88ff' },
    { lines: ['works in DEV', 'broken in PROD'],          color: '#44ff44' },
    { lines: ['LEGACY', 'DO NOT TOUCH'],                  color: '#ff8800' },
    { lines: ['just add', 'an index lol'],                color: '#ffff00' },
    { lines: ['GROUP BY', 'everything'],                  color: '#ffaa00' },
    { lines: ['DISTINCT', 'is not a fix'],                color: '#ffcc00' },
    { lines: ['ETL =', 'Extremely', 'Tired Lookup'],      color: '#cc44ff' },
    { lines: ['my predecessor', 'built this'],            color: '#aaaaff' },
    { lines: ['HERE BE', 'DRAGONS'],                      color: '#ff3300' },
    { lines: ['"temporary"', 'since 2019'],               color: '#bbbbff' },
    { lines: ['TODO: remove', 'before prod'],             color: '#ff4444' },
    { lines: ['you shall', 'not JOIN'],                   color: '#ff5500' },
    { lines: ['data quality:', 'aspiratioal'],            color: '#ff6666' }, // typo is the joke
    { lines: ['DO NOT', 'DELETE', '(please)'],            color: '#ff0000' },
    { lines: ['SELECT *', 'FROM prod', 'WHERE 1=1'],      color: '#ff3333' },
    // Actual Keboola / data warehouse error messages
    { lines: ['Query exceeded', '70% of', 'warehouse memory'],  color: '#ff4400' },
    { lines: ['Circular DAG', 'detected'],                       color: '#ff00aa' },
    { lines: ['Row count:', 'expected 1', 'got 1,048,576'],      color: '#ff2222' },
    { lines: ['Cannot JOIN', 'NULL to NOT NULL'],                color: '#00eeff' },
    { lines: ['Workspace idle', 'timeout'],                      color: '#88ff44' },
    { lines: ['String too long', 'for VARCHAR(255)'],            color: '#ffcc44' },
    { lines: ['timestamp', 'without timezone'],                  color: '#ffaa44' },
    { lines: ['Execution time', 'exceeded limit'],               color: '#ff6600' },
];

// Shuffle array in-place (Fisher–Yates)
function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Create a 256x128 DynamicTexture for one graffiti sign
function makeGraffitiTexture(scene, idx, lines, color) {
    const tw = 256, th = 128;
    const dt  = new BABYLON.DynamicTexture(`graffiti_tex_${idx}`, { width: tw, height: th }, scene, false);
    const ctx = dt.getContext();

    // Dark translucent background so wall texture shows through slightly
    ctx.clearRect(0, 0, tw, th);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(4, 4, tw - 8, th - 8);

    // Colored border
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.strokeRect(4, 4, tw - 8, th - 8);

    // Text — first line biggest, rest smaller
    ctx.textAlign = 'center';
    const n        = lines.length;
    const maxSize  = n === 1 ? 44 : n === 2 ? 36 : 26;
    const lineH    = (th - 20) / n;

    lines.forEach((line, i) => {
        const size = i === 0 ? maxSize : maxSize * 0.78;
        ctx.font   = `bold ${Math.round(size)}px monospace`;

        // Dark outline so text is readable over any wall
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth   = size * 0.16;
        ctx.strokeText(line, tw / 2, 18 + lineH * i + lineH * 0.7);

        ctx.fillStyle = color;
        ctx.fillText(line, tw / 2, 18 + lineH * i + lineH * 0.7);
    });

    dt.update();
    dt.hasAlpha = true;
    return dt;
}

// Scan the map, collect exposed wall faces, randomly place graffiti on them.
// Rotation conventions (Babylon CreatePlane default normal = -Z):
//   North face (visible from -Z side): rotY = 0
//   South face (visible from +Z side): rotY = Math.PI
//   West  face (visible from -X side): rotY = -Math.PI/2
//   East  face (visible from +X side): rotY =  Math.PI/2
function buildGraffiti(scene, map) {
    const rows = map.length;
    const cols = map[0].length;

    // flipU: rotating a plane ±180° or ±90° around Y can mirror the texture's U axis.
    // Set flipU=true for any direction where the plane's local-right ends up antiparallel
    // to the player's screen-right, which flips the text.
    const DIRS = [
        { dr: -1, dc:  0, getPx: (c) => c + 0.5,      getPz: (r) => r - 0.02,      rotY: 0,            flipU: false }, // N
        { dr:  1, dc:  0, getPx: (c) => c + 0.5,      getPz: (r) => r + 1.02,      rotY: Math.PI,      flipU: true  }, // S — rotY=π flips local-right → mirrored
        { dr:  0, dc: -1, getPx: (c) => c - 0.02,     getPz: (r) => r + 0.5,       rotY: -Math.PI / 2, flipU: true  }, // W — local-right points +Z, player-right is -Z → mirrored
        { dr:  0, dc:  1, getPx: (c) => c + 1.02,     getPz: (r) => r + 0.5,       rotY:  Math.PI / 2, flipU: false }, // E — local-right points -Z, player-right is -Z → ok
    ];

    // Collect all valid exposed wall faces
    const candidates = [];
    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            if (map[r][c] === 0) continue;       // not a wall
            for (const d of DIRS) {
                const nr = r + d.dr;
                const nc = c + d.dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (map[nr][nc] === 0) {          // neighbor is open space
                    candidates.push({ r, c, d });
                }
            }
        }
    }

    _shuffle(candidates);

    // Place as many signs as we have messages (capped by available faces)
    const msgs   = _shuffle([...GRAFFITI]);
    const count  = Math.min(msgs.length, candidates.length);

    for (let i = 0; i < count; i++) {
        const { r, c, d } = candidates[i];
        const { lines, color } = msgs[i];

        const tex  = makeGraffitiTexture(scene, i, lines, color);

        const sign = BABYLON.MeshBuilder.CreatePlane(`graffiti_${i}`, {
            width: 0.78, height: 0.42,
        }, scene);

        sign.position    = new BABYLON.Vector3(d.getPx(c), 0.54, d.getPz(r));
        sign.rotation.y  = d.rotY;
        sign.isPickable  = false;

        const mat = new BABYLON.StandardMaterial(`graffiti_mat_${i}`, scene);
        mat.diffuseTexture             = tex;
        mat.diffuseTexture.hasAlpha    = true;
        mat.diffuseTexture.uScale      = d.flipU ? -1 : 1;  // fix mirror on rotated faces
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor              = new BABYLON.Color3(1, 1, 1);
        mat.backFaceCulling            = false;
        sign.material                  = mat;
    }
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const CHART_DEFS = [
    {
        title: 'Sprint Velocity',
        sub:   'last 12 sprints',
        type:  'line',
        data:   [42, 38, 40, 35, 31, 28, 29, 22, 18, 15, 11, 3],
        labels: ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12'],
        color:  '#ff5555',
        note:   { at: 5, text: '▼ new PM' },
    },
    {
        title: 'How Data Team Spends Its Time',
        type:  'pie',
        segments: [
            { label: 'Meetings',         value: 68, color: '#ff5555' },
            { label: 'Slack',            value: 19, color: '#ffaa00' },
            { label: 'Actual Data Work', value:  8, color: '#44ff44' },
            { label: 'Crying',           value:  5, color: '#4488ff' },
        ],
    },
    {
        title: 'Technical Debt',
        sub:   '(marked as "manageable" in 2021)',
        type:  'line',
        data:   [12, 15, 18, 24, 35, 55, 89, 144, 233, 377, 610, 987],
        labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
        color:  '#ff8800',
    },
    {
        title: 'Dashboard Views per Quarter',
        sub:   'stakeholders found Excel in Q3',
        type:  'bar',
        bars: [
            { label: 'Q1', value: 847,   color: '#4488ff' },
            { label: 'Q2', value: 12043, color: '#44aaff' },
            { label: 'Q3', value: 34,    color: '#ff5555' },
            { label: 'Q4', value: 2,     color: '#ff2222' },
        ],
    },
    {
        title: 'SLA Compliance %',
        sub:   '(target: 99.9%)',
        type:  'line',
        data:   [99, 99, 98, 99, 97, 71, 54, 38, 29, 21, 18, 12],
        labels: ['J','F','M','A','M','J','J','A','S','O','N','D'],
        color:  '#ff4444',
        note:   { at: 5, text: '▼ contractor' },
        yMax:   100,
    },
    {
        title: 'Root Cause of Production Incidents',
        type:  'pie',
        segments: [
            { label: 'Nobody Knows',  value: 73, color: '#556677' },
            { label: 'Works Locally', value: 14, color: '#ffaa00' },
            { label: 'Cosmic Rays',   value:  8, color: '#4488ff' },
            { label: 'My Bad',        value:  5, color: '#ff4444' },
        ],
    },
    {
        title: 'Stakeholder Confidence in Data',
        sub:   'self-reported · scale 0–100',
        type:  'bar',
        bars: [
            { label: 'Eng',        value:  12, color: '#44aaff' },
            { label: 'Analytics',  value:  31, color: '#44aaff' },
            { label: 'Management', value: 100, color: '#ff4444' },
            { label: 'Investors',  value:  99, color: '#ff5555' },
        ],
    },
    {
        title: 'Rows Processed vs. Rows Correct',
        sub:   '847M processed  ·  12 correct',
        type:  'bar',
        bars: [
            { label: 'Processed', value: 100, color: '#4488ff' },
            { label: 'Correct',   value:   1, color: '#44ff44' },
        ],
    },
];

function _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function _chartLine(ctx, def, px, py, pw, ph) {
    const data  = def.data;
    const max   = def.yMax ?? Math.max(...data) * 1.15;
    const n     = data.length;
    const step  = pw / (n - 1);
    const color = def.color ?? '#4488ff';

    // Horizontal grid + y-axis labels
    for (let i = 0; i <= 4; i++) {
        const gy = py + ph - (i / 4) * ph;
        ctx.strokeStyle = '#2a3a50'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px + pw, gy); ctx.stroke();
        ctx.fillStyle = '#aabbcc'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
        ctx.fillText(Math.round(max * i / 4), px - 4, gy + 3);
    }
    // Axes
    ctx.strokeStyle = '#7799aa'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    // X labels
    ctx.fillStyle = '#aabbcc'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    def.labels.forEach((l, i) => ctx.fillText(l, px + i * step, py + ph + 13));
    // Annotation
    if (def.note) {
        const ax = px + def.note.at * step;
        ctx.strokeStyle = '#ff6644'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(ax, py); ctx.lineTo(ax, py + ph); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ff6644'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(def.note.text, ax, py - 3);
    }
    // Area fill
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = px + i * step, y = py + ph - (v / max) * ph;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(px + (n - 1) * step, py + ph); ctx.lineTo(px, py + ph); ctx.closePath();
    ctx.fillStyle = _hexToRgba(color, 0.15); ctx.fill();
    // Line
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = px + i * step, y = py + ph - (v / max) * ph;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Dots
    ctx.fillStyle = color;
    data.forEach((v, i) => {
        ctx.beginPath(); ctx.arc(px + i * step, py + ph - (v / max) * ph, 3, 0, Math.PI * 2); ctx.fill();
    });
}

function _chartBar(ctx, def, px, py, pw, ph) {
    const bars = def.bars;
    const max  = Math.max(...bars.map(b => b.value)) * 1.2;
    const gap  = pw / bars.length;
    const bw   = gap * 0.6;

    for (let i = 0; i <= 4; i++) {
        const gy = py + ph - (i / 4) * ph;
        ctx.strokeStyle = '#2a3a50'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(px, gy); ctx.lineTo(px + pw, gy); ctx.stroke();
        ctx.fillStyle = '#aabbcc'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
        ctx.fillText(Math.round(max * i / 4), px - 4, gy + 3);
    }
    ctx.strokeStyle = '#7799aa'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + ph); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();

    bars.forEach((bar, i) => {
        const bx = px + i * gap + (gap - bw) / 2;
        const h  = Math.max(2, (bar.value / max) * ph);
        const by = py + ph - h;
        const bc = bar.color ?? '#4488ff';
        ctx.fillStyle = bc; ctx.fillRect(bx, by, bw, h);
        // value on top
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        const valStr = bar.value >= 10000 ? Math.round(bar.value/1000)+'K' : String(bar.value);
        ctx.fillText(valStr, bx + bw / 2, by - 4);
        // x label
        ctx.fillStyle = '#aabbcc'; ctx.font = '9px monospace';
        ctx.fillText(bar.label, bx + bw / 2, py + ph + 13);
    });
}

function _chartPie(ctx, def, W, H, topPad) {
    const segs  = def.segments;
    const total = segs.reduce((s, seg) => s + seg.value, 0);
    const cx = W * 0.37, cy = topPad + (H - topPad) * 0.5;
    const r  = Math.min((H - topPad) * 0.42, 85);
    let angle = -Math.PI / 2;

    segs.forEach(seg => {
        const sweep = (seg.value / total) * Math.PI * 2;
        ctx.fillStyle = seg.color;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0d1117'; ctx.lineWidth = 2; ctx.stroke();
        if (seg.value >= 7) {
            const mid = angle + sweep / 2;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
            ctx.fillText(seg.value + '%', cx + Math.cos(mid) * r * 0.65, cy + Math.sin(mid) * r * 0.65 + 4);
        }
        angle += sweep;
    });

    // Legend
    const legX = W * 0.63, legStep = (H - topPad - 10) / segs.length;
    segs.forEach((seg, i) => {
        const ly = topPad + 8 + i * legStep;
        ctx.fillStyle = seg.color; ctx.fillRect(legX, ly, 12, 10);
        ctx.fillStyle = '#ddeeff'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(seg.label, legX + 16, ly + 9);
    });
}

function makeChartTexture(scene, idx, def) {
    const W = 512, H = 256;

    // Draw into a real DOM canvas first — DynamicTexture.getContext() can be unreliable
    // for non-square sizes in some Babylon CDN builds.
    const offCanvas = document.createElement('canvas');
    offCanvas.width  = W;
    offCanvas.height = H;
    const ctx = offCanvas.getContext('2d');
    const accent = def.color ?? '#4488ff';

    // Dark background + colored header bar
    ctx.fillStyle = '#111828'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;    ctx.fillRect(0, 0, W, 32);

    // Title on header (white, readable)
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText(def.title, W / 2, 22);

    if (def.sub) {
        ctx.fillStyle = '#ffffff'; ctx.font = '11px monospace';
        ctx.fillText(def.sub, W / 2, 44);
    }

    const topPad = def.sub ? 50 : 36;
    const px = 52, py = topPad, pw = W - 68, ph = H - topPad - 22;

    if (def.type === 'line')     _chartLine(ctx, def, px, py, pw, ph);
    else if (def.type === 'bar') _chartBar(ctx, def, px, py, pw, ph);
    else if (def.type === 'pie') _chartPie(ctx, def, W, H, topPad);

    // Upload the pre-drawn offCanvas into a DynamicTexture.
    // Passing a canvas element to the DynamicTexture constructor in some Babylon CDN
    // builds only reads the dimensions and creates a fresh (blank) internal canvas.
    // Instead: create the DT with explicit size, then blit the offCanvas onto its
    // internal canvas with drawImage, and finally upload to GPU.
    const dt = new BABYLON.DynamicTexture(`chart_tex_${idx}`, { width: W, height: H }, scene, false);
    const dtCtx = dt.getContext();
    dtCtx.drawImage(offCanvas, 0, 0);
    dt.update();
    return dt;
}

// Fixed wall positions for charts — outer boundary walls, always solid
// Spread through all three sections so player discovers them while exploring
const CHART_POSITIONS = [
    { x:  5.5,  z:  1.02, rotY:  Math.PI,        flipU: true  }, // S face N-wall sec1
    { x: 11.5,  z:  1.02, rotY:  Math.PI,        flipU: true  }, // S face N-wall sec1
    { x: 17.5,  z:  1.02, rotY:  Math.PI,        flipU: true  }, // S face N-wall sec1
    { x: 22.98, z:  4.5,  rotY: -Math.PI / 2,    flipU: true  }, // W face E-wall sec1
    { x: 22.98, z: 11.5,  rotY: -Math.PI / 2,    flipU: true  }, // W face E-wall sec2
    { x:  1.02, z: 12.5,  rotY:  Math.PI / 2,    flipU: false }, // E face W-wall sec2
    { x: 22.98, z: 19.5,  rotY: -Math.PI / 2,    flipU: true  }, // W face E-wall sec3
    { x: 11.5,  z: 22.98, rotY:  0,              flipU: false }, // N face S-wall boss room
];

function buildCharts(scene) {
    // GlowLayer is stored on scene.metadata by createScene.
    // Chart boards must be excluded — emissiveColor(1,1,1) would otherwise
    // cause the GlowLayer to bloom the board into a solid-white rectangle.
    const glow = scene.metadata?.glow;

    const count = Math.min(CHART_DEFS.length, CHART_POSITIONS.length);
    for (let i = 0; i < count; i++) {
        const pos = CHART_POSITIONS[i];
        const tex = makeChartTexture(scene, i, CHART_DEFS[i]);
        tex.uScale = pos.flipU ? -1 : 1;

        const board = BABYLON.MeshBuilder.CreatePlane(`chart_${i}`, {
            width: 2.0, height: 1.0,
        }, scene);
        board.position   = new BABYLON.Vector3(pos.x, 0.6, pos.z);
        board.rotation.y = pos.rotY;
        board.isPickable = false;

        // emissiveTexture renders at exact drawn brightness regardless of scene lighting.
        // emissiveColor must be white — Babylon multiplies emissiveColor × emissiveTexture,
        // so the default black emissiveColor would make everything invisible.
        const mat = new BABYLON.StandardMaterial(`chart_mat_${i}`, scene);
        mat.emissiveTexture = tex;
        mat.emissiveColor   = new BABYLON.Color3(1, 1, 1);
        mat.diffuseColor    = new BABYLON.Color3(0, 0, 0);
        mat.backFaceCulling = false;
        board.material      = mat;

        // Exclude from GlowLayer — fully emissive meshes would otherwise bloom solid white
        if (glow) glow.addExcludedMesh(board);
    }
}

// ─── Level entry point ────────────────────────────────────────────────────────

export function buildLevel(scene, map) {
    const rows = map.length;
    const cols = map[0].length;

    // Wall materials (one per type, shared across all walls)
    const wallMats = {};
    const wallEmissive = [
        new BABYLON.Color3(0.08, 0.08, 0.08),
        new BABYLON.Color3(0.05, 0.08, 0.18),
        new BABYLON.Color3(0.12, 0.06, 0.03),
        new BABYLON.Color3(0.03, 0.15, 0.03),
    ];
    for (const t of [1, 2, 3, 4]) {
        const mat = new BABYLON.StandardMaterial(`wall_mat_${t}`, scene);
        mat.diffuseTexture  = makeWallTexture(scene, t);
        mat.emissiveColor   = wallEmissive[t - 1];
        mat.specularColor   = new BABYLON.Color3(0.05, 0.05, 0.05);
        wallMats[t] = mat;
    }

    // Floor
    const floorMat = new BABYLON.StandardMaterial('floor_mat', scene);
    floorMat.diffuseTexture         = makeFloorTexture(scene);
    floorMat.diffuseTexture.uScale  = cols / 2;
    floorMat.diffuseTexture.vScale  = rows / 2;
    floorMat.emissiveColor          = new BABYLON.Color3(0.05, 0.05, 0.05);
    floorMat.specularColor          = new BABYLON.Color3(0, 0, 0);

    // Ceiling
    const ceilMat = new BABYLON.StandardMaterial('ceil_mat', scene);
    ceilMat.diffuseTexture          = makeCeilingTexture(scene);
    ceilMat.diffuseTexture.uScale   = cols / 2;
    ceilMat.diffuseTexture.vScale   = rows / 2;
    ceilMat.emissiveColor           = new BABYLON.Color3(0.04, 0.04, 0.06);
    ceilMat.specularColor           = new BABYLON.Color3(0, 0, 0);
    ceilMat.backFaceCulling         = false;

    // Wall boxes
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = map[row][col];
            if (cell === 0) continue;
            const box = BABYLON.MeshBuilder.CreateBox(`wall_${row}_${col}`, {
                width: 1, height: 1, depth: 1,
            }, scene);
            box.position        = new BABYLON.Vector3(col + 0.5, 0.5, row + 0.5);
            box.material        = wallMats[cell] ?? wallMats[1];
            box.checkCollisions = true;
            box.isPickable      = false;
        }
    }

    const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: cols, height: rows, subdivisions: 1 }, scene);
    floor.position   = new BABYLON.Vector3(cols / 2, 0, rows / 2);
    floor.material   = floorMat;
    floor.isPickable = false;

    const ceiling = BABYLON.MeshBuilder.CreateGround('ceiling', { width: cols, height: rows, subdivisions: 1 }, scene);
    ceiling.position   = new BABYLON.Vector3(cols / 2, 1, rows / 2);
    ceiling.rotation   = new BABYLON.Vector3(Math.PI, 0, 0);
    ceiling.material   = ceilMat;
    ceiling.isPickable = false;

    // Graffiti — data memes spraypainted on exposed wall faces
    buildGraffiti(scene, map);

    // Charts — nonsensical dashboards mounted on outer walls
    buildCharts(scene);
}
