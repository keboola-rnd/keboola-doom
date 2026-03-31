import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (avoids ESM dotenv issues)
try {
    const env = readFileSync(join(__dirname, '.env'), 'utf8');
    for (const line of env.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
} catch (e) { /* .env not required in prod */ }

if (!process.env.CONNECTION_STRING) {
    throw new Error('Missing required environment variable: CONNECTION_STRING');
}

const pool = new pg.Pool({ connectionString: process.env.CONNECTION_STRING });

async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
            id                 SERIAL PRIMARY KEY,
            name               TEXT NOT NULL,
            level_reached      INTEGER NOT NULL DEFAULT 0,
            total_time_seconds INTEGER NOT NULL DEFAULT 0,
            used_cheats        BOOLEAN NOT NULL DEFAULT FALSE,
            completed          BOOLEAN NOT NULL DEFAULT FALSE,

            -- Difficulty: 0=easy (JR), 1=medium (AE), 2=hard (DE)
            difficulty         SMALLINT NOT NULL DEFAULT 1,

            -- In-game kill score accumulated across all missions
            kill_score         INTEGER NOT NULL DEFAULT 0,

            -- Player fingerprint fields for identifying same player across nicks
            ip_address         TEXT,
            user_agent         TEXT,
            screen_res         TEXT,       -- e.g. "1920x1080"
            timezone           TEXT,       -- e.g. "Europe/Prague"
            language           TEXT,       -- e.g. "cs-CZ"
            hw_concurrency     SMALLINT,   -- logical CPU cores
            device_memory      REAL,       -- GB, if available
            color_depth        SMALLINT,
            fingerprint        TEXT,       -- hash of client signals, for grouping alt accounts

            created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    // Add fingerprint columns to existing tables that were created before this migration
    await pool.query(`
        ALTER TABLE sessions
            ADD COLUMN IF NOT EXISTS difficulty     SMALLINT NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS ip_address     TEXT,
            ADD COLUMN IF NOT EXISTS user_agent     TEXT,
            ADD COLUMN IF NOT EXISTS screen_res     TEXT,
            ADD COLUMN IF NOT EXISTS timezone       TEXT,
            ADD COLUMN IF NOT EXISTS language       TEXT,
            ADD COLUMN IF NOT EXISTS hw_concurrency SMALLINT,
            ADD COLUMN IF NOT EXISTS device_memory  REAL,
            ADD COLUMN IF NOT EXISTS color_depth    SMALLINT,
            ADD COLUMN IF NOT EXISTS fingerprint    TEXT,
            ADD COLUMN IF NOT EXISTS kill_score     INTEGER NOT NULL DEFAULT 0
    `);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Extract real client IP, respecting proxies
function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return forwarded.split(',')[0].trim();
    return req.socket?.remoteAddress ?? null;
}

// POST /api/sessions — start a new session when player enters name
app.post('/api/sessions', async (req, res) => {
    const {
        name,
        screen_res, timezone, language,
        hw_concurrency, device_memory, color_depth,
        fingerprint,
    } = req.body ?? {};

    if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'name required' });
    }
    const cleanName = name.trim().slice(0, 20).toUpperCase();
    try {
        // Check if name is already taken
        const existing = await pool.query(
            `SELECT id FROM sessions WHERE name = $1 LIMIT 1`,
            [cleanName]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'name already taken' });
        }
        const result = await pool.query(
            `INSERT INTO sessions
                (name, ip_address, user_agent, screen_res, timezone, language,
                 hw_concurrency, device_memory, color_depth, fingerprint)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
                cleanName,
                clientIp(req),
                req.headers['user-agent']?.slice(0, 300) ?? null,
                screen_res   ?? null,
                timezone     ?? null,
                language     ?? null,
                hw_concurrency != null ? parseInt(hw_concurrency, 10) : null,
                device_memory  != null ? parseFloat(device_memory)    : null,
                color_depth    != null ? parseInt(color_depth, 10)    : null,
                fingerprint  ?? null,
            ]
        );
        res.json({ id: result.rows[0].id });
    } catch (e) {
        console.error('[sessions] POST error:', e.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// PATCH /api/sessions/:id — update session progress after each level or on death/win
app.patch('/api/sessions/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

    const { level_reached, total_time_seconds, used_cheats, completed, difficulty, kill_score } = req.body ?? {};
    try {
        await pool.query(
            `UPDATE sessions
             SET level_reached      = $1,
                 total_time_seconds = $2,
                 used_cheats        = $3,
                 completed          = $4,
                 difficulty         = $5,
                 kill_score         = $6,
                 updated_at         = NOW()
             WHERE id = $7`,
            [
                Math.max(0, Math.floor(level_reached ?? 0)),
                Math.max(0, Math.floor(total_time_seconds ?? 0)),
                Boolean(used_cheats),
                Boolean(completed),
                [0, 1, 2].includes(difficulty) ? difficulty : 1,
                Math.max(0, Math.floor(kill_score ?? 0)),
                id,
            ]
        );
        res.json({ ok: true });
    } catch (e) {
        console.error('[sessions] PATCH error:', e.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// Score formula (computed in SQL):
//   base     = kill_score (in-game kills accumulated across all missions)
//   time_bon = GREATEST(0, 3600 - total_time_seconds)   -- up to 3600 pts for speed
//   complete = 15000 if completed
//   diff_mul = 1.0 / 1.5 / 2.0  for JR / AE / DE
//   cheats   = × 0
//
// score = ROUND((base + time_bon + complete) * diff_mul * cheat_factor)

const SCORE_SQL = `
    ROUND(
        (
            kill_score
            + GREATEST(0, 3600 - total_time_seconds)
            + CASE WHEN completed THEN 15000 ELSE 0 END
        )
        * CASE difficulty WHEN 0 THEN 1.0 WHEN 2 THEN 2.0 ELSE 1.5 END
        * CASE WHEN used_cheats THEN 0 ELSE 1 END
    )::INTEGER AS score
`;

// GET /api/leaderboard — all entries, sorted by computed score DESC
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT name, level_reached, total_time_seconds, used_cheats, completed, difficulty,
                   ${SCORE_SQL}
            FROM sessions
            ORDER BY score DESC, level_reached DESC, created_at ASC
        `);
        res.json({ entries: result.rows });
    } catch (e) {
        console.error('[leaderboard] GET error:', e.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// Keboola POSTs to / on startup — handle all methods
app.all('/', (req, res) => res.sendFile(join(__dirname, 'index.html')));

// Serve static files (src/, mp3, etc.) — index:false so '/' goes through app.all above
app.use(express.static(__dirname, { index: false }));

initDb()
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Keboola Doom running on port ${PORT}`);
        });
    })
    .catch(e => {
        console.error('[db] Failed to initialize database:', e.message);
        process.exit(1);
    });
