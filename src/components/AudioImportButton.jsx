import { DownloadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";

export const AUDIO_FILE_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm,.mka";
const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm|mka)$/i;

// Windows often reports an empty or generic MIME type for audio files, so fall
// back to the file signature before rejecting a selection.
const AUDIO_SIGNATURES = [
  { type: "audio/wav", match: (h) => h[0] === 0x52 && h[1] === 0x49 && h[2] === 0x46 && h[3] === 0x46 && h[8] === 0x57 },
  { type: "audio/mpeg", match: (h) => (h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33) || (h[0] === 0xff && [0xf1, 0xf2, 0xf3, 0xf9, 0xfb].includes(h[1])) },
  { type: "audio/ogg", match: (h) => h[0] === 0x4f && h[1] === 0x67 && h[2] === 0x67 && h[3] === 0x53 },
  { type: "audio/flac", match: (h) => h[0] === 0x66 && h[1] === 0x4c && h[2] === 0x61 && h[3] === 0x43 },
  { type: "audio/mp4", match: (h) => h[4] === 0x66 && h[5] === 0x74 && h[6] === 0x79 && h[7] === 0x70 },
  { type: "audio/webm", match: (h) => h[0] === 0x1a && h[1] === 0x45 && h[2] === 0xdf && h[3] === 0xa3 },
];

async function resolveAudioFile(file) {
  if (!file) return null;
  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("audio/")) return file;
  try {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const signature = AUDIO_SIGNATURES.find((entry) => entry.match(header));
    if (signature) return new File([file], file.name || "audio", { type: signature.type });
  } catch {
    // Fall through to the extension check when the file cannot be read.
  }
  if (AUDIO_FILE_PATTERN.test(file.name || "")) {
    return new File([file], file.name, { type: mime || "application/octet-stream" });
  }
  return null;
}

// Opens the browser's native file picker (File Explorer on Windows) so the user
// can pick an audio file from their computer and import it into the project.
export function AudioImportButton({
  onImportAudioFile,
  notify,
  t,
  className = "panel-secondary",
  label,
  ariaLabel,
  iconSize = 16,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const audioFile = await resolveAudioFile(file);
    if (!audioFile) {
      const message = t("audioImportUnsupported", "Unsupported file. Choose an MP3, WAV, M4A, AAC or OGG audio file.");
      setStatus({ state: "error", message });
      notify?.(message);
      return;
    }
    setBusy(true);
    setStatus({ state: "loading", message: t("audioImporting", "Importing audio…") });
    try {
      const asset = await onImportAudioFile?.(audioFile);
      if (!asset) throw new Error("IMPORT_FAILED");
      const message = `${t("audioImported", "Audio added to the timeline")} · ${asset.name || file.name}`;
      setStatus({ state: "done", message });
      notify?.(message);
    } catch (error) {
      if (error?.message !== "IMPORT_FAILED") console.error(error);
      const message = t("audioImportFailed", "Could not import that audio file. Please try another one.");
      setStatus({ state: "error", message });
      notify?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="audio-import-control">
      <button
        className={className}
        type="button"
        disabled={busy}
        aria-label={ariaLabel || label}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <i className="generate-button-spinner" aria-hidden="true" /> : <DownloadSimple size={iconSize} />}
        {label}
      </button>
      <input ref={inputRef} hidden type="file" accept={AUDIO_FILE_ACCEPT} onChange={handleChange} />
      {status.message ? (
        <small
          className={`voice-download-status${status.state === "error" ? " is-error" : status.state === "done" ? " is-success" : ""}`}
          role="status"
        >
          {status.message}
        </small>
      ) : null}
    </span>
  );
}
