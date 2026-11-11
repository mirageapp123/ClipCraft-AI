import { useCallback } from "react";
import { transcribeAudioToCaptionSegments } from "../lib/asr.js";
import { sliceAudioBlob } from "../lib/media.js";

export function localizeAutoCaptionPhase(phase, t) {
  const text = String(phase || "");
  const format = (key, fallback, values = {}) => Object.entries(values).reduce(
    (result, [name, value]) => result.replace(`{${name}}`, value),
    t(key, fallback),
  );
  if (text.includes("Loading or reading") && text.includes("Whisper")) return t("asrDownloadingModel", text);
  if (text.includes("Detecting audio language")) return t("asrDetectingLanguage", text);
  if (text.includes("Initializing WebGPU")) return t("asrInitializingWebGpu", text);
  if (text.includes("Initializing WASM")) return t("asrInitializingWasm", text);
  if (text.includes("WebGPU initialization failed")) return t("asrFallingBackWasm", text);
  if (text.includes("Decoding source audio")) return t("asrDecodingAudio", text);
  if (text.includes("Worker unavailable")) return t("asrWorkerFallback", text);
  if (text.includes("Worker returned an unexpected result")) return t("asrRetryingWasm", text);
  if (text.includes("Writing captions")) return t("asrWritingCaptions", text);
  const languageMatch = text.match(/(?:Detected|Using)\s+(.+?)\s+for captions/);
  if (languageMatch) return format("asrTranscribingLanguage", text, { language: languageMatch[1] });
  return text;
}

export function useAutoCaptions(d) {
  return useCallback(async (options = {}) => {
    const inputBlob = options.blob ?? d.sourceAudioBlob;
    const timelineOffset = Number.isFinite(options.start) ? options.start : d.sourceAudioStart;
    if (d.status === "generating" || d.status === "captioning") return;
    if (d.trackLocks.caption) return void d.notify(d.t("captionTrackLocked"));
    if (!inputBlob) return void d.notify(d.t("autoCaptionsNeedsSource"));
    d.setStatus("captioning"); d.setStatusText(d.t("autoCaptionsPreparing")); d.setProgress(4); d.setActiveTool("audio");
    try {
      const clipBlob = Number.isFinite(options.duration)
        ? await sliceAudioBlob(inputBlob, options.sourceStart || 0, options.duration)
        : inputBlob;
      const result = await transcribeAudioToCaptionSegments(clipBlob, {
        preferredLanguage: d.uiLanguage, timelineOffset, grouping: options.grouping,
        onProgress: ({ progress, phase }) => { d.setProgress((current) => Math.max(current, progress)); d.setStatusText(localizeAutoCaptionPhase(phase, d.t)); },
      });
      d.setCaptionSegments((segments) => {
        const combined = (options.append ? [...segments, ...result.segments] : result.segments)
          .sort((a, b) => (a.start || 0) - (b.start || 0));
        let inheritedFontId = d.captionStyle?.fontId || "default";
        return combined.map((segment) => {
          inheritedFontId = segment.fontId || inheritedFontId;
          return segment.fontId ? segment : { ...segment, fontId: inheritedFontId };
        });
      });
      d.setScript((script) => options.append && script ? `${script}\n${result.text}` : result.text);
      d.setSelectedSegmentId(result.segments[0]?.id ?? ""); d.setSelectedTrack("caption"); d.setActiveTool("caption");
      d.setCaptionsEnabled(true); d.setTrackVisibility((visibility) => ({ ...visibility, caption: true }));
      const complete = d.t("autoCaptionsComplete").replace("{count}", result.segments.length);
      d.setStatus("done"); d.setStatusText(complete); d.setProgress(100);
      d.seekTo(result.segments[0]?.start ?? timelineOffset); d.notify(complete);
    } catch (error) {
      console.error(error); d.setStatus("error"); d.setStatusText(/ASR_WORD_TIMING_UNAVAILABLE|alignment_heads|attentions|token-level timestamps/i.test(error?.message || "")
        ? d.t("captionTimingUnavailable") : d.t("autoCaptionsFailed"));
      d.setProgress(0); d.notify(d.t("autoCaptionsFailedHint"));
    }
  }, [d]);
}
