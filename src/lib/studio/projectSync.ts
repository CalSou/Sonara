/**
 * Serialize Studio Zustand state to/from JSON-safe payloads for `/api/v1/projects`.
 * Audio buffers are stored as base64 WAV so projects round-trip without Supabase URLs.
 */

import { computePeaks } from "@/lib/audio/peaks";

export type StudioTrackWire = {
  id: string;
  name: string;
  color: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  /** Base64-encoded WAV bytes, or null if empty track */
  wavBase64: string | null;
  peaks: number[] | null;
};

export type StudioStateWire = {
  version: 1;
  tracks: StudioTrackWire[];
  selectedId: string | null;
  isPlaying: boolean;
  position: number;
  masterVolume: number;
  bpm: number;
};

function encodeWavBase64(buffer: AudioBuffer): string {
  const wav = audioBufferToWav(buffer);
  const bytes = new Uint8Array(wav);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeWavBase64ToBuffer(
  ctx: AudioContext,
  base64: string,
): Promise<AudioBuffer> {
  const bin = atob(base64);
  const len = bin.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
  return ctx.decodeAudioData(arr.buffer.slice(0));
}

/** Export studio slice suitable for POST /api/v1/projects */
export async function studioStateToWire(state: {
  tracks: Array<{
    id: string;
    name: string;
    color: string;
    buffer: AudioBuffer | null;
    peaks: number[] | null;
    volume: number;
    pan: number;
    mute: boolean;
    solo: boolean;
  }>;
  selectedId: string | null;
  isPlaying: boolean;
  position: number;
  masterVolume: number;
  bpm: number;
}): Promise<StudioStateWire> {
  const tracks: StudioTrackWire[] = [];
  for (const t of state.tracks) {
    tracks.push({
      id: t.id,
      name: t.name,
      color: t.color,
      volume: t.volume,
      pan: t.pan,
      mute: t.mute,
      solo: t.solo,
      wavBase64: t.buffer ? encodeWavBase64(t.buffer) : null,
      peaks: t.peaks,
    });
  }
  return {
    version: 1,
    tracks,
    selectedId: state.selectedId,
    isPlaying: state.isPlaying,
    position: state.position,
    masterVolume: state.masterVolume,
    bpm: state.bpm,
  };
}

/** Apply wire payload into studio store setters (caller supplies engine sync). */
export async function wireToStudioPayload(
  ctx: AudioContext,
  wire: StudioStateWire,
): Promise<{
  tracks: Array<{
    id: string;
    name: string;
    color: string;
    buffer: AudioBuffer | null;
    peaks: number[] | null;
    volume: number;
    pan: number;
    mute: boolean;
    solo: boolean;
  }>;
  selectedId: string | null;
  isPlaying: boolean;
  position: number;
  masterVolume: number;
  bpm: number;
}> {
  const tracks = [];
  for (const t of wire.tracks) {
    let buffer: AudioBuffer | null = null;
    if (t.wavBase64) {
      try {
        buffer = await decodeWavBase64ToBuffer(ctx, t.wavBase64);
      } catch {
        buffer = null;
      }
    }
    tracks.push({
      id: t.id,
      name: t.name,
      color: t.color,
      buffer,
      peaks: buffer ? computePeaks(buffer) : t.peaks,
      volume: t.volume,
      pan: t.pan,
      mute: t.mute,
      solo: t.solo,
    });
  }
  return {
    tracks,
    selectedId: wire.selectedId,
    isPlaying: wire.isPlaying,
    position: wire.position,
    masterVolume: wire.masterVolume,
    bpm: wire.bpm,
  };
}

/** Minimal WAV encoder (PCM float32 → 16-bit PCM), browser-safe */
export function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const samples = buffer.length;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  const offset = 44;
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let ptr = offset;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = Math.max(-1, Math.min(1, channelData[ch][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(ptr, s, true);
      ptr += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
