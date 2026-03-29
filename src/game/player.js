// Player — wraps Babylon UniversalCamera with Doom-style health/ammo/weapon state

import {
    PLAYER_MAX_HEALTH, PLAYER_MAX_ARMOR,
    STARTING_AMMO, MAX_AMMO,
    MOVE_SPEED, PLAYER_COLLISION_RADIUS,
} from '../config.js';

export class Player {
    constructor(startPos, scene, canvas) {
        this._scene  = scene;
        this._canvas = canvas;

        // ── Camera ────────────────────────────────────────────────────────────
        const sx = startPos.x;
        const sz = startPos.y; // 2D y maps to Babylon Z

        this._camera = new BABYLON.UniversalCamera(
            'player_cam',
            new BABYLON.Vector3(sx, 0.5, sz),
            scene,
        );

        this._camera.setTarget(new BABYLON.Vector3(
            sx + startPos.dirX,
            0.5,
            sz + startPos.dirY,
        ));

        // MOVE_SPEED is per-frame at 60 fps — multiply by 60 for Babylon's unit/s speed
        this._camera.speed              = MOVE_SPEED * 60;
        this._camera.angularSensibility = 800;
        this._camera.checkCollisions    = true;
        this._camera.ellipsoid          = new BABYLON.Vector3(0.28, 0.45, 0.28);
        this._camera.minZ               = 0.05;
        this._camera.maxZ               = 28;
        this._camera.fov                = 1.05; // ~60 deg, close to classic Doom FOV

        scene.activeCamera = this._camera;

        // Attach controls then immediately strip all inputs — movement is fully manual
        this._camera.attachControl(canvas, true);
        ['mouse', 'keyboard', 'mousewheel', 'touch'].forEach(key => {
            const inp = this._camera.inputs.attached[key];
            if (inp) this._camera.inputs.remove(inp);
        });

        // Lock vertical position and pitch — pure Doom-style flat view
        this._yLockObs = scene.registerBeforeRender(() => {
            this._camera.position.y = 0.5;
            this._camera.rotation.x = 0; // no looking up/down
        });

        // ── Flashlight ────────────────────────────────────────────────────────
        this._light = new BABYLON.PointLight('player_light',
            new BABYLON.Vector3(sx, 0.5, sz), scene);
        this._light.diffuse   = new BABYLON.Color3(1.0, 0.95, 0.85);
        this._light.specular  = new BABYLON.Color3(0.2, 0.2, 0.3);
        this._light.intensity = 4.0;
        this._light.range     = 18;

        // ── Game state ────────────────────────────────────────────────────────
        this.health       = PLAYER_MAX_HEALTH;
        this.armor        = 0;
        this.ammo         = { ...STARTING_AMMO };
        this.weapons      = new Set(['fist', 'sql_gun']);
        this.activeWeapon = 'sql_gun';
        this.hurtTimer    = 0;
        this.bobPhase     = 0;
        this.bobSpeed     = 0;

        this.godMode = false;   // iddqd cheat — invincible

        this._map   = null; // set externally for minimap
        this._prevX = sx;
        this._prevZ = sz;
    }

    // ── Accessors (2D game logic: x = Babylon X, y = Babylon Z) ───────────────
    get x() { return this._camera.position.x; }
    get y() { return this._camera.position.z; }

    // Horizontal look direction (Y-projected)
    get dirX() {
        const d   = this._camera.getForwardRay().direction;
        const len = Math.sqrt(d.x * d.x + d.z * d.z);
        return len > 0.001 ? d.x / len : 1;
    }
    get dirY() {
        const d   = this._camera.getForwardRay().direction;
        const len = Math.sqrt(d.x * d.x + d.z * d.z);
        return len > 0.001 ? d.z / len : 0;
    }

    get camera() { return this._camera; }

    // ── Per-frame update ───────────────────────────────────────────────────────
    update(dt) {
        this._light.position.copyFrom(this._camera.position);

        if (this.hurtTimer > 0) this.hurtTimer = Math.max(0, this.hurtTimer - dt);

        const dx = this._camera.position.x - this._prevX;
        const dz = this._camera.position.z - this._prevZ;
        if (Math.sqrt(dx * dx + dz * dz) > 0.002) {
            this.bobSpeed  = Math.min(this.bobSpeed + dt * 0.005, 1);
            this.bobPhase += dt * 0.008;
        } else {
            this.bobSpeed *= 0.85;
            this.bobPhase += dt * 0.001;
        }

        this._prevX = this._camera.position.x;
        this._prevZ = this._camera.position.z;
    }

    // ── Damage / pickups ───────────────────────────────────────────────────────
    takeDamage(amount) {
        if (this.godMode) return;   // iddqd active
        if (this.armor > 0) {
            const absorbed = Math.min(this.armor, Math.floor(amount * 0.5));
            this.armor  -= absorbed;
            amount      -= absorbed;
        }
        this.health    = Math.max(0, this.health - amount);
        this.hurtTimer = 300;
    }

    addHealth(amount) { this.health = Math.min(PLAYER_MAX_HEALTH, this.health + amount); }
    addArmor(amount)  { this.armor  = Math.min(PLAYER_MAX_ARMOR,  this.armor  + amount); }

    addAmmo(type, amount) {
        this.ammo[type] = Math.min(MAX_AMMO[type] ?? 999, (this.ammo[type] ?? 0) + amount);
    }

    hasWeapon(id)  { return this.weapons.has(id); }
    giveWeapon(id) { this.weapons.add(id); }

    isDead() { return this.health <= 0; }
    isHurt() { return this.hurtTimer > 0; }

    // ── Manual movement with grid-based collision ─────────────────────────────
    move(speed) {
        const cam = this._camera;
        const fwd = cam.getForwardRay().direction;
        const dx  = fwd.x * speed;
        const dz  = fwd.z * speed;
        const R   = PLAYER_COLLISION_RADIUS;

        const nx = cam.position.x + dx;
        const nz = cam.position.z + dz;

        if (!this._wallAt(nx, cam.position.z, R)) cam.position.x = nx;
        if (!this._wallAt(cam.position.x, nz, R)) cam.position.z = nz;
    }

    _wallAt(x, z, R) {
        const map = this._map;
        if (!map) return false;
        const corners = [[x+R,z+R],[x-R,z+R],[x+R,z-R],[x-R,z-R]];
        return corners.some(([cx,cz]) => {
            const row = map[Math.floor(cz)];
            return row ? row[Math.floor(cx)] > 0 : true;
        });
    }

    // ── Manual rotation ───────────────────────────────────────────────────────
    rotateY(radians) {
        this._camera.rotation.y += radians;
    }

    // ── Pointer-lock helpers ──────────────────────────────────────────────────
    detachControl() { this._camera.detachControl(); }
    attachControl() { this._camera.attachControl(this._canvas, true); }

    dispose() {
        this._scene.unregisterBeforeRender(this._yLockObs);
        this._camera.dispose();
        this._light.dispose();
    }
}
