"use client";

import { useCallback, useRef, useState } from "react";
import {
  Loader2,
  Download,
  CloudUpload,
  Youtube,
  Music2,
  FolderOpen,
  Disc3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/util";
import { audioBufferToWav } from "@/lib/studio/projectSync";

/** Browser decode-capable audio/video pick for publishing */
const PUBLISH_FILE_ACCEPT =
  "audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.aif,.opus,.mp4,.mov,.mkv,.webm";

type SourceMode = "track" | "file";

interface Props {
  selectedTrackName: string | null;
  hasSelectedBuffer: boolean;
  /** Encode selected track as WAV for export / SoundCloud when source is track */
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
  const [sourceMode, setSourceMode] = useState<SourceMode>("track");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [soundcloudToken, setSoundcloudToken] = useState("");
  const [youtubeToken, setYoutubeToken] = useState("");

  const effectiveTitle = title.trim() || selectedTrackName || "Sonara upload";

  const hasUploadableSoundCloud =
    soundcloudToken.trim() &&
    (sourceMode === "file"
      ? !!pickedFile && pickedFile.size > 0
      : hasSelectedBuffer);

  const pickedIsVideo = pickedFile?.type.startsWith("video/") ?? false;
  const hasUploadableYoutube =
    youtubeToken.trim() && pickedFile && pickedIsVideo && pickedFile.size > 0;

  const onPickFile = useCallback(() => fileInputRef.current?.click(), []);

  async function blobForSoundCloud(): Promise<{ blob: Blob; filename: string } | null> {
    if (sourceMode === "file") {
      if (!pickedFile) {
        log("SoundCloud: choose an audio file from your computer.");
        return null;
      }
      return { blob: pickedFile, filename: pickedFile.name || "upload" };
    }
    const blob = await getSelectedWavBlob();
    if (!blob) {
      log("SoundCloud: select a track with audio in the timeline.");
      return null;
    }
    const base = (selectedTrackName ?? "sonara-track").replace(/\s+/g, "-");
    return { blob, filename: `${base}.wav` };
  }

  async function exportWav() {
    setBusy(true);
    try {
      if (sourceMode === "file") {
        if (!pickedFile) {
          log("Export: pick a file first, or switch to Studio track.");
          return;
        }
        const url = URL.createObjectURL(pickedFile);
        const a = document.createElement("a");
        a.href = url;
        a.download = pickedFile.name;
        a.click();
        URL.revokeObjectURL(url);
        log(`Downloaded original file: ${pickedFile.name}`);
        return;
      }
      const blob = await getSelectedWavBlob();
      if (!blob) {
        log("Export WAV: select a track with audio.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(selectedTrackName ?? "sonara-track").replace(/\s+/g, "-")}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      log("Exported selected track as WAV.");
    } catch (e) {
      log(`Export error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function publishSoundCloud() {
    if (!soundcloudToken.trim()) {
      log("SoundCloud: paste an OAuth access token (see docs/publishing-third-party.md).");
      return;
    }
    setBusy(true);
    try {
      const pack = await blobForSoundCloud();
      if (!pack) return;

      const fd = new FormData();
      fd.append("track[title]", effectiveTitle);
      fd.append("file", pack.blob, pack.filename);

      const res = await fetch("/api/v1/publish/soundcloud", {
        method: "POST",
        headers: {
          Authorization: `OAuth ${soundcloudToken.trim()}`,
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
      log(`SoundCloud: uploaded ${data.permalink_url ?? "(check SoundCloud library)"}`);
    } catch (e) {
      log(`SoundCloud error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function publishYoutube() {
    if (!youtubeToken.trim()) {
      log("YouTube: paste a Google OAuth access token with youtube.upload scope.");
      return;
    }
    if (!pickedFile || !pickedIsVideo) {
      log("YouTube MVP: choose a video file (MP4/MOV/WebM). Mux audio + artwork offline if you only have WAV/MP3.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", effectiveTitle);
      fd.append("description", description);
      fd.append("file", pickedFile, pickedFile.name);

      const res = await fetch("/api/v1/publish/youtube", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${youtubeToken.trim()}`,
        },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        log(`YouTube upload failed: ${data.error ?? res.status}`);
        return;
      }
      const id = data.id ? `https://youtu.be/${data.id}` : "(see YouTube Studio)";
      log(`YouTube: upload complete ${id}`);
    } catch (e) {
      log(`YouTube error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function pingSpotifyInfo() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/publish/spotify", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      log(`Spotify: ${data.error ?? res.status}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={PUBLISH_FILE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setPickedFile(f);
          if (f) log(`Selected file: ${f.name} (${f.type || "type unknown"})`);
        }}
      />

      <p className="text-xs leading-relaxed text-text-dim">
        MVP publishing: pick a **studio track** or a **file** (MP3, WAV, FLAC, AAC, OGG, AIFF,
        etc.). SoundCloud accepts common audio formats. YouTube expects a **video file** for API
        upload (mux first). Spotify has no public upload API for DJs; see distributor workflow
        below. Details:{" "}
        <code className="rounded bg-bg-deep px-1 text-[10px]">docs/publishing-third-party.md</code>
      </p>

      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
          Source
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <label
            className={clsx(
              "flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs transition",
              sourceMode === "track"
                ? "border-accent/40 bg-accent/10"
                : "border-line/60 hover:bg-bg-raised/40",
            )}
          >
            <input
              type="radio"
              name="pub-src"
              className="mt-0.5"
              checked={sourceMode === "track"}
              onChange={() => setSourceMode("track")}
            />
            <span>
              <span className="flex items-center gap-1 font-medium text-text">
                <Disc3 className="h-3.5 w-3.5 text-accent" /> Selected studio track
              </span>
              <span className="mt-0.5 block text-[11px] text-text-mute">
                Encodes to WAV for SoundCloud upload and WAV export.
              </span>
            </span>
          </label>
          <label
            className={clsx(
              "flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-xs transition",
              sourceMode === "file"
                ? "border-accent/40 bg-accent/10"
                : "border-line/60 hover:bg-bg-raised/40",
            )}
          >
            <input
              type="radio"
              name="pub-src"
              className="mt-0.5"
              checked={sourceMode === "file"}
              onChange={() => setSourceMode("file")}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-medium text-text">
                <FolderOpen className="h-3.5 w-3.5 text-accent-cyan" /> File from computer
              </span>
              <span className="mt-0.5 block text-[11px] text-text-mute">
                Use your mastered MP3/WAV/FLAC/etc., or a video file for YouTube.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.preventDefault();
                  onPickFile();
                }}
              >
                Browse files
              </Button>
              {pickedFile && (
                <div className="mt-1 truncate font-mono text-[10px] text-accent-cyan">
                  {pickedFile.name}
                </div>
              )}
            </span>
          </label>
        </div>
      </div>

      <label className="block text-[10px] uppercase tracking-wider text-text-mute">
        Title (SoundCloud + YouTube)
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={selectedTrackName ?? "Track title"}
          className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
      </label>

      <label className="block text-[10px] uppercase tracking-wider text-text-mute">
        Description (YouTube only)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          placeholder="Optional description"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={
            busy ||
            (sourceMode === "track" ? !hasSelectedBuffer : !pickedFile)
          }
          onClick={() => void exportWav()}
          title={
            sourceMode === "file"
              ? "Download the chosen file as-is"
              : "Download selected track as WAV"
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {sourceMode === "file" ? "Download file" : "Export WAV"}
        </Button>
      </div>

      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
          <CloudUpload className="h-3.5 w-3.5 text-orange-400" />
          SoundCloud
        </div>
        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          OAuth access token (demo only)
          <input
            type="password"
            autoComplete="off"
            value={soundcloudToken}
            onChange={(e) => setSoundcloudToken(e.target.value)}
            placeholder="Authorization: OAuth …"
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-accent/50"
          />
        </label>
        <Button
          variant="primary"
          size="sm"
          className="mt-3 w-full"
          disabled={busy || !hasUploadableSoundCloud}
          onClick={() => void publishSoundCloud()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
          Upload to SoundCloud
        </Button>
      </div>

      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
          <Youtube className="h-3.5 w-3.5 text-red-400" />
          YouTube (video file)
        </div>
        <p className="text-[11px] leading-snug text-text-mute">
          Requires <code className="text-[10px]">YOUTUBE_PUBLISH_PROXY_ENABLED=true</code> and a
          Google token with <code className="text-[10px]">youtube.upload</code>. Upload starts as{" "}
          <strong className="text-text">private</strong>; change visibility in YouTube Studio.
        </p>
        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          OAuth access token (Bearer)
          <input
            type="password"
            autoComplete="off"
            value={youtubeToken}
            onChange={(e) => setYoutubeToken(e.target.value)}
            placeholder="ya29…"
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-accent/50"
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full border-red-400/30 hover:bg-red-500/10"
          disabled={busy || !hasUploadableYoutube}
          onClick={() => void publishYoutube()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
          Upload video to YouTube
        </Button>
        {!pickedIsVideo && pickedFile && (
          <p className="mt-2 text-[10px] text-amber-400/90">
            Current file is not video/*; mux to MP4 for YouTube API upload.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
          <Music2 className="h-3.5 w-3.5 text-green-500" />
          Spotify
        </div>
        <p className="text-[11px] leading-relaxed text-text-dim">
          No API to push arbitrary mixes to your Spotify artist profile. Export audio and deliver
          through your distributor; after release processing, manage pitching in Spotify for
          Artists.
        </p>
        <Button variant="subtle" size="sm" className="mt-2 w-full" disabled={busy} onClick={() => void pingSpotifyInfo()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
          Show API message
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
