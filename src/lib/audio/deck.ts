"use client";

/**
 * DJ Deck — a single playback channel with:
 *   - looping playback of an AudioBuffer with seek + variable rate (pitch)
 *   - 3-band EQ (low/mid/high) via BiquadFilterNodes
 *   - low/high pass filter sweep
 *   - per-deck gain + send to a deck output node (which the mixer connects)
 *
 * The deck rebuilds its source on every play/seek, since AudioBufferSourceNode
 * is one-shot. State (rate, eq, gain, filter) is preserved across rebuilds.
 */
export interface DeckEqState {
  low: number; // dB
  mid: number;
  high: number;
}

export interface DeckFilterState {
  /** -1 = full lowpass, 0 = bypass, +1 = full highpass */
  amount: number;
}

export class Deck {
  readonly ctx: AudioContext;
  readonly out: GainNode; // public output to mixer

  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  private lowEq: BiquadFilterNode;
  private midEq: BiquadFilterNode;
  private highEq: BiquadFilterNode;
  private lpf: BiquadFilterNode;
  private hpf: BiquadFilterNode;
  private gain: GainNode;

  private playStartedAt = 0;   // ctx time
  private playStartedFrom = 0; // seconds within buffer
  private _isPlaying = false;
  private _rate = 1;
  private _volume = 0.85;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.lowEq = ctx.createBiquadFilter();
    this.lowEq.type = "lowshelf";
    this.lowEq.frequency.value = 200;
    this.midEq = ctx.createBiquadFilter();
    this.midEq.type = "peaking";
    this.midEq.frequency.value = 1000;
    this.midEq.Q.value = 0.9;
    this.highEq = ctx.createBiquadFilter();
    this.highEq.type = "highshelf";
    this.highEq.frequency.value = 4000;

    this.lpf = ctx.createBiquadFilter();
    this.lpf.type = "lowpass";
    this.lpf.frequency.value = ctx.sampleRate / 2;
    this.hpf = ctx.createBiquadFilter();
    this.hpf.type = "highpass";
    this.hpf.frequency.value = 0;

    this.gain = ctx.createGain();
    this.gain.gain.value = this._volume;

    this.out = ctx.createGain();

    this.lowEq.connect(this.midEq);
    this.midEq.connect(this.highEq);
    this.highEq.connect(this.hpf);
    this.hpf.connect(this.lpf);
    this.lpf.connect(this.gain);
    this.gain.connect(this.out);
  }

  load(buffer: AudioBuffer) {
    this.stop();
    this.buffer = buffer;
    this.playStartedFrom = 0;
  }

  hasBuffer() {
    return this.buffer !== null;
  }
  getDuration() {
    return this.buffer ? this.buffer.duration : 0;
  }
  isPlaying() {
    return this._isPlaying;
  }

  /** Current playhead in seconds (works for paused & playing). */
  getPosition(): number {
    if (!this.buffer) return 0;
    if (!this._isPlaying) return this.playStartedFrom;
    const elapsed = (this.ctx.currentTime - this.playStartedAt) * this._rate;
    return Math.min(this.buffer.duration, this.playStartedFrom + elapsed);
  }

  play(fromSec?: number) {
    if (!this.buffer) return;
    if (this._isPlaying) this.stop(true);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = this._rate;
    src.connect(this.lowEq);
    const start = fromSec ?? this.playStartedFrom;
    src.start(0, start);
    src.onended = () => {
      // natural end (not user-stop): hold position at end
      if (this.source === src) {
        this._isPlaying = false;
        this.playStartedFrom = this.buffer?.duration ?? 0;
      }
    };
    this.source = src;
    this.playStartedAt = this.ctx.currentTime;
    this.playStartedFrom = start;
    this._isPlaying = true;
  }

  pause() {
    if (!this._isPlaying) return;
    const pos = this.getPosition();
    this.stop(true);
    this.playStartedFrom = pos;
  }

  stop(silent = false) {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    this._isPlaying = false;
    if (!silent) this.playStartedFrom = 0;
  }

  seek(sec: number) {
    if (!this.buffer) return;
    const clamped = Math.max(0, Math.min(this.buffer.duration, sec));
    if (this._isPlaying) {
      this.play(clamped);
    } else {
      this.playStartedFrom = clamped;
    }
  }

  setRate(rate: number) {
    this._rate = Math.max(0.5, Math.min(1.5, rate));
    if (this.source) this.source.playbackRate.value = this._rate;
    // re-anchor so getPosition stays continuous after rate change
    if (this._isPlaying) {
      this.playStartedFrom = this.getPosition();
      this.playStartedAt = this.ctx.currentTime;
    }
  }
  getRate() {
    return this._rate;
  }

  setEq(eq: DeckEqState) {
    this.lowEq.gain.value = eq.low;
    this.midEq.gain.value = eq.mid;
    this.highEq.gain.value = eq.high;
  }

  setFilter(amount: number) {
    const a = Math.max(-1, Math.min(1, amount));
    const ny = this.ctx.sampleRate / 2;
    if (a >= 0) {
      // 0..+1 → highpass 20 → 6000
      this.hpf.frequency.value = a === 0 ? 0 : 20 * Math.pow(300, a);
      this.lpf.frequency.value = ny;
    } else {
      // 0..-1 → lowpass ny → 200
      this.lpf.frequency.value = ny * Math.pow(200 / ny, -a);
      this.hpf.frequency.value = 0;
    }
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    this.gain.gain.value = this._volume;
  }
  getVolume() {
    return this._volume;
  }
}
