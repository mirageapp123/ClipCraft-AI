import { useCallback, useRef, useState } from "react";
import {
  buildVoiceModelPack,
  isModelDownloadError,
  isUsableAudioBlob,
  triggerBlobDownload,
  triggerVoiceoverDownload,
} from "../lib/voiceDownloads.js";

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function useVoiceoverAudioDownload({ notify, t } = {}) {
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const busyRef = useRef(false);

  const download = useCallback(async (blob, baseName = "clipcraft-voiceover") => {
    if (busyRef.current) return false;
    const unavailable = t?.("audioDownloadUnavailable", "Generate a voiceover first, then download it.") || "Generate a voiceover first, then download it.";
    if (!isUsableAudioBlob(blob)) {
      setState("error");
      setMessage(unavailable);
      notify?.(unavailable);
      return false;
    }
    busyRef.current = true;
    setState("preparing");
    setMessage(t?.("audioPreparingDownload", "Preparing audio download…") || "Preparing audio download…");
    try {
      // Let React paint the preparing state before the browser starts the file
      // handoff. This is also where an unsupported/empty blob is caught above.
      await new Promise((resolve) => {
        if (globalThis.requestAnimationFrame) globalThis.requestAnimationFrame(() => resolve());
        else globalThis.setTimeout(resolve, 0);
      });
      const filename = triggerVoiceoverDownload(blob, baseName);
      setState("done");
      const done = t?.("audioDownloaded", "Voiceover audio downloaded") || "Voiceover audio downloaded";
      setMessage(`${done} · ${filename}`);
      notify?.(`${done} · ${filename}`);
      globalThis.setTimeout(() => {
        setState((current) => (current === "done" ? "idle" : current));
      }, 2600);
      return true;
    } catch (error) {
      console.error(error);
      const failed = t?.("audioDownloadFailed", "Could not download the audio. Please try again.") || "Could not download the audio. Please try again.";
      setState("error");
      setMessage(failed);
      notify?.(failed);
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [notify, t]);

  return {
    download,
    state,
    message,
    isBusy: state === "preparing",
    suggestedFilename: null,
  };
}

export function useVoiceModelDownload({ notify, t } = {}) {
  const [state, setState] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const busyRef = useRef(false);

  const download = useCallback(async (voice) => {
    if (busyRef.current) return false;
    if (!voice?.id) {
      const missing = t?.("voiceModelUnavailable", "Select a voice before downloading its model.") || "Select a voice before downloading its model.";
      setState("error");
      setMessage(missing);
      notify?.(missing);
      return false;
    }
    busyRef.current = true;
    setState("downloading");
    setProgress(1);
    setMessage(t?.("voiceModelDownloading", "Downloading voice model…") || "Downloading voice model…");
    try {
      const pack = await buildVoiceModelPack(voice, {
        onProgress: (value) => setProgress(Math.max(1, Math.min(100, Math.round(value)))),
        onStatus: (status) => {
          if (status.phase === "packaging") {
            setState("packaging");
            setMessage(t?.("voiceModelPackaging", "Packaging voice model…") || "Packaging voice model…");
            return;
          }
          setState("downloading");
          setMessage(
            `${t?.("voiceModelDownloading", "Downloading voice model…") || "Downloading voice model…"} ${status.index}/${status.total}`,
          );
        },
      });
      triggerBlobDownload(pack.blob, pack.filename);
      setState("done");
      const done = t?.("voiceModelReady", "Voice model downloaded") || "Voice model downloaded";
      setMessage(`${done} · ${formatBytes(pack.bytes)}`);
      notify?.(`${done} · ${formatBytes(pack.bytes)}`);
      return true;
    } catch (error) {
      console.error(error);
      const unavailable = /MODEL_NOT_AVAILABLE|VOICE_REQUIRED/.test(error?.message || "");
      const failed = unavailable
        ? (t?.("voiceModelUnavailable", "This voice has no downloadable model files.") || "This voice has no downloadable model files.")
        : isModelDownloadError(error)
          ? (t?.("voiceModelNetworkFailed", "Could not download the voice model. Check your connection and try again.") || "Could not download the voice model. Check your connection and try again.")
          : (t?.("voiceModelFailed", "Could not download the voice model.") || "Could not download the voice model.");
      setState("error");
      setMessage(failed);
      notify?.(failed);
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [notify, t]);

  return {
    download,
    state,
    progress,
    message,
    isBusy: state === "downloading" || state === "packaging",
  };
}
