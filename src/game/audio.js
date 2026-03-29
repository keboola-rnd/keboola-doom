// Audio system — procedural sounds + E1M1-inspired music via Web Audio API

export class AudioManager {
    constructor() {
        this._ctx          = null;
        this._enabled      = true;
        this._musicActive  = false;
        this._musicTimer   = null;
        this._musicGain    = null;
        this._godActive    = false;
        this._godTimer     = null;
        this._distCurve    = null;
        this._init();
    }

    _init() {
        try {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
            // Master music gain node — mute/unmute without canceling scheduled nodes
            this._musicGain = this._ctx.createGain();
            this._musicGain.gain.value = 1;
            this._musicGain.connect(this._ctx.destination);
            // Separate gain for god-mode hero music
            this._godGain = this._ctx.createGain();
            this._godGain.gain.value = 1;
            this._godGain.connect(this._ctx.destination);
        } catch (e) {
            this._enabled = false;
        }
    }

    // ── Music ─────────────────────────────────────────────────────────────────

    startMusic() {
        if (!this._enabled || !this._ctx || this._musicActive) return;
        this._resume();
        // Fresh gain node — orphans any still-running oscillators from the previous loop
        this._musicGain = this._ctx.createGain();
        this._musicGain.gain.value = 1;
        this._musicGain.connect(this._ctx.destination);
        this._musicActive = true;
        this._scheduleMusicLoop(this._ctx.currentTime + 0.1);
    }

    stopMusic() {
        this._musicActive = false;
        if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
        if (this._musicGain) {
            this._musicGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.05);
        }
    }

    // ── God-mode hero music ───────────────────────────────────────────────────

    startGodMusic() {
        if (!this._enabled || !this._ctx) return;
        if (this._godActive) return;
        this.stopMusic();
        this._resume();
        this._godActive = true;
        // Fresh gain node — orphans old oscillators
        this._godGain = this._ctx.createGain();
        this._godGain.gain.value = 1;
        this._godGain.connect(this._ctx.destination);
        this._scheduleGodMusicLoop(this._ctx.currentTime + 0.05);
    }

    stopGodMusic() {
        this._godActive = false;
        if (this._godTimer) { clearTimeout(this._godTimer); this._godTimer = null; }
        if (this._godGain) {
            this._godGain.gain.setTargetAtTime(0, this._ctx.currentTime, 0.08);
        }
    }

    // Triumphant 4-bar C-major hero loop at 200 BPM
    _scheduleGodMusicLoop(startTime) {
        if (!this._godActive) return;
        const ctx = this._ctx;
        const h   = this._hz.bind(this);

        const BPM = 200;
        const S16 = 60 / (BPM * 4);
        const BAR = S16 * 16;
        const BARS = 4;
        const totalDur = BARS * BAR;

        const __ = null;
        const C4=h('C',4), D4=h('D',4), E4=h('E',4), F4=h('F',4), G4=h('G',4), A4=h('A',4), B4=h('B',4);
        const C5=h('C',5), D5=h('D',5), E5=h('E',5), F5=h('F',5), G5=h('G',5), A5=h('A',5), B5=h('B',5);
        const C6=h('C',6);
        const A3=h('A',3), F3=h('F',3), G3=h('G',3), B3=h('B',3), D3=h('D',3);
        const C3=h('C',3), G2=h('G',2), A2=h('A',2);

        // Lead melody — bright triumphant C-major fanfare
        const melody = [
            // Bar 1 (C — ascending fanfare)
            [C5,2],[E5,2],[G5,2],[C6,2],[B5,1],[A5,1],[G5,2],[E5,2],[C5,2],
            // Bar 2 (Am/F — development, running 8ths)
            [A5,2],[G5,2],[F5,2],[E5,2],[D5,2],[E5,2],[F5,2],[G5,2],
            // Bar 3 (G — climbing tension)
            [G5,1],[A5,1],[B5,2],[C6,2],[B5,2],[A5,2],[G5,1],[F5,1],[E5,2],[D5,2],
            // Bar 4 (C — triumphant resolve)
            [C5,2],[E5,2],[G5,2],[E5,2],[C6,4],[G5,2],[E5,2],
        ];

        // Harmony (triangle oscillator for softer counterpoint)
        const harmony = [
            // Bar 1 — thirds below lead
            [E4,2],[G4,2],[B4,2],[E5,2],[D5,1],[C5,1],[B4,2],[G4,2],[E4,2],
            // Bar 2
            [F4,2],[E4,2],[D4,2],[C4,2],[B3,2],[C4,2],[D4,2],[E4,2],
            // Bar 3
            [B3,1],[C4,1],[D4,2],[E4,2],[D4,2],[C4,2],[B3,1],[A3,1],[G3,2],[F3,2],
            // Bar 4
            [E4,2],[G4,2],[B4,2],[G4,2],[E5,4],[B4,2],[G4,2],
        ];

        // Arpeggio chords
        const arpChords = [
            [C4,E4,G4,C5],  // C major
            [A3,C4,E4,A4],  // A minor
            [G3,B3,D4,G4],  // G major
            [C4,E4,G4,C5],  // C major
        ];

        // Bass (quarter notes)
        const bass = [
            [C3,4],[G2,4],[C3,4],[G2,4],   // bar 1 — C
            [A2,4],[F3,4],[A2,4],[F3,4],   // bar 2 — Am/F
            [G2,4],[D3,4],[G2,4],[D3,4],   // bar 3 — G
            [C3,4],[G2,4],[C3,8],          // bar 4 — C resolve
        ];

        // Schedule lead melody
        let t = startTime;
        for (const [freq, dur] of melody) {
            const secs = dur * S16;
            if (freq !== null) this._godNote(freq, t, secs * 0.82, 0.22, 'square');
            t += secs;
        }

        // Schedule harmony (triangle — softer, warmer)
        let ht = startTime;
        for (const [freq, dur] of harmony) {
            const secs = dur * S16;
            if (freq !== null) this._godNote(freq, ht, secs * 0.78, 0.10, 'triangle');
            ht += secs;
        }

        // Schedule arpeggio
        for (let bar = 0; bar < BARS; bar++) {
            const barStart = startTime + bar * BAR;
            this._godArpBar(arpChords[bar], barStart, S16, BAR, 0.07);
        }

        // Schedule bass
        let bt = startTime;
        for (const [freq, dur] of bass) {
            const secs = dur * S16;
            if (freq !== null) this._godNote(freq, bt, secs * 0.88, 0.30, 'square', true);
            bt += secs;
        }

        // Drums — march-style, punchy
        for (let bar = 0; bar < BARS; bar++) {
            const bs = startTime + bar * BAR;
            const Q  = S16 * 4;

            // Kick: beat 1 + beat 3
            this._8bitKick(bs);
            this._8bitKick(bs + Q * 2);
            // Snare: beat 2 + beat 4
            this._8bitSnare(bs + Q);
            this._8bitSnare(bs + Q * 3);
            // 8th hihats
            for (let i = 0; i < 8; i++) this._8bitHihat(bs + i * S16 * 2, 0.04);
            // Extra kick accent on beat 1-and (heroic double-time feel)
            this._8bitKick(bs + S16 * 2);
        }

        this._godTimer = setTimeout(() => {
            this._scheduleGodMusicLoop(this._ctx.currentTime + 0.05);
        }, (totalDur - 0.1) * 1000);
    }

    // Like _8bitNote but routes to _godGain
    _godNote(freq, startTime, duration, vol, type = 'square', lowpass = false) {
        const ctx = this._ctx;
        if (startTime < ctx.currentTime) return;

        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
        gain.gain.setValueAtTime(vol, startTime + duration * 0.7);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        if (lowpass) {
            const lpf = ctx.createBiquadFilter();
            lpf.type = 'lowpass';
            lpf.frequency.value = freq * 3;
            lpf.Q.value = 1;
            gain.connect(lpf);
            lpf.connect(this._godGain);
        } else {
            gain.connect(this._godGain);
        }

        osc.connect(gain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    // Like _arpBar but routes to _godGain
    _godArpBar(chordTones, startTime, S16, duration, vol) {
        const ctx = this._ctx;
        if (startTime < ctx.currentTime) return;

        const osc = ctx.createOscillator();
        osc.type = 'square';

        const steps = Math.round(duration / S16);
        for (let i = 0; i < steps; i++) {
            osc.frequency.setValueAtTime(
                chordTones[i % chordTones.length],
                startTime + i * S16,
            );
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.setValueAtTime(vol, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(this._godGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    // Convert note name + octave to Hz
    _hz(note, oct) {
        const S = {C:0,Cs:1,D:2,Ds:3,E:4,F:5,Fs:6,G:7,Gs:8,A:9,As:10,B:11};
        return 440 * Math.pow(2, ((oct - 4) * 12 + S[note] - 9) / 12);
    }

    // 8-bar action loop in D minor — 4 channels: lead, arpeggio, bass, drums
    _scheduleMusicLoop(startTime) {
        if (!this._musicActive) return;
        const ctx = this._ctx;
        const h   = this._hz.bind(this);

        const BPM = 178;
        const S16 = 60 / (BPM * 4); // sixteenth-note duration
        const BAR = S16 * 16;        // one bar = 16 sixteenths
        const BARS = 8;
        const totalDur = BARS * BAR; // ~10.8 s

        // ── Frequencies ──
        const __ = null;
        const D3=h('D',3), E3=h('E',3), F3=h('F',3), G3=h('G',3), A3=h('A',3);
        const Bb3=h('As',3), C4=h('C',4), D4=h('D',4), E4=h('E',4), F4=h('F',4);
        const G4=h('G',4), A4=h('A',4), Bb4=h('As',4), C5=h('C',5), D5=h('D',5);
        const E5=h('E',5), F5=h('F',5), G5=h('G',5), A5=h('A',5), Cs5=h('Cs',5);
        const A2=h('A',2), Bb2=h('As',2), C3=h('C',3), G2=h('G',2), D2=h('D',2);

        // ── Channel 1: Lead melody (square wave, staccato)
        // Format: [freq|null, duration_in_16ths]
        const melody = [
            // Bar 1 (Dm) — driving riff
            [D5,2],[C5,1],[Bb4,1],[A4,2],[G4,1],[A4,1],[Bb4,2],[C5,2],[D5,3],[__,1],
            // Bar 2 (Dm)
            [D5,1],[__,1],[F5,2],[E5,2],[D5,2],[C5,1],[Bb4,1],[A4,2],[G4,2],[A4,2],
            // Bar 3 (Bb) — climbs
            [Bb4,2],[D5,2],[F5,2],[G5,2],[F5,2],[D5,2],[Bb4,2],[A4,2],
            // Bar 4 (C) — tension
            [C5,2],[E5,2],[G5,2],[A5,2],[G5,2],[E5,2],[C5,2],[D5,2],
            // Bar 5 (Gm) — push
            [G4,2],[Bb4,2],[D5,2],[G5,2],[F5,2],[D5,2],[Bb4,2],[A4,2],
            // Bar 6 (Dm) — soar
            [A4,2],[D5,2],[F5,2],[A5,2],[G5,2],[F5,2],[E5,2],[D5,2],
            // Bar 7 (C) — drive
            [C5,2],[D5,2],[E5,2],[G5,4],[E5,2],[D5,2],[C5,2],
            // Bar 8 (Dm/A) — resolve
            [D5,2],[Cs5,2],[D5,4],[__,4],[D4,2],[__,2],
        ];

        // ── Channel 2: Arpeggio (single oscillator, pitch changes every 16th)
        // One chord per bar — cycling through chord tones at 16th speed
        const arpChords = [
            [D4,F4,A4,D5], // Dm
            [D4,F4,A4,D5], // Dm
            [Bb3,D4,F4,Bb4], // Bb
            [C4,E4,G4,C5],   // C
            [G3,Bb3,D4,G4],  // Gm
            [D4,F4,A4,D5],   // Dm
            [C4,E4,G4,C5],   // C
            [D4,F4,A4,D5],   // Dm
        ];

        // ── Channel 3: Bass (triangle-like — square + low-pass, quarter notes)
        const bass = [
            [D3,4],[A2,4],[F3,4],[A2,4],    // bar 1
            [D3,4],[C3,4],[Bb2,4],[A2,4],   // bar 2
            [Bb2,4],[F3,4],[Bb2,4],[D3,4],  // bar 3
            [C3,4],[G3,4],[C3,4],[E3,4],    // bar 4
            [G2,4],[D3,4],[G2,4],[Bb2,4],   // bar 5
            [D3,4],[A2,4],[D3,4],[F3,4],    // bar 6
            [C3,4],[G3,4],[C3,4],[G3,4],    // bar 7
            [D3,4],[A2,4],[D3,4],[__,4],    // bar 8
        ];

        // ── Schedule lead melody ──
        let t = startTime;
        for (const [freq, dur] of melody) {
            const secs = dur * S16;
            if (freq !== null) this._8bitNote(freq, t, secs * 0.80, 0.20, 'square');
            t += secs;
        }

        // ── Schedule arpeggio (one oscillator per bar, rapid pitch changes) ──
        for (let bar = 0; bar < BARS; bar++) {
            const barStart = startTime + bar * BAR;
            const chord    = arpChords[bar];
            this._arpBar(chord, barStart, S16, BAR, 0.08);
        }

        // ── Schedule bass ──
        let bt = startTime;
        for (const [freq, dur] of bass) {
            const secs = dur * S16;
            if (freq !== null) this._8bitNote(freq, bt, secs * 0.88, 0.28, 'square', true);
            bt += secs;
        }

        // ── Schedule drums (8 bars) ──
        for (let bar = 0; bar < BARS; bar++) {
            const bs = startTime + bar * BAR;
            const Q  = S16 * 4; // quarter note

            // Kick: beat 1 + beat 3
            this._8bitKick(bs);
            this._8bitKick(bs + Q * 2);
            // Extra kick on beat 2-and (bar 2, 4, 6, 8)
            if (bar % 2 === 1) this._8bitKick(bs + Q * 1.5);

            // Snare: beat 2 + beat 4
            this._8bitSnare(bs + Q);
            this._8bitSnare(bs + Q * 3);

            // Closed hihat: every 8th note
            for (let i = 0; i < 8; i++) this._8bitHihat(bs + i * S16 * 2, 0.05);
            // Open hihat accent on beat 3
            this._8bitHihat(bs + Q * 2, 0.12);
        }

        // Schedule next loop before this one ends
        this._musicTimer = setTimeout(() => {
            this._scheduleMusicLoop(this._ctx.currentTime + 0.05);
        }, (totalDur - 0.1) * 1000);
    }

    // Single square-wave 8-bit note
    _8bitNote(freq, startTime, duration, vol, type = 'square', lowpass = false) {
        const ctx = this._ctx;
        if (startTime < ctx.currentTime) return;

        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
        gain.gain.setValueAtTime(vol, startTime + duration * 0.7);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        let out = gain;
        if (lowpass) {
            const lpf = ctx.createBiquadFilter();
            lpf.type = 'lowpass';
            lpf.frequency.value = freq * 3;
            lpf.Q.value = 1;
            gain.connect(lpf);
            lpf.connect(this._musicGain);
        } else {
            gain.connect(this._musicGain);
        }

        osc.connect(gain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    // Arpeggio: one oscillator, pitch changes every 16th note (NES-style chord simulation)
    _arpBar(chordTones, startTime, S16, duration, vol) {
        const ctx = this._ctx;
        if (startTime < ctx.currentTime) return;

        const osc  = ctx.createOscillator();
        osc.type   = 'square';

        const steps = Math.round(duration / S16);
        for (let i = 0; i < steps; i++) {
            osc.frequency.setValueAtTime(
                chordTones[i % chordTones.length],
                startTime + i * S16,
            );
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.setValueAtTime(vol, startTime + duration - 0.01);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(this._musicGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    // 8-bit kick: sine sweep down
    _8bitKick(startTime) {
        const ctx = this._ctx;
        if (startTime < ctx.currentTime) return;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, startTime);
        osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.12);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.75, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(this._musicGain);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
    }

    // 8-bit snare: short noise burst + ping
    _8bitSnare(startTime) {
        const ctx   = this._ctx;
        if (startTime < ctx.currentTime) return;

        const len  = Math.floor(ctx.sampleRate * 0.1);
        const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        const src  = ctx.createBufferSource();
        src.buffer = buf;

        const hpf  = ctx.createBiquadFilter();
        hpf.type   = 'highpass';
        hpf.frequency.value = 1200;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

        src.connect(hpf); hpf.connect(gain); gain.connect(this._musicGain);
        src.start(startTime); src.stop(startTime + 0.12);

        // Tonal ping for 8-bit character
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, startTime);
        osc.frequency.exponentialRampToValueAtTime(150, startTime + 0.06);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.15, startTime);
        g2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
        osc.connect(g2); g2.connect(this._musicGain);
        osc.start(startTime); osc.stop(startTime + 0.08);
    }

    // 8-bit hihat: very short filtered noise
    _8bitHihat(startTime, vol = 0.05) {
        const ctx  = this._ctx;
        if (startTime < ctx.currentTime) return;

        const len  = Math.floor(ctx.sampleRate * 0.025);
        const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        const src  = ctx.createBufferSource();
        src.buffer = buf;

        const hpf  = ctx.createBiquadFilter();
        hpf.type   = 'highpass';
        hpf.frequency.value = 8000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.025);

        src.connect(hpf); hpf.connect(gain); gain.connect(this._musicGain);
        src.start(startTime); src.stop(startTime + 0.03);
    }

    _resume() {
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
    }

    // Play a short noise burst (weapon fire)
    _noise(duration, freq, decay, vol = 0.4, type = 'sawtooth') {
        if (!this._enabled) return;
        this._resume();
        const ctx = this._ctx;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-decay * i / data.length);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;

        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.frequency.exponentialRampToValueAtTime(freq * 0.1, ctx.currentTime + duration);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
        src.stop(ctx.currentTime + duration);
    }

    _tone(freq, duration, vol = 0.3, type = 'square') {
        if (!this._enabled) return;
        this._resume();
        const ctx = this._ctx;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + duration);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }

    // Play an external audio file through the existing AudioContext (avoids autoplay blocks)
    playFile(url) {
        if (!this._enabled || !this._ctx) return;
        this._resume();
        const cached = this._fileCache?.[url];
        if (cached) {
            const src = this._ctx.createBufferSource();
            src.buffer = cached;
            src.connect(this._ctx.destination);
            src.start(0);
            return;
        }
        fetch(url)
            .then(r => r.arrayBuffer())
            .then(buf => this._ctx.decodeAudioData(buf))
            .then(decoded => {
                if (!this._fileCache) this._fileCache = {};
                this._fileCache[url] = decoded;
                const src = this._ctx.createBufferSource();
                src.buffer = decoded;
                src.connect(this._ctx.destination);
                src.start(0);
            })
            .catch(e => console.error('[audio] playFile failed:', url, e));
    }

    play(name) {
        if (!this._enabled) return;
        switch (name) {
            case 'fist':
                this._noise(0.08, 80, 8, 0.5, 'sawtooth');
                break;
            case 'sql_gun':
                this._noise(0.12, 300, 12, 0.5);
                this._tone(800, 0.05, 0.2, 'square');
                break;
            case 'data_shotgun':
                this._noise(0.25, 120, 5, 0.7, 'sawtooth');
                this._tone(200, 0.15, 0.3, 'sawtooth');
                break;
            case 'pipeline_launcher':
                this._noise(0.3, 80, 3, 0.7);
                this._tone(400, 0.2, 0.4, 'sawtooth');
                this._tone(150, 0.3, 0.3, 'sine');
                break;
            case 'bfd_9000':
                this._noise(0.5, 60, 2, 0.9);
                this._tone(1200, 0.4, 0.5, 'square');
                this._tone(300, 0.5, 0.4, 'sawtooth');
                break;
            case 'enemy_alert':
                this._tone(440, 0.1, 0.15, 'sawtooth');
                setTimeout(() => this._tone(520, 0.1, 0.15, 'sawtooth'), 120);
                break;
            case 'enemy_shoot':
                this._noise(0.15, 200, 10, 0.3);
                break;
            case 'enemy_death':
                this._noise(0.4, 100, 4, 0.4, 'sawtooth');
                this._tone(200, 0.3, 0.2, 'sine');
                break;
            case 'player_hurt':
                this._tone(200, 0.15, 0.3, 'sawtooth');
                break;
            case 'player_death':
                this._noise(0.8, 80, 2, 0.5);
                this._tone(150, 0.6, 0.4, 'sine');
                break;
            case 'pickup_health':
                this._tone(660, 0.1, 0.2, 'sine');
                setTimeout(() => this._tone(880, 0.1, 0.2, 'sine'), 80);
                break;
            case 'pickup_ammo':
                this._tone(440, 0.08, 0.2, 'square');
                break;
            case 'pickup_weapon':
                this._tone(440, 0.08, 0.3, 'sine');
                setTimeout(() => this._tone(550, 0.08, 0.3, 'sine'), 60);
                setTimeout(() => this._tone(660, 0.1,  0.3, 'sine'), 120);
                break;
            case 'level_complete':
                [523, 659, 784, 1047].forEach((f, i) =>
                    setTimeout(() => this._tone(f, 0.25, 0.4, 'sine'), i * 120)
                );
                break;
        }
    }
}
