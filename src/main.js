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
        this._score      = 0;
        this._difficulty = 1; // 0=easy, 1=medium, 2=hard
        this._currentMissionIdx = 0;
        this._unlockedMissions  = 1;
        this._missionScores     = [0, 0, 0, 0, 0];
        this._totalScore        = 0;
        this._loadProgress();

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

        const overlay = document.getElementById('overlay');
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
            this._showMissionSelect();
        });
        document.getElementById('briefing-back').addEventListener('click', () => {
            this._missionBriefingScreen.style.display = 'none';
            this._missionSelectScreen.style.display = 'flex';
        });
        document.getElementById('briefing-launch').addEventListener('click', () => {
            this._missionBriefingScreen.style.display = 'none';
            this._startMission(this._currentMissionIdx);
        });
        document.getElementById('pause-resume-btn').addEventListener('click', () => this._resumeFromPause());
        document.getElementById('pause-quit-btn').addEventListener('click', () => this._quitToMenu());
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
            if (this._cheatBuf.endsWith('iddqd')) this._cheatGodMode();
            if (this._cheatBuf.endsWith('idkfa')) this._cheatAllWeapons();
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
        this._state = GSTATE.MISSION_SELECT;
        this._showMissionSelect();
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

        if (this._player.isDead()) {
            this._state = GSTATE.DEAD;
            this._audio.stopMusic();
            this._audio.stopGodMusic();
            this._player.detachControl();
            this._audio.playFile('./crash.mp3');
            document.getElementById('death-msg').textContent =
                DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
            document.getElementById('death-score').textContent = `FINAL SCORE: ${this._score}`;
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
                this._winScreen.style.display = 'flex';
            } else {
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

    _cheatAllWeapons() {
        const p = this._player;
        ['sql_gun', 'data_shotgun', 'pipeline_launcher', 'bfd_9000', 'kai_assistant', 'drop_all_tables']
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

    _drawHud() {
        const killsLeft = this._entityManager
            ? this._entityManager.enemies.filter(e => e.isAlive()).length
            : 0;
        const enemies = this._entityManager ? this._entityManager.enemies : [];
        const mission = MISSIONS[this._currentMissionIdx];
        this._hud.draw(this._hudCtx, this._player, this._weaponSystem, this._score, killsLeft, enemies,
            mission?.id, mission?.name);
    }
}

window.addEventListener('DOMContentLoaded', () => new Game());
