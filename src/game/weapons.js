// Weapon system — fire rate, animation state, weapon switching

import { WEAPON_DEFS } from '../config.js';

const ANIM = { IDLE: 0, FIRE: 1, LOWER: 2, RAISE: 3 };

const WEAPON_ORDER = ['fist', 'sql_gun', 'data_shotgun', 'pipeline_launcher', 'bfd_9000', 'kai_assistant', 'drop_all_tables'];

export class WeaponSystem {
    constructor(audio) {
        this.audio = audio;

        this.animState      = ANIM.IDLE;
        this.animTimer      = 0;
        this._pendingSwitch = null;
        this._lastFireTime  = -99999;
        this.flashTimer     = 0;
    }

    // input: InputState instance (has isDown(), mouseLeft, consumeWheel())
    update(dt, input, player, entityManager) {
        const def = WEAPON_DEFS[player.activeWeapon];

        // ── Weapon switch: keys 1-5 ───────────────────────────────────────────
        const keyMap = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'];
        for (let i = 0; i < keyMap.length; i++) {
            if (input.isDown(keyMap[i]) && player.hasWeapon(WEAPON_ORDER[i])) {
                this._requestSwitch(player, WEAPON_ORDER[i]);
                break;
            }
        }

        // ── Weapon switch: scroll wheel ───────────────────────────────────────
        const wheel = input.consumeWheel();
        if (wheel !== 0) {
            const owned = WEAPON_ORDER.filter(id => player.hasWeapon(id));
            if (owned.length > 1) {
                const cur  = owned.indexOf(player.activeWeapon);
                const next = ((cur + Math.sign(wheel)) + owned.length) % owned.length;
                this._requestSwitch(player, owned[next]);
            }
        }

        // ── Animation state machine ───────────────────────────────────────────
        if (this.animState === ANIM.FIRE) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                this.animState = ANIM.IDLE;
                if (this._pendingSwitch) {
                    this.animState = ANIM.LOWER;
                    this.animTimer = 80;
                }
            }
        } else if (this.animState === ANIM.LOWER) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                player.activeWeapon = this._pendingSwitch;
                this._pendingSwitch = null;
                this.animState = ANIM.RAISE;
                this.animTimer = 80;
            }
        } else if (this.animState === ANIM.RAISE) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                this.animState = ANIM.IDLE;
                this.animTimer = 0;
            }
        }

        if (this.flashTimer > 0) this.flashTimer -= dt;

        // ── Fire ──────────────────────────────────────────────────────────────
        const wantFire = input.isDown('Space') || input.mouseLeft;

        if (wantFire && this.animState === ANIM.IDLE) {
            const now = performance.now();
            if (now - this._lastFireTime >= def.fireRate) {
                if (this._canFire(player, def)) {
                    if (def.ammoType) {
                        player.ammo[def.ammoType] = Math.max(0,
                            player.ammo[def.ammoType] - def.ammoPerShot);
                    }
                    this.audio.play(def.id);
                    this.flashTimer = 70;
                    entityManager.firePlayerWeapon(player, def);
                    this._lastFireTime = now;
                    this.animState = ANIM.FIRE;
                    this.animTimer = Math.min(def.fireRate * 0.55, 400);
                }
            }
        }
    }

    _requestSwitch(player, id) {
        if (id === player.activeWeapon) return;
        if (!player.hasWeapon(id)) return;
        if (this.animState === ANIM.LOWER || this.animState === ANIM.RAISE) return;
        if (this._pendingSwitch === id) return;
        this._pendingSwitch = id;
        if (this.animState === ANIM.IDLE) {
            this.animState = ANIM.LOWER;
            this.animTimer = 80;
        }
    }

    _canFire(player, def) {
        if (!def.ammoType) return true;
        return (player.ammo[def.ammoType] ?? 0) >= def.ammoPerShot;
    }

    // Called by Item.tryPickup to trigger weapon raise animation
    _requestSwitchExternal(player, id) { this._requestSwitch(player, id); }

    getLowerRaise() {
        if (this.animState === ANIM.LOWER) return this.animTimer / 80;
        if (this.animState === ANIM.RAISE) return 1 - this.animTimer / 80;
        return 0;
    }

    isFiring() { return this.animState === ANIM.FIRE; }
    hasFlash()  { return this.flashTimer > 0; }
}
