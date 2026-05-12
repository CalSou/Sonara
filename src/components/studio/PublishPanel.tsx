"use client";

import { useState } from "react";
import {
  Loader2,
  Download,
  CloudUpload,
  Youtube,
  Music2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { audioBufferToWav } from "@/lib/studio/projectSync";

type Platform = "soundcloud" | "youtube" | "spotify";

interface Props {
  selectedTrackName: string | null;
  hasSelectedBuffer: boolean;
  /** Encode selected track as WAV for export / upload */
  getSelectedWavBlob: () => Promise<Blob | null>;
  log: (message: string) => void;
}

export function PublishPanel({
  selectedTrackName,
  hasSelectedBuffer,
  getSelectedWavBlob,
  log,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");

  async function exportWav() {
    setBusy(true);
    try {
      const blob = await getSelectedWavBlob();
      if (!blob) {
        log("Export failed: no audio on selected track.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(selectedTrackName ?? "sonara-track").replace(/\s+/g, "-")}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      log("Exported WAV download.");
    } catch (e) {
      log(`Export error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function publishSoundCloud() {
    if (!token.trim()) {
      log("SoundCloud: paste an OAuth access token (see docs/publishing-third-party.md).");
      return;
    }
    setBusy(true);
    try {
      const blob = await getSelectedWavBlob();
      if (!blob) {
        log("SoundCloud: select a track with audio.");
        return;
      }
      const fd = new FormData();
      fd.append(
        "track[title]",
        title.trim() || selectedTrackName || "Sonara export",
      );
      fd.append("file", blob, "sonara.wav");

      const res = await fetch("/api/v1/publish/soundcloud", {
        method: "POST",
        headers: {
          Authorization: `OAuth ${token.trim()}`,
        },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        permalink_url?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        log(`SoundCloud upload failed: ${data.error ?? res.status}`);
        return;
      }
      log(`SoundCloud: uploaded ${data.permalink_url ?? "(check dashboard)"}`);
    } catch (e) {
      log(`SoundCloud error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function stubMessage(p: Platform) {
    const lines: Record<Platform, string> = {
      soundcloud:
        "SoundCloud: use OAuth token field below or export WAV and upload in the browser.",
      youtube:
        "YouTube needs Google OAuth and YouTube Data API v3 resumable upload. Server route stub only; see docs/publishing-third-party.md.",
      spotify:
        "Spotify does not offer third-party upload for arbitrary mixes to artist profiles; distribution goes through labels or Spotify for Artists after delivery to Spotify.",
    };
    log(lines[p]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-text-dim">
        Publish or export the <span className="text-text">selected</span> track.
        Third-party APIs require developer apps and user consent. Read{" "}
        <code className="rounded bg-bg-deep px-1 text-[10px]">docs/publishing-third-party.md</code>
        {" "}before shipping to production.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || !hasSelectedBuffer}
          onClick={() => void exportWav()}
          title="Download selected track as WAV"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export WAV
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => stubMessage("youtube")}
        >
          <Youtube className="h-4 w-4 text-red-400" /> YouTube (guide)
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => stubMessage("spotify")}
        >
          <Music2 className="h-4 w-4 text-green-500" /> Spotify (guide)
        </Button>
      </div>

      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
          <CloudUpload className="h-3.5 w-3.5 text-orange-400" />
          SoundCloud upload (beta)
        </div>
        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          Track title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={selectedTrackName ?? "My track"}
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
        </label>
        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          OAuth access token (never commit; rotate after testing)
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token from SoundCloud OAuth flow"
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-accent/50"
          />
        </label>
        <Button
          variant="primary"
          size="sm"
          className="mt-3 w-full"
          disabled={busy || !hasSelectedBuffer || !token.trim()}
          onClick={() => void publishSoundCloud()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          Upload to SoundCloud
        </Button>
      </div>
    </div>
  );
}

/** Browser-side WAV blob from an AudioBuffer */
export async function bufferToWavBlob(buffer: AudioBuffer): Promise<Blob> {
  const ab = audioBufferToWav(buffer);
  return new Blob([ab], { type: "audio/wav" });
}
