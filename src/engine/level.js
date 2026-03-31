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
const GRAFFITI_DEFAULT = [
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
    // More memes
    { lines: ['it depends', 'on use case'],                color: '#ff9900' },
    { lines: ['WHERE 1=0', 'is valid SQL'],                color: '#00ccff' },
    { lines: ['just use', 'FULL OUTER JOIN'],              color: '#ff44aa' },
    { lines: ['the data', 'is correct', 'trust me'],       color: '#44ffaa' },
    { lines: ['TRUNCATE', 'then cry'],                     color: '#ff2200' },
    { lines: ['this pipeline', 'is idempotent', '(maybe)'],color: '#ccff44' },
    { lines: ['schema', 'on write', '(never)'],            color: '#ff88cc' },
    { lines: ['event-driven', 'batch'],                    color: '#55aaff' },
    { lines: ['our dbt models', 'are fine'],               color: '#ff7700' },
    { lines: ['COALESCE', 'everything'],                   color: '#aaff55' },
    { lines: ['normalization', 'is for cowards'],          color: '#ff3388' },
    { lines: ['one source', 'of truth', '(we have 7)'],   color: '#ffdd00' },
    { lines: ['the JOIN', 'was fine', 'yesterday'],        color: '#ff5533' },
    { lines: ['CAST(pain', 'AS float)'],                   color: '#cc88ff' },
    { lines: ['data lake', 'data swamp'],                  color: '#3388ff' },
    { lines: ['real-time', 'next quarter'],                color: '#ff4422' },
    { lines: ['monitoring?', 'we have', 'Slack alerts'],   color: '#ffaa22' },
    { lines: ['no docs', 'only vibes'],                    color: '#ff66bb' },
    { lines: ['column', '"new_final2"'],                   color: '#aaffdd' },
    { lines: ['it ran in', '0ms', '(it failed)'],          color: '#ff3300' },
    // Actual Keboola / data warehouse error messages
    { lines: ['Query exceeded', '70% of', 'warehouse memory'],  color: '#ff4400' },
    { lines: ['Circular DAG', 'detected'],                       color: '#ff00aa' },
    { lines: ['Row count:', 'expected 1', 'got 1,048,576'],      color: '#ff2222' },
    { lines: ['Cannot JOIN', 'NULL to NOT NULL'],                color: '#00eeff' },
    { lines: ['Workspace idle', 'timeout'],                      color: '#88ff44' },
    { lines: ['String too long', 'for VARCHAR(255)'],            color: '#ffcc44' },
    { lines: ['timestamp', 'without timezone'],                  color: '#ffaa44' },
    { lines: ['Execution time', 'exceeded limit'],               color: '#ff6600' },
    { lines: ['Duplicate key', 'violates', 'unique constraint'], color: '#ff1144' },
    { lines: ['division by zero', 'in prod'],                    color: '#ff2200' },
    { lines: ['out of memory', 'on row 2'],                      color: '#ff0055' },
    { lines: ['column count', 'does not match', 'value count'],  color: '#ff3300' },
    { lines: ['permission denied', 'for table prod'],            color: '#ff4411' },
    { lines: ['could not serialize', 'access due to', 'concurrent update'], color: '#ff0033' },
    { lines: ['NaN propagated', 'through 47', 'transformations'],color: '#ffaa00' },
];

// Shuffle array in-place (Fisher–Yates)
function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Create a 256x128 DynamicTexture for one graffiti sign.
// flip=true: mirror the canvas horizontally so the sign reads correctly on
// wall faces where Babylon's plane rotation would otherwise reverse the text.
// Baking the flip into the texture is more reliable than uScale=-1 on the material.
function makeGraffitiTexture(scene, idx, lines, color, flip) {
    const tw = 256, th = 128;
    const dt  = new BABYLON.DynamicTexture(`graffiti_tex_${idx}`, { width: tw, height: th }, scene, false);
    const ctx = dt.getContext();

    if (flip) {
        ctx.save();
        ctx.translate(tw, 0);
        ctx.scale(-1, 1);
    }

    // Dark translucent background so wall texture shows through slightly
    ctx.clearRect(0, 0, tw, th);
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(4, 4, tw - 8, th - 8);

    // Colored border
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3;
    ctx.strokeRect(4, 4, tw - 8, th - 8);

    // Text — first line biggest, rest smaller; shrink to fit within border
    ctx.textAlign = 'center';
    const n      = lines.length;
    const lineH  = (th - 20) / n;
    const maxW   = tw - 24;

    lines.forEach((line, i) => {
        let size = i === 0 ? (n === 1 ? 44 : n === 2 ? 36 : 26) : Math.round((n === 1 ? 44 : n === 2 ? 36 : 26) * 0.78);
        ctx.font = `bold ${size}px monospace`;
        while (ctx.measureText(line).width > maxW && size > 10) {
            size--;
            ctx.font = `bold ${size}px monospace`;
        }

        // Dark outline so text is readable over any wall
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth   = size * 0.16;
        ctx.strokeText(line, tw / 2, 18 + lineH * i + lineH * 0.7);

        ctx.fillStyle = color;
        ctx.fillText(line, tw / 2, 18 + lineH * i + lineH * 0.7);
    });

    if (flip) ctx.restore();

    dt.update();
    dt.hasAlpha = true;
    return dt;
}

// Exported for unit tests — describes graffiti placement for each wall face direction.
// dr/dc: offset to open-space neighbor cell. rotY: plane rotation in Babylon.
// flipU: whether to mirror the canvas horizontally to compensate for UV axis reversal.
export const GRAFFITI_DIRS = [
    { dr: -1, dc:  0, rotY: 0,            flipU: false, label: 'N' },
    { dr:  1, dc:  0, rotY: Math.PI,      flipU: false, label: 'S' },
    { dr:  0, dc: -1, rotY: -Math.PI / 2, flipU: true,  label: 'W' },
    { dr:  0, dc:  1, rotY:  Math.PI / 2, flipU: false, label: 'E' },
];

// Scan the map, collect exposed wall faces, randomly place graffiti on them.
// Rotation conventions (Babylon CreatePlane default normal = -Z):
//   North face (visible from -Z side): rotY = 0
//   South face (visible from +Z side): rotY = Math.PI
//   West  face (visible from -X side): rotY = -Math.PI/2
//   East  face (visible from +X side): rotY =  Math.PI/2
function buildGraffiti(scene, map, msgs) {
    const rows = map.length;
    const cols = map[0].length;

    // flipU: Babylon left-handed rotation means ±90° rotations produce mirrored UV axes
    // for opposite directions. East (rotY=+π/2) renders text correctly without flip;
    // West (rotY=-π/2) is the mirror rotation so its text is reversed — needs flipU=true.
    const DIRS = [
        { dr: -1, dc:  0, getPx: (c) => c + 0.5,  getPz: (r) => r - 0.02,  rotY: 0,            flipU: false }, // N
        { dr:  1, dc:  0, getPx: (c) => c + 0.5,  getPz: (r) => r + 1.02,  rotY: Math.PI,      flipU: false }, // S
        { dr:  0, dc: -1, getPx: (c) => c - 0.02, getPz: (r) => r + 0.5,   rotY: -Math.PI / 2, flipU: true  }, // W — mirror of E, needs flip
        { dr:  0, dc:  1, getPx: (c) => c + 1.02, getPz: (r) => r + 0.5,   rotY:  Math.PI / 2, flipU: false }, // E
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
    const allMsgs = msgs ? [...GRAFFITI_DEFAULT, ...msgs] : [...GRAFFITI_DEFAULT];
    const shuffled = _shuffle(allMsgs);
    const count  = Math.min(shuffled.length, candidates.length);

    for (let i = 0; i < count; i++) {
        const { r, c, d } = candidates[i];
        const { lines, color } = shuffled[i];

        // Pass flip flag so the texture is pre-mirrored; no uScale hack needed.
        const tex  = makeGraffitiTexture(scene, i, lines, color, d.flipU);

        const sign = BABYLON.MeshBuilder.CreatePlane(`graffiti_${i}`, {
            width: 0.78, height: 0.42,
        }, scene);

        sign.position    = new BABYLON.Vector3(d.getPx(c), 0.54, d.getPz(r));
        sign.rotation.y  = d.rotY;
        sign.isPickable  = false;

        const mat = new BABYLON.StandardMaterial(`graffiti_mat_${i}`, scene);
        mat.diffuseTexture             = tex;
        mat.diffuseTexture.hasAlpha    = true;
        mat.useAlphaFromDiffuseTexture = true;
        mat.emissiveColor              = new BABYLON.Color3(1, 1, 1);
        mat.backFaceCulling            = false;
        sign.material                  = mat;
    }
}


// ─── Level entry point ────────────────────────────────────────────────────────

export function buildLevel(scene, map, extraGraffiti) {
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
    buildGraffiti(scene, map, extraGraffiti);
}
