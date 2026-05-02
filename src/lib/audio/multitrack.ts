"use client";

/**
 * Tiny multi-track engine for the Studio view.
 *
 * Each track has a buffer, gain, mute, solo, pan. Transport plays all tracks
 * in lockstep from a shared start position. Re-creating BufferSourceNodes on
 * every play is cheap and matches Web Audio's one-shot model.
 */
export interface TrackChannel {
  id: string;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  pan: StereoPannerNode;
}

export class Multitrack {
  readonly ctx: AudioContext;
  readonly out: GainNode;
  private channels = new Map<string, TrackChannel>();
  private buffers = new Map<string, AudioBuffer>();
  private mute = new Map<string, boolean>();
  private solo = new Map<string, boolean>();
  private vol = new Map<string, number>();
  private pan = new Map<string, number>();
  private startedAt = 0;
  private startedFrom = 0;
  private _playing = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.connect(ctx.destination);
  }

  setTrackBuffer(id: string, buffer: AudioBuffer) {
    this.buffers.set(id, buffer);
    if (!this.vol.has(id)) this.vol.set(id, 0.85);
    if (!this.pan.has(id)) this.pan.set(id, 0);
    if (this._playing) this.restart();
  }

  removeTrack(id: string) {
    this.buffers.delete(id);
    this.mute.delete(id);
    this.solo.delete(id);
    this.vol.delete(id);
    this.pan.delete(id);
    const ch = this.channels.get(id);
    if (ch) {
      try { ch.source?.stop(); } catch {/* */}
      ch.source?.disconnect();
      ch.gain.disconnect();
      ch.pan.disconnect();
      this.channels.delete(id);
    }
  }

  getDuration(): number {
    let max = 0;
    this.buffers.forEach((b) => { if (b.duration > max) max = b.duration; });
    return max;
  }

  isPlaying() { return this._playing; }

  getPosition(): number {
    if (!this._playing) return this.startedFrom;
    return Math.min(this.getDuration(), this.startedFrom + (this.ctx.currentTime - this.startedAt));
  }

  play(fromSec?: number) {
    this.stop(true);
    const start = fromSec ?? this.startedFrom;
    const anySolo = Array.from(this.solo.values()).some(Boolean);
    this.buffers.forEach((buf, id) => {
      const muted = this.mute.get(id) || (anySolo && !this.solo.get(id));
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.value = muted ? 0 : (this.vol.get(id) ?? 0.85);
      const pan = this.ctx.createStereoPanner();
      pan.pan.value = this.pan.get(id) ?? 0;
      src.connect(gain);
      gain.connect(pan);
      pan.connect(this.out);
      try { src.start(0, start); } catch {/* out of range */}
      this.channels.set(id, { id, source: src, gain, pan });
    });
    this.startedAt = this.ctx.currentTime;
    this.startedFrom = start;
    this._playing = true;
  }

  pause() {
    if (!this._playing) return;
    const pos = this.getPosition();
    this.stop(true);
    this.startedFrom = pos;
  }

  stop(silent = false) {
    this.channels.forEach((ch) => {
      try { ch.source?.stop(); } catch {/* */}
      ch.source?.disconnect();
      ch.gain.disconnect();
      ch.pan.disconnect();
    });
    this.channels.clear();
    this._playing = false;
    if (!silent) this.startedFrom = 0;
  }

  seek(sec: number) {
    const dur = this.getDuration();
    const clamped = Math.max(0, Math.min(dur, sec));
    if (this._playing) this.play(clamped);
    else this.startedFrom = clamped;
  }

  private restart() {
    const pos = this.getPosition();
    this.play(pos);
  }

  setVolume(id: string, v: number) {
    this.vol.set(id, v);
    const ch = this.channels.get(id);
    if (ch) ch.gain.gain.value = (this.mute.get(id) ? 0 : v);
  }
  setMute(id: string, m: boolean) {
    this.mute.set(id, m);
    if (this._playing) this.restart();
  }
  setSolo(id: string, s: boolean) {
    this.solo.set(id, s);
    if (this._playing) this.restart();
  }
  setPan(id: string, p: number) {
    this.pan.set(id, p);
    const ch = this.channels.get(id);
    if (ch) ch.pan.pan.value = p;
  }

  setMasterVolume(v: number) {
    this.out.gain.value = v;
  }
}
