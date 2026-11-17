import { DownloadSimple } from "@phosphor-icons/react";
import { useRef, useState } from "react";

export const AUDIO_FILE_ACCEPT = "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.webm,.mka";
const AUDIO_FILE_PATTERN = /\.(mp3|wav|m4a|aac|ogg|opus|flac|webm|mka)$/i;

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
    const isAudio = String(file.type || "").startsWith("audio/") || AUDIO_FILE_PATTERN.test(file.name || "");
    if (!isAudio) {
      const message = t("audioImportUnsupported", "Unsupported file. Choose an MP3, WAV, M4A, AAC or OGG audio file.");
      setStatus({ state: "error", message });
      notify?.(message);
      return;
    }
    setBusy(true);
    setStatus({ state: "loading", message: t("audioImporting", "Importing audio…") });
    try {
      const asset = await onImportAudioFile?.(file);
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
