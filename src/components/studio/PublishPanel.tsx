"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Download,
  CloudUpload,
  Youtube,
  Music2,
  FolderOpen,
  Disc3,
  Link2,
  Unplug,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/util";
import { audioBufferToWav } from "@/lib/studio/projectSync";
import { audioBufferToWav24 } from "@/lib/audio/wavEncode24";
import { MUSIC_GENRES, DEFAULT_GENRE_ID, genreLabel } from "@/lib/music/genres";
import { DISTRIBUTORS, type DistributorId } from "@/lib/publish/distributors";

const PUBLISH_FILE_ACCEPT =
  "audio/*,video/mp4,video/webm,video/quicktime,.mp3,.wav,.flac,.aac,.ogg,.m4a,.aiff,.aif,.opus,.mp4,.mov,.mkv,.webm";

type SourceMode = "track" | "file";

type ConnMap = Partial<
  Record<
    "soundcloud" | "youtube",
    { connected: true; accountId: string; connectedAt: string }
  >
>;

interface Props {
  selectedTrackName: string | null;
  selectedGenreId: string;
  hasSelectedBuffer: boolean;
  getSelectedAudioBuffer: () => AudioBuffer | null;
  getSelectedWavBlob: () => Promise<Blob | null>;
  log: (message: string) => void;
}

async function uploadGoogleResumable(
  uploadUrl: string,
  file: File,
  mimeType: string,
  onProgress: (pct: number) => void,
): Promise<unknown> {
  const total = file.size;
  const chunkSize = 256 * 1024;
  let start = 0;
  let resultJson: unknown = null;

  while (start < total) {
    const end = Math.min(start + chunkSize, total) - 1;
    const blob = file.slice(start, end + 1);
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${total}`,
      },
      body: blob,
    });

    onProgress(Math.min(100, Math.round(((end + 1) / total) * 100)));

    if (res.status === 308) {
      const range = res.headers.get("Range");
      const m = range?.match(/bytes=0-(\d+)/);
      if (m) start = Number(m[1]) + 1;
      else start = end + 1;
      continue;
    }

    if (!res.ok) {
      throw new Error(await res.text());
    }

    resultJson = await res.json().catch(() => null);
    break;
  }

  return resultJson;
}

export function PublishPanel({
  selectedTrackName,
  selectedGenreId,
  hasSelectedBuffer,
  getSelectedAudioBuffer,
  getSelectedWavBlob,
  log,
}: Props) {
  const { status } = useSession();
  const [busy, setBusy] = useState(false);
  const [connections, setConnections] = useState<ConnMap>({});
  const [sourceMode, setSourceMode] = useState<SourceMode>("track");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagList, setTagList] = useState("");
  const [sharing, setSharing] = useState<"public" | "private">("private");

  const [ytPrivacy, setYtPrivacy] = useState<"private" | "public" | "unlisted">("private");
  const [ytProgress, setYtProgress] = useState(0);

  const [distId, setDistId] = useState<DistributorId>("distrokid");
  const [releaseTitle, setReleaseTitle] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [primaryArtist, setPrimaryArtist] = useState("");
  const [language, setLanguage] = useState("en");
  const [explicit, setExplicit] = useState(false);
  const [isrc, setIsrc] = useState("");
  const [upc, setUpc] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [composerCredits, setComposerCredits] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);

  const effectiveTitle = title.trim() || selectedTrackName || "Sonara upload";

  const refreshConnections = useCallback(async () => {
    if (status !== "authenticated") return;
    const res = await fetch("/api/v1/publish/connections", { credentials: "include" });
    const data = (await res.json().catch(() => ({}))) as { connections?: ConnMap };
    if (data.connections) setConnections(data.connections);
  }, [status]);

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  const scConnected = Boolean(connections.soundcloud?.connected);
  const ytConnected = Boolean(connections.youtube?.connected);

  const hasSoundCloudPayload =
    sourceMode === "file"
      ? !!pickedFile && pickedFile.size > 0
      : hasSelectedBuffer;

  function connectSoundCloud() {
    window.location.href = "/api/v1/publish/soundcloud/connect";
  }

  function connectYoutube() {
    window.location.href = "/api/v1/publish/youtube/connect";
  }

  async function disconnectSc() {
    setBusy(true);
    try {
      await fetch("/api/v1/publish/soundcloud/disconnect", {
        method: "POST",
        credentials: "include",
      });
      await refreshConnections();
      log("Disconnected SoundCloud.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnectYt() {
    setBusy(true);
    try {
      await fetch("/api/v1/publish/youtube/disconnect", {
        method: "POST",
        credentials: "include",
      });
      await refreshConnections();
      log("Disconnected YouTube.");
    } finally {
      setBusy(false);
    }
  }

  async function blobForSoundCloud(): Promise<{ blob: Blob; filename: string } | null> {
    if (sourceMode === "file") {
      if (!pickedFile) {
        log("SoundCloud: choose a file.");
        return null;
      }
      return { blob: pickedFile, filename: pickedFile.name || "upload" };
    }
    const blob = await getSelectedWavBlob();
    if (!blob) {
      log("SoundCloud: select a track with audio.");
      return null;
    }
    const base = (selectedTrackName ?? "sonara-track").replace(/\s+/g, "-");
    return { blob, filename: `${base}.wav` };
  }

  async function exportDelivery16() {
    const buf = getSelectedAudioBuffer();
    if (!buf) {
      log("Export: no audio on selected track.");
      return;
    }
    const ab = audioBufferToWav(buf);
    downloadBlob(new Blob([ab], { type: "audio/wav" }), `${slugName()}-16bit.wav`);
    log("Exported 16-bit WAV.");
  }

  async function exportDelivery24() {
    const buf = getSelectedAudioBuffer();
    if (!buf) {
      log("Export: no audio on selected track.");
      return;
    }
    const ab = audioBufferToWav24(buf);
    downloadBlob(new Blob([ab], { type: "audio/wav" }), `${slugName()}-24bit-delivery.wav`);
    log("Exported 24-bit WAV for distributors.");
  }

  function slugName() {
    return (selectedTrackName ?? "sonara-track").replace(/\s+/g, "-");
  }

  function downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadSoundCloud() {
    if (!scConnected) {
      log("Connect SoundCloud first.");
      return;
    }
    setBusy(true);
    try {
      const pack = await blobForSoundCloud();
      if (!pack) return;
      const fd = new FormData();
      fd.append("title", effectiveTitle);
      if (description.trim()) fd.append("description", description.trim());
      const tags = [genreLabel(selectedGenreId), tagList].filter(Boolean).join(", ").slice(0, 500);
      if (tags.trim()) fd.append("tag_list", tags.trim());
      fd.append("sharing", sharing);
      fd.append("file", pack.blob, pack.filename);

      const res = await fetch("/api/v1/publish/soundcloud/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        permalink_url?: string;
        error?: string;
      };
      if (!res.ok) {
        log(`SoundCloud upload failed: ${data.error ?? res.status}`);
        return;
      }
      log(`SoundCloud: ${data.permalink_url ?? "upload complete"}`);
    } catch (e) {
      log(`SoundCloud error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function uploadYoutube() {
    if (!ytConnected) {
      log("Connect YouTube first.");
      return;
    }
    if (!pickedFile || !pickedFile.type.startsWith("video/")) {
      log("YouTube: pick a video file (MP4/MOV/WebM).");
      return;
    }
    setBusy(true);
    setYtProgress(0);
    try {
      const initRes = await fetch("/api/v1/publish/youtube/upload/init", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: effectiveTitle,
          description,
          privacyStatus: ytPrivacy,
          fileSize: pickedFile.size,
          mimeType: pickedFile.type,
        }),
      });
      const initData = (await initRes.json().catch(() => ({}))) as {
        uploadUrl?: string;
        error?: string;
      };
      if (!initRes.ok || !initData.uploadUrl) {
        log(`YouTube init failed: ${initData.error ?? initRes.status}`);
        return;
      }

      const resource = await uploadGoogleResumable(
        initData.uploadUrl,
        pickedFile,
        pickedFile.type,
        setYtProgress,
      );

      await fetch("/api/v1/publish/youtube/upload/finalize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource }),
      });

      const vid =
        resource &&
        typeof resource === "object" &&
        resource !== null &&
        "id" in resource
          ? String((resource as { id: string }).id)
          : "";
      log(vid ? `YouTube upload complete: https://youtu.be/${vid}` : "YouTube upload complete.");
    } catch (e) {
      log(`YouTube error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setYtProgress(0);
    }
  }

  async function submitSpotifyHandoff() {
    setBusy(true);
    try {
      let artworkDataUrl: string | undefined;
      if (artworkFile) {
        artworkDataUrl = await fileToDataUrl(artworkFile);
      }
      const metadata = {
        releaseTitle: releaseTitle.trim() || effectiveTitle,
        trackTitle: trackTitle.trim() || effectiveTitle,
        primaryArtist: primaryArtist.trim() || "Unknown Artist",
        genreId: MUSIC_GENRES.some((g) => g.id === selectedGenreId)
          ? selectedGenreId
          : DEFAULT_GENRE_ID,
        language: language.trim(),
        explicit,
        isrc: isrc.trim() || undefined,
        upc: upc.trim() || undefined,
        releaseDate: releaseDate.trim() || undefined,
        composerCredits: composerCredits.trim() || undefined,
        artworkDataUrl,
      };

      const res = await fetch("/api/v1/publish/spotify/handoff", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata, distributorId: distId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        distributorUrl?: string;
        draftId?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        log(`Handoff failed: ${data.error ?? res.status}`);
        return;
      }
      log(data.message ?? "Draft saved.");
      if (data.distributorUrl) {
        window.open(data.distributorUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      log(`Handoff error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <div className="space-y-3 text-xs leading-relaxed text-text-dim">
        <p>
          Sign in to connect SoundCloud and YouTube and to save distributor drafts. Use{" "}
          <strong className="text-text">Register</strong> or <strong className="text-text">Sign in</strong>{" "}
          in the Studio header.
        </p>
      </div>
    );
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
          if (f) log(`Selected file: ${f.name}`);
        }}
      />

      <p className="text-xs leading-relaxed text-text-dim">
        Connect accounts once (OAuth). SoundCloud accepts common audio formats from disk or WAV from the
        timeline. YouTube expects <strong className="text-text">video</strong>. Spotify uses your distributor.
        See <code className="rounded bg-bg-deep px-1 text-[10px]">docs/publishing-third-party.md</code>.
      </p>

      {/* Source */}
      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">Source</div>
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
                <Disc3 className="h-3.5 w-3.5 text-accent" /> Selected studio track (16-bit WAV upload)
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse
              </Button>
              {pickedFile && (
                <div className="mt-1 truncate font-mono text-[10px] text-accent-cyan">{pickedFile.name}</div>
              )}
            </span>
          </label>
        </div>
      </div>

      <label className="block text-[10px] uppercase tracking-wider text-text-mute">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={selectedTrackName ?? "Track title"}
          className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
      </label>

      {/* SoundCloud */}
      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
            <CloudUpload className="h-3.5 w-3.5 text-orange-400" />
            SoundCloud
          </div>
          {!scConnected ? (
            <Button type="button" variant="outline" size="sm" onClick={connectSoundCloud}>
              <Link2 className="h-3.5 w-3.5" /> Connect
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-dim">@{connections.soundcloud?.accountId}</span>
              <Button type="button" variant="subtle" size="sm" disabled={busy} onClick={() => void disconnectSc()}>
                <Unplug className="h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>
          )}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Description (optional)"
          className="w-full resize-none rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          Tags (comma-separated)
          <input
            type="text"
            value={tagList}
            onChange={(e) => setTagList(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-[11px] text-text-dim">
          <input
            type="checkbox"
            checked={sharing === "public"}
            onChange={(e) => setSharing(e.target.checked ? "public" : "private")}
          />
          Public on SoundCloud
        </label>
        <Button
          variant="primary"
          size="sm"
          className="mt-3 w-full"
          disabled={busy || !scConnected || !hasSoundCloudPayload}
          onClick={() => void uploadSoundCloud()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
          Upload to SoundCloud
        </Button>
      </div>

      {/* YouTube */}
      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
            <Youtube className="h-3.5 w-3.5 text-red-400" />
            YouTube (video)
          </div>
          {!ytConnected ? (
            <Button type="button" variant="outline" size="sm" onClick={connectYoutube}>
              <Link2 className="h-3.5 w-3.5" /> Connect Google
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="max-w-[120px] truncate text-[10px] text-text-dim">
                {connections.youtube?.accountId}
              </span>
              <Button type="button" variant="subtle" size="sm" disabled={busy} onClick={() => void disconnectYt()}>
                <Unplug className="h-3.5 w-3.5" /> Disconnect
              </Button>
            </div>
          )}
        </div>
        <select
          value={ytPrivacy}
          onChange={(e) => setYtPrivacy(e.target.value as typeof ytPrivacy)}
          className="w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        >
          <option value="private">Private</option>
          <option value="unlisted">Unlisted</option>
          <option value="public">Public</option>
        </select>
        <p className="mt-2 text-[10px] text-text-mute">Pick a video file above (Source → File).</p>
        {ytProgress > 0 && ytProgress < 100 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-deep">
            <div className="h-full bg-accent transition-all" style={{ width: `${ytProgress}%` }} />
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full border-red-400/30"
          disabled={busy || !ytConnected || !pickedFile?.type.startsWith("video/")}
          onClick={() => void uploadYoutube()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Youtube className="h-4 w-4" />}
          Upload video
        </Button>
      </div>

      {/* Spotify / distributor */}
      <div className="rounded-xl border border-line/60 bg-bg-deep/35 p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-mute">
          <Music2 className="h-3.5 w-3.5 text-green-500" />
          Spotify / DSP (distributor handoff)
        </div>
        <p className="text-[11px] leading-relaxed text-text-dim">
          Sonara does not upload to Spotify directly. Export a delivery WAV and open your distributor.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !hasSelectedBuffer}
            onClick={() => void exportDelivery16()}
          >
            <Download className="h-4 w-4" /> 16-bit WAV
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busy || !hasSelectedBuffer}
            onClick={() => void exportDelivery24()}
          >
            <Download className="h-4 w-4" /> 24-bit WAV
          </Button>
        </div>

        <label className="mt-3 block text-[10px] uppercase tracking-wider text-text-mute">
          Distributor
          <select
            value={distId}
            onChange={(e) => setDistId(e.target.value as DistributorId)}
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          >
            {DISTRIBUTORS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <input
          type="text"
          placeholder="Release title"
          value={releaseTitle}
          onChange={(e) => setReleaseTitle(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <input
          type="text"
          placeholder="Track title"
          value={trackTitle}
          onChange={(e) => setTrackTitle(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <input
          type="text"
          placeholder="Primary artist"
          value={primaryArtist}
          onChange={(e) => setPrimaryArtist(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />

        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          Genre (catalogue)
          <select
            value={
              MUSIC_GENRES.some((g) => g.id === selectedGenreId)
                ? selectedGenreId
                : DEFAULT_GENRE_ID
            }
            disabled
            className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep/60 px-2 py-1.5 text-xs text-text-dim"
            title="Change genre in the track lane"
          >
            {MUSIC_GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Language (en)"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
          />
          <label className="flex items-center gap-2 text-[11px] text-text-dim">
            <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} />
            Explicit
          </label>
        </div>
        <input
          type="text"
          placeholder="ISRC (optional)"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <input
          type="text"
          placeholder="UPC (optional)"
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <input
          type="date"
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <textarea
          placeholder="Composer credits (optional)"
          value={composerCredits}
          onChange={(e) => setComposerCredits(e.target.value)}
          rows={2}
          className="mt-2 w-full resize-none rounded-lg border border-line/80 bg-bg-deep px-2 py-1.5 text-sm text-text outline-none focus:border-accent/50"
        />
        <label className="mt-2 block text-[10px] uppercase tracking-wider text-text-mute">
          Artwork (optional, JPG/PNG)
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="mt-1 block w-full text-xs text-text-dim"
            onChange={(e) => setArtworkFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <Button
          variant="primary"
          size="sm"
          className="mt-3 w-full"
          disabled={busy || !primaryArtist.trim()}
          onClick={() => void submitSpotifyHandoff()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />}
          Save draft &amp; open distributor
        </Button>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

/** Browser-side 16-bit WAV from timeline (SoundCloud upload from track). */
export async function bufferToWavBlob(buffer: AudioBuffer): Promise<Blob> {
  const ab = audioBufferToWav(buffer);
  return new Blob([ab], { type: "audio/wav" });
}
