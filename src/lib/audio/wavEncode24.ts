/**
 * Encode AudioBuffer to 24-bit PCM stereo WAV (delivery-grade for distributors).
 */
export function audioBufferToWav24(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 24;
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

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch));
  }

  let ptr = 44;
  const scale = 0x7fffff;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const x = Math.max(-1, Math.min(1, channelData[ch]![i]));
      let int24 = Math.round(x * scale);
      if (int24 > 0x7fffff) int24 = 0x7fffff;
      if (int24 < -0x800000) int24 = -0x800000;
      const b0 = int24 & 0xff;
      const b1 = (int24 >> 8) & 0xff;
      const b2 = (int24 >> 16) & 0xff;
      view.setUint8(ptr, b0);
      view.setUint8(ptr + 1, b1);
      view.setUint8(ptr + 2, b2);
      ptr += 3;
    }
  }

  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
