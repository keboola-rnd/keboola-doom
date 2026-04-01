// Main game loop and state machine — Babylon.js edition

import { createScene }      from './engine/scene.js';
import { ROT_SPEED, MOVE_SPEED, MAX_AMMO } from './config.js';
import { buildLevel }       from './engine/level.js';
import { InputState }       from './engine/input.js';
import { MISSIONS }         from './engine/map.js';
import { Player }           from './game/player.js';
import { EntityManager }    from './game/entities.js';
import { WeaponSystem }     from './game/weapons.js';
import { HUD }              from './game/hud.js';
import { AudioManager }     from './game/audio.js';

const GSTATE = {
    MENU:             'menu',
    MISSION_SELECT:   'mission_select',
    MISSION_BRIEFING: 'mission_briefing',
    PLAYING:          'playing',
    PAUSED:           'paused',
    DEAD:             'dead',
    LEVEL_COMPLETE:   'level_complete',
    WIN:              'win',
};

const DEATH_MESSAGES = [
    'JOB FAILED: OutOfCoffeeException at line 1',
    'FATAL: Schema drift detected in Player.exe — column "health" changed to NULL',
    'Error 504: Gateway Timeout — you were too slow. The pipeline was not.',
    'Pipeline error: Player.exe crashed with exit code -1',
    'CRITICAL: Connection pool exhausted. You were the last connection.',
    'Your free trial has expired. Please contact sales@keboola.com',
    'Uncaught TypeError: Cannot read property "health" of undefined',
    'SIGKILL received from The Orchestrator. Retry scheduled in 0 seconds.',
    'An error occurred while running the component: memory limit of 8192 MB exceeded',
    'Job cancelled by user "schema_drift_ghoul". No runbook found.',
    'ERROR: Transformation failed — unexpected NULL in column "playerIsAlive"',
    'Snowflake warehouse suspended due to inactivity. So were you.',
];

class Game {
    constructor() {
        this._renderCanvas = document.getElementById('renderCanvas');
        this._hudCanvas    = document.getElementById('hud-canvas');
        this._hudCtx       = this._hudCanvas.getContext('2d');

        // ── Babylon setup ─────────────────────────────────────────────────────
        const { engine, scene } = createScene(this._renderCanvas);
        this._engine = engine;
        this._scene  = scene;

        // ── Game systems ──────────────────────────────────────────────────────
        this._input   = new InputState();
        this._audio   = new AudioManager();
        this._hud     = new HUD();

        this._state      = GSTATE.MENU;
        this._playerName = '';
        this._score      = 0;
        this._difficulty = 1; // 0=easy, 1=medium, 2=hard
        this._currentMissionIdx = 0;
        this._unlockedMissions  = 1;
        this._missionScores     = [0, 0, 0, 0];
        this._totalScore        = 0;
        this._loadProgress();

        // ── Session tracking (leaderboard) ───────────────────────────────────────
        this._sessionId      = null;   // Supabase session id
        this._gameStartTime  = null;   // Date.now() at first mission start
        this._usedCheats     = false;

        this._player        = null;
        this._entityManager = null;
        this._weaponSystem  = null;

        // ── HUD canvas sizing ─────────────────────────────────────────────────
        this._resizeHudCanvas();
        window.addEventListener('resize', () => this._resizeHudCanvas());

        // ── UI wiring ─────────────────────────────────────────────────────────
        this._deathScreen = document.getElementById('death-screen');
        this._winScreen   = document.getElementById('win-screen');
        this._pauseScreen = document.getElementById('pause-screen');
        this._missionSelectScreen   = document.getElementById('mission-select');
        this._missionBriefingScreen = document.getElementById('mission-briefing');
        this._levelCompleteScreen   = document.getElementById('level-complete');

        // ── Name input wiring ─────────────────────────────────────────────────────
        const nameScreen = document.getElementById('name-input-screen');
        const overlay    = document.getElementById('overlay');
        const nameInput  = document.getElementById('player-name-input');

        const submitBtn = document.getElementById('name-submit-btn');

        const submitName = async () => {
            const name = nameInput.value.trim().toUpperCase();
            if (!name) {
                nameInput.focus();
                nameInput.style.outline = '2px solid #ff4444';
                setTimeout(() => { nameInput.style.outline = ''; }, 1000);
                return;
            }
            this._playerName = name;
            this._sessionId      = null;
            this._gameStartTime  = null;
            this._usedCheats     = false;
            // Reset all progress — new name means fresh run
            this._unlockedMissions = 1;
            this._missionScores    = [0, 0, 0, 0, 0];
            this._totalScore       = 0;
            this._saveProgress();

            // Save to DB immediately — show loading state
            submitBtn.disabled   = true;
            submitBtn.textContent = 'CONNECTING TO DB...';
            await this._createSession(this._playerName);

            if (this._lastSessionError === 'NAME_TAKEN') {
                submitBtn.textContent = 'NAME ALREADY TAKEN';
                nameInput.style.outline = '2px solid #ff4444';
                await new Promise(r => setTimeout(r, 2000));
                nameInput.style.outline = '';
                submitBtn.disabled   = false;
                submitBtn.textContent = 'INITIALIZE AGENT';
                nameInput.value = '';
                nameInput.focus();
                return;
            }

            if (this._sessionId) {
                submitBtn.textContent = 'AGENT REGISTERED';
                await new Promise(r => setTimeout(r, 600));
            } else {
                submitBtn.textContent = this._lastSessionError
                    ? `ERR: ${this._lastSessionError.slice(0, 40)}`
                    : 'DB OFFLINE — PROCEEDING';
                await new Promise(r => setTimeout(r, 2500));
            }

            submitBtn.disabled   = false;
            submitBtn.textContent = 'INITIALIZE AGENT';
            nameScreen.classList.add('hidden');
            overlay.classList.remove('hidden');
        };

        document.getElementById('name-submit-btn').addEventListener('click', submitName);
        nameInput.addEventListener('keydown', e => { if (e.code === 'Enter') submitName(); });

        // Render leaderboard preview on name screen
        this._renderLeaderboard('name-lb-list', null);
        this._renderChangelog();

        document.getElementById('btn-easy').addEventListener('click', () => {
            this._difficulty = 0;
            overlay.classList.add('hidden');
            this._showMissionSelect();
        });
        document.getElementById('btn-medium').addEventListener('click', () => {
            this._difficulty = 1;
            overlay.classList.add('hidden');
            this._showMissionSelect();
        });
        document.getElementById('btn-hard').addEventListener('click', () => {
            this._difficulty = 2;
            overlay.classList.add('hidden');
            this._showMissionSelect();
        });
        document.getElementById('retry-btn').addEventListener('click', () => {
            this._deathScreen.style.display = 'none';
            this._showBriefing(this._currentMissionIdx);
        });
        document.getElementById('win-retry-btn').addEventListener('click', () => {
            this._winScreen.style.display = 'none';
            // New run — reset session
            this._sessionId     = null;
            this._gameStartTime = null;
            this._usedCheats    = false;
            this._renderLeaderboard('name-lb-list', this._playerName);
            nameInput.value = this._playerName !== 'AGENT' ? this._playerName : '';
            nameScreen.classList.remove('hidden');
            overlay.classList.add('hidden');
        });
        document.getElementById('briefing-back').addEventListener('click', () => {
            this._missionBriefingScreen.style.display = 'none';
            this._missionSelectScreen.style.display = 'flex';
        });
        document.getElementById('briefing-launch').addEventListener('click', () => {
            this._missionBriefingScreen.style.display = 'none';
            this._startMission(this._currentMissionIdx);
        });
        document.getElementById('death-newgame-btn').addEventListener('click', () => {
            this._deathScreen.style.display = 'none';
            this._startNewGame();
        });
        document.getElementById('win-newgame-btn').addEventListener('click', () => {
            this._winScreen.style.display = 'none';
            this._startNewGame();
        });
        document.getElementById('pause-resume-btn').addEventListener('click', () => this._resumeFromPause());
        document.getElementById('pause-quit-btn').addEventListener('click', () => this._quitToMenu());
        document.getElementById('pause-newgame-btn').addEventListener('click', () => {
            this._pauseScreen.style.display = 'none';
            this._startNewGame();
        });
        document.getElementById('lc-continue').addEventListener('click', () => {
            this._levelCompleteScreen.style.display = 'none';
            if (this._currentMissionIdx >= MISSIONS.length - 1) {
                this._winScreen.style.display = 'flex';
            } else {
                this._showMissionSelect();
            }
        });

        // Cheat code buffer — keydown + single printable char filter
        // (keypress is deprecated and unreliable with pointer lock)
        this._cheatBuf     = '';
        this._cheatTimeout = null;
        document.addEventListener('keydown', e => {
            if (this._state !== GSTATE.PLAYING) return;
            if (e.repeat) return;                      // ignore key-hold repeats
            if (e.key.length !== 1) return;           // ignore Shift, Enter, Arrow, etc.
            this._cheatBuf = (this._cheatBuf + e.key.toLowerCase()).slice(-10);
            console.log('[cheat]', this._cheatBuf);
            if (this._cheatBuf.endsWith('iddqd'))  this._cheatGodMode();
            if (this._cheatBuf.endsWith('idkfa'))  this._cheatAllWeapons();
            if (this._cheatBuf.endsWith('idclip')) this._cheatNoclip();
        });

        // Tab → toggle minimap; Escape → pause/resume
        document.addEventListener('keydown', e => {
            if (e.code === 'Tab' && this._state === GSTATE.PLAYING) {
                this._hud.toggleMinimap();
                e.preventDefault();
            }
            if (e.code === 'Escape') {
                if (this._state === GSTATE.PLAYING) this._pause();
                else if (this._state === GSTATE.PAUSED) this._quitToMenu();
            }
        });

        // ── Render loop ───────────────────────────────────────────────────────
        engine.runRenderLoop(() => {
            if (this._state === GSTATE.PLAYING) {
                const dt = Math.min(engine.getDeltaTime(), 50);
                this._lastDt = dt;
                this._update(dt);
            }
            // Only render when the scene has an active camera
            if (scene.activeCamera) {
                scene.render();
            }
            if (this._player) this._drawHud();
        });
    }

    _resizeHudCanvas() {
        this._hudCanvas.width  = window.innerWidth;
        this._hudCanvas.height = window.innerHeight;
    }

    // ── Game lifecycle ─────────────────────────────────────────────────────────

    _startGame() {
        this._startMission(this._currentMissionIdx);
    }

    _pause() {
        if (this._state !== GSTATE.PLAYING) return;
        this._state = GSTATE.PAUSED;
        this._audio.stopMusic();
        if (this._player) this._player.detachControl();
        this._pauseScreen.style.display = 'block';
    }

    _resumeFromPause() {
        if (this._state !== GSTATE.PAUSED && this._state !== GSTATE.PLAYING) return;
        this._state = GSTATE.PLAYING;
        if (this._player) this._player.attachControl();
        this._pauseScreen.style.display = 'none';
        this._audio.startMusic();
    }

    _quitToMenu() {
        if (this._state !== GSTATE.PAUSED) return;
        this._pauseScreen.style.display = 'none';
        this._cleanupLevel();
        this._state = GSTATE.MISSION_SELECT;
        this._showMissionSelect();
    }

    _cleanupLevel() {
        this._audio.stopMusic();
        this._audio.stopGodMusic();
        if (this._player)        { this._player.dispose(); this._player = null; }
        if (this._entityManager) { this._entityManager.dispose(); this._entityManager = null; }
        const levelMeshNames = ['floor', 'ceiling'];
        for (const mesh of this._scene.meshes.slice()) {
            if (mesh.name.startsWith('wall_')     ||
                mesh.name.startsWith('graffiti_') ||
                mesh.name.startsWith('chart_')    ||
                levelMeshNames.includes(mesh.name)) {
                mesh.dispose();
            }
        }
    }

    _startNewGame() {
        this._cleanupLevel();
        // Reset session but keep player name
        this._sessionId     = null;
        this._gameStartTime = null;
        this._usedCheats    = false;
        // Hide mission select if visible
        if (this._missionSelectScreen) this._missionSelectScreen.style.display = 'none';
        // Show difficulty selection overlay (skip name input)
        this._state = GSTATE.MENU;
        const overlay = document.getElementById('overlay');
        overlay.classList.remove('hidden');
    }

    // ── Progress persistence ───────────────────────────────────────────────────────

    _loadProgress() {
        try {
            const saved = JSON.parse(localStorage.getItem('keboola_doom_progress') ?? '{}');
            this._unlockedMissions = saved.unlocked ?? 1;
            this._missionScores    = saved.scores   ?? [0, 0, 0, 0, 0];
            this._totalScore       = saved.total    ?? 0;
        } catch (e) { /* ignore */ }
    }

    _saveProgress() {
        try {
            localStorage.setItem('keboola_doom_progress', JSON.stringify({
                unlocked: this._unlockedMissions,
                scores:   this._missionScores,
                total:    this._totalScore,
            }));
        } catch (e) { /* ignore */ }
    }

    // ── Session tracking ───────────────────────────────────────────────────────

    _collectFingerprint() {
        const nav = navigator;
        const scr = screen;
        const signals = [
            `${scr.width}x${scr.height}`,
            Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
            nav.language ?? '',
            String(nav.hardwareConcurrency ?? ''),
            String(nav.deviceMemory ?? ''),
            String(scr.colorDepth ?? ''),
            nav.platform ?? '',
        ];
        // Simple FNV-1a-style hash over joined signals
        let h = 0x811c9dc5;
        for (const s of signals.join('|')) {
            h ^= s.charCodeAt(0);
            h = (Math.imul(h, 0x01000193) >>> 0);
        }
        return {
            screen_res:     `${scr.width}x${scr.height}`,
            timezone:       Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
            language:       nav.language ?? null,
            hw_concurrency: nav.hardwareConcurrency ?? null,
            device_memory:  nav.deviceMemory ?? null,
            color_depth:    scr.colorDepth ?? null,
            fingerprint:    h.toString(16),
        };
    }

    async _createSession(name) {
        try {
            const fp = this._collectFingerprint();
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ...fp }),
            });
            if (res.status === 409) {
                this._lastSessionError = 'NAME_TAKEN';
                return;
            }
            if (!res.ok) {
                const text = await res.text();
                console.error('[session] POST failed:', res.status, text);
                this._lastSessionError = `HTTP ${res.status}: ${text.slice(0, 80)}`;
                return;
            }
            const data = await res.json();
            this._sessionId = data.id;
        } catch (e) {
            console.error('[session] POST error:', e);
            this._lastSessionError = e.message;
        }
    }

    _getElapsedSeconds() {
        if (!this._gameStartTime) return 0;
        return Math.round((Date.now() - this._gameStartTime) / 1000);
    }

    async _updateSession({ levelReached, completed = false, saveTime = false }) {
        // Lazily create session if initial creation failed
        if (!this._sessionId) {
            await this._createSession(this._playerName);
        }
        if (!this._sessionId) {
            console.error('[session] Cannot update — session creation failed');
            return;
        }
        const body = {
            level_reached:      levelReached,
            total_time_seconds: saveTime ? this._getElapsedSeconds() : undefined,
            used_cheats:        this._usedCheats,
            completed,
            difficulty:         this._difficulty,
            kill_score:         this._totalScore + this._score,
        };
        try {
            const res = await fetch(`/api/sessions/${this._sessionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) console.error('[session] PATCH failed:', res.status, await res.text());
        } catch (e) {
            console.error('[session] PATCH error:', e);
        }
    }

    // ── Leaderboard ────────────────────────────────────────────────────────────

    async _loadLeaderboard() {
        try {
            const res = await fetch('/api/leaderboard');
            if (!res.ok) return [];
            return (await res.json()).entries ?? [];
        } catch (e) { return []; }
    }

    async _renderLeaderboard(containerId, highlightName) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const entries = await this._loadLeaderboard();
        if (entries.length === 0) {
            el.innerHTML = '<p class="lb-empty">NO ENTRIES YET</p>';
            return;
        }
        const DIFF_LABEL = ['JR', 'AE', 'DE'];
        const DIFF_COLOR = ['#44cc44', '#ffaa00', '#ff4444'];
        el.innerHTML = entries.map((e, i) => {
            const highlight = highlightName && e.name === highlightName ? ' lb-highlight' : '';
            const cheater   = e.used_cheats ? ' <span class="lb-cheater">CHEATER!!!</span>' : '';
            const noProgress = e.level_reached === 0 && !e.completed;
            const level     = noProgress ? '---' : `L${e.level_reached}${e.completed ? '✓' : ''}`;
            const t         = e.total_time_seconds;
            const h         = Math.floor(t / 3600);
            const m         = Math.floor((t % 3600) / 60);
            const s         = t % 60;
            const time      = noProgress ? '---' : (h > 0
                ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                : `${m}:${String(s).padStart(2,'0')}`);
            const diff      = e.difficulty ?? 1;
            const diffLabel = DIFF_LABEL[diff] ?? 'AE';
            const diffColor = DIFF_COLOR[diff] ?? '#ffaa00';
            const score     = (e.score ?? 0).toLocaleString();
            return `<div class="lb-entry${highlight}">
                <span class="lb-rank">#${i + 1}</span>
                <span class="lb-name">${e.name}${cheater}</span>
                <span class="lb-diff" style="color:${diffColor}">${diffLabel}</span>
                <span class="lb-level">${level}</span>
                <span class="lb-time">${time}</span>
                <span class="lb-score">${score}</span>
            </div>`;
        }).join('');
    }

    async _renderChangelog() {
        const el = document.getElementById('changelog-content');
        if (!el) return;
        try {
            const res = await fetch('changelog.md');
            if (!res.ok) return;
            const md = await res.text();
            // Simple markdown-to-HTML: h2 and list items
            let html = '';
            for (const line of md.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.startsWith('## '))      html += `<h2>${trimmed.slice(3)}</h2>`;
                else if (trimmed.startsWith('- '))   html += `<li>${trimmed.slice(2)}</li>`;
                else if (trimmed === '# Changelog')  continue;
                else if (trimmed === '')             continue;
                else                                 html += `<p>${trimmed}</p>`;
            }
            // Wrap consecutive <li> in <ul>
            html = html.replace(/((?:<li>.*?<\/li>)+)/g, '<ul>$1</ul>');
            el.innerHTML = html;
        } catch { /* changelog not available */ }
    }

    // ── Mission UI ─────────────────────────────────────────────────────────────────

    _showMissionSelect() {
        this._missionSelectScreen.style.display = 'flex';
        const list = document.getElementById('mission-list');
        list.innerHTML = '';
        MISSIONS.forEach((m, i) => {
            const locked = i >= this._unlockedMissions;
            const card   = document.createElement('button');
            card.className = 'mission-card' + (locked ? ' locked' : '');
            card.innerHTML = `
                <span class="mission-layer">${m.id}</span>
                <span class="mission-name">${m.name.toUpperCase()}</span>
                <span class="mission-boss">${locked ? '[ LOCKED ]' : m.briefing.bossName}</span>
                <span class="mission-score">BEST: ${this._missionScores[i] || '---'}</span>
            `;
            if (!locked) card.addEventListener('click', () => this._showBriefing(i));
            list.appendChild(card);
        });
        const totalEl = document.getElementById('mission-total');
        if (totalEl) totalEl.textContent = `TOTAL SCORE: ${this._totalScore}`;
    }

    _showBriefing(missionIdx) {
        this._currentMissionIdx = missionIdx;
        const m = MISSIONS[missionIdx];
        this._missionSelectScreen.style.display = 'none';
        this._missionBriefingScreen.style.display = 'flex';
        document.getElementById('briefing-layer').textContent = m.id;
        document.getElementById('briefing-title').textContent = m.briefing.title;
        document.getElementById('briefing-lines').innerHTML = m.briefing.lines.map(l => `<p>${l}</p>`).join('');
        document.getElementById('briefing-boss-name').textContent = m.briefing.bossName;
        document.getElementById('briefing-boss-desc').textContent = m.briefing.bossDesc;
    }

    _startMission(idx) {
        this._currentMissionIdx = idx;
        const mission = MISSIONS[idx];

        // Dispose previous session
        if (this._player)        { this._player.dispose(); this._player = null; }
        if (this._entityManager) { this._entityManager.dispose(); this._entityManager = null; }

        // Remove level geometry
        const levelMeshNames = ['floor', 'ceiling'];
        for (const mesh of this._scene.meshes.slice()) {
            if (mesh.name.startsWith('wall_')     ||
                mesh.name.startsWith('graffiti_') ||
                mesh.name.startsWith('chart_')    ||
                levelMeshNames.includes(mesh.name)) {
                mesh.dispose();
            }
        }

        buildLevel(this._scene, mission.map, mission.extraGraffiti);

        this._player        = new Player(mission.playerStart, this._scene, this._renderCanvas);
        this._entityManager = new EntityManager(mission, this._audio, this._scene, this._difficulty);
        this._weaponSystem  = new WeaponSystem(this._audio);
        this._score         = 0;

        this._player._map = mission.map;

        if (mission.mode === 'type_cast') {
            this._player.weapons = new Set(['cast_canon']);
            this._player.activeWeapon = 'cast_canon';
        }

        if (mission.mode === 'stakeholder_fight') {
            // Give all offensive weapons + unlimited KAI tokens; KAI active by default
            ['sql_gun', 'data_shotgun', 'super_shotgun', 'chaingun', 'pipeline_launcher', 'plasma_rifle', 'kai_assistant', 'drop_all_tables']
                .forEach(w => this._player.giveWeapon(w));
            this._player.activeWeapon = 'kai_assistant';
            this._player.ammo.tokens = MAX_AMMO.tokens;
            this._player.ammo.bullets = MAX_AMMO.bullets;
            this._player.ammo.shells  = MAX_AMMO.shells;
            this._player.ammo.rockets = MAX_AMMO.rockets;
        }

        // Start game timer on first mission of this session
        if (!this._gameStartTime) this._gameStartTime = Date.now();

        this._bossKilledSaved = false;  // reset per-level flag

        this._state = GSTATE.PLAYING;
        this._audio.startMusic();
    }

    // ── Per-frame update ───────────────────────────────────────────────────────

    _update(dt) {
        // Doom-style keyboard movement — fully manual
        const rotAmount  = ROT_SPEED  * (dt / 16);
        const moveAmount = MOVE_SPEED * (dt / 16);
        if (this._input.isDown('ArrowLeft'))  this._player.rotateY(-rotAmount);
        if (this._input.isDown('ArrowRight')) this._player.rotateY(+rotAmount);
        if (this._input.isDown('ArrowUp')   || this._input.isDown('KeyW')) this._player.move(+moveAmount);
        if (this._input.isDown('ArrowDown') || this._input.isDown('KeyS')) this._player.move(-moveAmount);

        this._player.update(dt);
        this._entityManager.update(dt, this._player);
        this._weaponSystem.update(dt, this._input, this._player, this._entityManager);
        this._entityManager.checkPickups(this._player, this._weaponSystem);
        this._score += this._entityManager.collectScore();

        // Save to DB as soon as boss is defeated — don't wait for level complete screen
        if (!this._bossKilledSaved && this._entityManager.bossDefeated()) {
            this._bossKilledSaved = true;
            this._updateSession({ levelReached: this._currentMissionIdx + 1, completed: false, saveTime: true });
        }

        if (this._player.isDead()) {
            this._state = GSTATE.DEAD;
            this._audio.stopMusic();
            this._audio.stopGodMusic();
            this._player.detachControl();
            this._audio.playFile('./crash.mp3');
            const _mission = MISSIONS[this._currentMissionIdx];
            const _mismatchMsg = (_mission.mode === 'type_cast')
                ? this._entityManager?.getTypeMismatchMessage()
                : null;
            document.getElementById('death-msg').textContent =
                _mismatchMsg || DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
            const deathTotal = this._totalScore + this._score;
            document.getElementById('death-score').textContent = `FINAL SCORE: ${deathTotal}`;
            this._updateSession({ levelReached: this._currentMissionIdx + 1, completed: false });
            this._deathScreen.style.display = 'flex';
            return;
        }

        if (this._entityManager.allEnemiesDefeated()) {
            this._state = GSTATE.LEVEL_COMPLETE;
            this._audio.stopMusic();
            this._audio.stopGodMusic();
            this._player.detachControl();
            this._audio.playFile('./success.mp3');

            const mission = MISSIONS[this._currentMissionIdx];
            const bonus   = mission.completionBonus ?? 5000;
            this._score  += bonus;

            this._missionScores[this._currentMissionIdx] = Math.max(
                this._missionScores[this._currentMissionIdx], this._score
            );
            this._totalScore += this._score;

            if (this._currentMissionIdx + 1 > this._unlockedMissions - 1) {
                this._unlockedMissions = Math.min(MISSIONS.length, this._currentMissionIdx + 2);
            }
            this._saveProgress();

            if (this._currentMissionIdx >= MISSIONS.length - 1) {
                // All missions complete — show win screen directly
                this._state = GSTATE.WIN;
                document.getElementById('win-score').textContent =
                    `TOTAL SCORE: ${this._totalScore} — ALL ${MISSIONS.length} LAYERS CLEARED`;
                this._updateSession({ levelReached: MISSIONS.length, completed: true, saveTime: true }).then(() => {
                    this._renderLeaderboard('win-lb-list', this._playerName);
                });
                this._winScreen.style.display = 'flex';
            } else {
                // Save progress after each completed level
                this._updateSession({ levelReached: this._currentMissionIdx + 1, completed: false, saveTime: true });
                // Show level complete screen
                const nextMission = MISSIONS[this._currentMissionIdx + 1];
                document.getElementById('lc-mission-name').textContent =
                    `${mission.id} — ${mission.name.toUpperCase()} CLEARED`;
                document.getElementById('lc-score').textContent =
                    `MISSION SCORE: ${this._score} (+${bonus} COMPLETION BONUS)`;
                document.getElementById('lc-next-mission').textContent =
                    `NEXT: ${nextMission.id} — ${nextMission.name.toUpperCase()} UNLOCKED`;
                this._levelCompleteScreen.style.display = 'flex';
            }
        }
    }

    // ── Cheat codes ────────────────────────────────────────────────────────────

    _cheatGodMode() {
        this._usedCheats = true;
        this._player.godMode = !this._player.godMode;
        console.log('[cheat] godMode =', this._player.godMode);
        if (this._player.godMode) {
            try { this._audio.startGodMusic(); } catch(e) { console.error('[cheat] startGodMusic failed:', e); }
            this._showCheat('IDDQD — GOD MODE ON: quota exceeded, damage ignored');
        } else {
            try { this._audio.stopGodMusic(); this._audio.startMusic(); } catch(e) { console.error('[cheat] stopGodMusic failed:', e); }
            this._showCheat('IDDQD — God mode off. Good luck.');
        }
    }

    _cheatNoclip() {
        this._usedCheats = true;
        this._player.noclip = !this._player.noclip;
        console.log('[cheat] noclip =', this._player.noclip);
        if (this._player.noclip) {
            this._showCheat('IDCLIP — noclip ON: walls are just a social construct');
        } else {
            this._showCheat('IDCLIP — noclip OFF: physical boundaries reinstated');
        }
    }

    _cheatAllWeapons() {
        this._usedCheats = true;
        const p = this._player;
        ['chainsaw', 'sql_gun', 'data_shotgun', 'super_shotgun', 'chaingun', 'pipeline_launcher', 'plasma_rifle', 'kai_assistant', 'drop_all_tables']
            .forEach(w => p.giveWeapon(w));
        p.armor = 100;
        Object.keys(p.ammo).forEach(k => { p.ammo[k] = MAX_AMMO[k] ?? 0; });
        this._showCheat('IDKFA — all components unlocked. KAI Assistant is ready. Use wisely.');
    }

    _showCheat(msg) {
        const el = document.getElementById('cheat-msg');
        el.textContent = msg;
        el.style.display = 'block';
        clearTimeout(this._cheatTimeout);
        this._cheatTimeout = setTimeout(() => { el.style.display = 'none'; }, 3500);
    }

    _showGameMessage(msg) {
        const el = document.getElementById('game-msg');
        el.textContent = msg;
        el.style.display = 'block';
        clearTimeout(this._gameMsgTimeout);
        this._gameMsgTimeout = setTimeout(() => { el.style.display = 'none'; }, 3000);
    }

    _drawHud() {
        const _currentMission = MISSIONS[this._currentMissionIdx];
        const killsLeft = (() => {
            if (!this._entityManager) return 0;
            if (_currentMission?.mode === 'type_cast') {
                const p = this._entityManager.getL2Progress();
                return p.total - p.inserted;
            }
            if (_currentMission?.mode === 'stakeholder_fight') {
                return this._entityManager.getDashboardCount();
            }
            return this._entityManager.enemies.filter(e => e.isAlive()).length;
        })();
        const enemies = this._entityManager ? this._entityManager.enemies : [];
        const mission = MISSIONS[this._currentMissionIdx];

        if (this._entityManager) {
            const msg = this._entityManager.popMessage();
            if (msg) this._showGameMessage(msg);
        }

        this._hud.draw(this._hudCtx, this._player, this._weaponSystem, this._score, killsLeft, enemies,
            mission?.id, mission?.name, this._getElapsedSeconds());
    }
}

window.addEventListener('DOMContentLoaded', () => new Game());
