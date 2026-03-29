// Input tracking — game action keys and mouse buttons
// WASD / mouse-look movement is handled by Babylon UniversalCamera natively.
// This class tracks only game-specific actions: fire, weapon switch, scroll.

export class InputState {
    constructor() {
        this._down = new Set();

        this.mouseLeft  = false;
        this._wheelAcc  = 0;

        document.addEventListener('keydown', e => {
            this._down.add(e.code);
            if (e.code === 'Tab') e.preventDefault();
        });
        document.addEventListener('keyup',   e => this._down.delete(e.code));

        document.addEventListener('mousedown', e => {
            if (e.button === 0) this.mouseLeft = true;
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 0) this.mouseLeft = false;
        });

        document.addEventListener('wheel', e => {
            this._wheelAcc += e.deltaY > 0 ? 1 : -1;
        }, { passive: true });

        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    isDown(code) { return this._down.has(code); }

    // Consume accumulated wheel delta — call once per frame in weapons update
    consumeWheel() {
        const d = this._wheelAcc;
        this._wheelAcc = 0;
        return d;
    }
}
