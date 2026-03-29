// Main game loop and state machine — Babylon.js edition

import { createScene }      from './engine/scene.js';
import { ROT_SPEED, MOVE_SPEED, MAX_AMMO } from './config.js';
import { buildLevel }       from './engine/level.js';
import { InputState }       from './engine/input.js';
import { LEVEL_1 }          from './engine/map.js';
import { Player }           from './game/player.js';
import { EntityManager }    from './game/entities.js';
import { WeaponSystem }     from './game/weapons.js';
import { HUD }              from './game/hud.js';
import { AudioManager }     from './game/audio.js';

const GSTATE = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', DEAD: 'dead', WIN: 'win' };

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

        const overlay = document.getElementById('overlay');
        document.getElementById('btn-easy').addEventListener('click', () => {
            this._difficulty = 0;
            overlay.classList.add('hidden');
            this._startGame();
        });
        document.getElementById('btn-medium').addEventListener('click', () => {
            this._difficulty = 1;
            overlay.classList.add('hidden');
            this._startGame();
        });
        document.getElementById('btn-hard').addEventListener('click', () => {
            this._difficulty = 2;
            overlay.classList.add('hidden');
            this._startGame();
        });
        document.getElementById('retry-btn').addEventListener('click', () => {
            this._deathScreen.style.display = 'none';
            this._startGame();
        });
        document.getElementById('win-retry-btn').addEventListener('click', () => {
            this._winScreen.style.display = 'none';
            this._startGame();
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
                else if (this._state === GSTATE.PAUSED) this._resumeFromPause();
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
        // Dispose previous session
        if (this._player)        { this._player.dispose(); this._player = null; }
        if (this._entityManager) { this._entityManager.dispose(); this._entityManager = null; }

        // Remove level geometry from previous run (walls, floor, ceiling)
        // Use name prefix matching to avoid touching GlowLayer internal meshes
        const levelMeshNames = ['floor', 'ceiling'];
        for (const mesh of this._scene.meshes.slice()) {
            if (mesh.name.startsWith('wall_')     ||
                mesh.name.startsWith('graffiti_') ||
                levelMeshNames.includes(mesh.name)) {
                mesh.dispose();
            }
        }

        const level = LEVEL_1;
        buildLevel(this._scene, level.map);

        this._player        = new Player(level.playerStart, this._scene, this._renderCanvas);
        this._entityManager = new EntityManager(level, this._audio, this._scene, this._difficulty);
        this._weaponSystem  = new WeaponSystem(this._audio);
        this._score         = 0;

        this._player._map = level.map;

        this._state = GSTATE.PLAYING;
        this._audio.startMusic();
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
            this._state = GSTATE.WIN;
            this._audio.stopMusic();
            this._audio.stopGodMusic();
            this._player.detachControl();
            this._score += 5000;
            this._audio.playFile('./success.mp3');
            document.getElementById('win-score').textContent = `PIPELINE SCORE: ${this._score} (+5000 COMPLETION BONUS)`;
            this._winScreen.style.display = 'flex';
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
        ['sql_gun', 'data_shotgun', 'pipeline_launcher', 'bfd_9000', 'kai_assistant']
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
        this._hud.draw(this._hudCtx, this._player, this._weaponSystem, this._score, killsLeft);
    }
}

window.addEventListener('DOMContentLoaded', () => new Game());
