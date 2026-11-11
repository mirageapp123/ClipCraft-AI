import { AUTOMATIC_CAPTION_MODEL_ID, AUTOMATIC_CAPTION_MODEL_LABEL, AUTOMATIC_CAPTION_MODEL_REVISION } from "../config/models.js";
import { makeId } from "./timeline.js";
import { captionSegmentsFromWords } from "./captionSegmentation.js";

const ASR_SAMPLE_RATE = 16000;
const LANGUAGE_DETECTION_SECONDS = 20;

const UI_LANGUAGE_TO_WHISPER_LANGUAGE = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  th: "th",
  vi: "vi",
  it: "it",
  id: "id",
  ru: "ru",
  te: "te",
  kn: "kn",
  ml: "ml",
  ta: "ta",
  or: "or",
  mr: "mr",
  bn: "bn",
  gu: "gu",
  pa: "pa",
  hi: "hi",
  sa: "sa",
};

const WHISPER_LANGUAGE_NAMES = {
  en: "English",
  ja: "Japanese",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  th: "ไทย",
  vi: "Tiếng Việt",
  it: "Italiano",
  id: "Bahasa Indonesia",
  ru: "Русский",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  ta: "தமிழ்",
  or: "ଓଡ଼ିଆ",
  mr: "मराठी",
  bn: "বাংলা",
  gu: "ગુજરાતી",
  pa: "ਪੰਜਾਬੀ",
  hi: "हिन्दी",
  sa: "संस्कृतम्",
};

let transcriberState = null;
let asrWorker = null;
let shouldSkipAsrWorker = false;
let transcriptionActive = false;
const workerRequests = new Map();
const throwIfAborted = (signal) => {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
};

function getAudioContext(sampleRate = ASR_SAMPLE_RATE) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("This browser does not support AudioContext, so audio cannot be recognized.");
  }

  return new AudioContextClass({ sampleRate });
}

function downmixToMono(decoded) {
  if (decoded.numberOfChannels <= 1) {
    return new Float32Array(decoded.getChannelData(0));
  }

  const left = decoded.getChannelData(0);
  const right = decoded.getChannelData(1);
  const mono = new Float32Array(decoded.length);
  const scale = Math.SQRT2 / 2;
  for (let index = 0; index < decoded.length; index += 1) {
    mono[index] = (left[index] + right[index]) * scale;
  }
  return mono;
}

async function decodeAudioForAsr(blob) {
  const audioContext = getAudioContext();
  try {
    const buffer = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buffer.slice(0));
    return {
      audio: downmixToMono(decoded),
      duration: decoded.duration,
    };
  } finally {
    await audioContext.close().catch(() => {});
  }
}

function normalizeAsrText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function normalizeTokenId(value) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function getGeneratedTokenIds(output) {
  const tensorLike = output?.sequences ?? output;
  const rawTokens =
    tensorLike?.[0] && typeof tensorLike[0].tolist === "function"
      ? tensorLike[0].tolist()
      : typeof tensorLike?.tolist === "function"
        ? tensorLike.tolist()
        : tensorLike;
  const firstSequence = Array.isArray(rawTokens?.[0]) ? rawTokens[0] : rawTokens;
  return Array.isArray(firstSequence)
    ? firstSequence.map(normalizeTokenId).filter((token) => token !== null)
    : [];
}

function getWhisperLanguageIdMap(transcriber) {
  const langToId = transcriber?.model?.generation_config?.lang_to_id;
  if (!langToId) {
    return new Map();
  }

  return new Map(
    Object.entries(langToId)
      .map(([token, id]) => {
        const language = normalizeWhisperLanguageToken(token);
        return [normalizeTokenId(id), language];
      })
      .filter(([id, language]) => id !== null && language),
  );
}

function normalizeWhisperLanguageToken(token) {
  const normalized = String(token ?? "").match(/^<\|?([a-z_]+)\|?>$/i)?.[1];
  return normalized || String(token ?? "").replace(/[<|>]/g, "");
}

function getPreferredWhisperLanguage(preferredLanguage) {
  return UI_LANGUAGE_TO_WHISPER_LANGUAGE[preferredLanguage] ?? "en";
}

function getLanguageDetectionSample(audio) {
  const sampleLength = Math.min(audio.length, ASR_SAMPLE_RATE * LANGUAGE_DETECTION_SECONDS);
  return audio.subarray(0, sampleLength);
}

function isMultilingualWhisper(transcriber) {
  return Boolean(transcriber?.model?.generation_config?.is_multilingual);
}

function createModelLoadProgressCallback(onProgress) {
  const progressByFile = new Map();
  let reportedProgress = 8;

  return (event) => {
    const rawProgress = Number(event?.progress);
    if (!Number.isFinite(rawProgress)) {
      return;
    }

    const fileKey = event.file ?? event.name ?? event.url ?? "__model__";
    progressByFile.set(fileKey, Math.max(0, Math.min(100, rawProgress)));
    const totalProgress = Array.from(progressByFile.values()).reduce((sum, value) => sum + value, 0);
    const averageProgress = totalProgress / progressByFile.size;
    const nextProgress = Math.min(70, Math.max(8, Math.round(8 + averageProgress * 0.62)));
    if (nextProgress <= reportedProgress) {
      return;
    }

    reportedProgress = nextProgress;
    onProgress?.({
      progress: nextProgress,
      phase: `Loading or reading ${AUTOMATIC_CAPTION_MODEL_LABEL} ONNX`,
    });
  };
}

async function detectWhisperLanguage(transcriber, audio, preferredLanguage, onProgress) {
  const generationConfig = transcriber?.model?.generation_config;
  const fallbackLanguage = getPreferredWhisperLanguage(preferredLanguage);
  if (!isMultilingualWhisper(transcriber)) {
    return { language: "en", detected: false };
  }

  const languageIdMap = getWhisperLanguageIdMap(transcriber);
  if (!languageIdMap.size) {
    return { language: fallbackLanguage, detected: false };
  }

  const decoderStartTokenId = normalizeTokenId(generationConfig.decoder_start_token_id);
  if (decoderStartTokenId === null) {
    return { language: fallbackLanguage, detected: false };
  }

  try {
    onProgress?.({ progress: 70, phase: "Detecting audio language" });
    const sample = getLanguageDetectionSample(audio);
    const features = await transcriber.processor(sample);
    const output = await transcriber.model.generate({
      inputs: features.input_features,
      decoder_input_ids: [decoderStartTokenId],
      max_new_tokens: 1,
      return_timestamps: false,
    });
    const tokenIds = getGeneratedTokenIds(output);
    const languageTokenId = tokenIds.find((token) => token !== decoderStartTokenId && languageIdMap.has(token));
    const language = languageTokenId === undefined ? null : languageIdMap.get(languageTokenId);

    return {
      language: language || fallbackLanguage,
      detected: Boolean(language),
    };
  } catch (error) {
    console.warn("Whisper language detection failed, falling back to preferred language.", error);
    return { language: fallbackLanguage, detected: false };
  }
}

async function getTranscriber(onProgress) {
  if (!transcriberState || transcriberState.modelId !== AUTOMATIC_CAPTION_MODEL_ID) {
    const modelId = AUTOMATIC_CAPTION_MODEL_ID;
    transcriberState = {
      modelId,
      promise: (async () => {
        const { env, pipeline } = await import("@huggingface/transformers");
        env.useBrowserCache = false;
        const reportModelLoadProgress = createModelLoadProgressCallback(onProgress);
        return pipeline("automatic-speech-recognition", modelId, {
          dtype: "q8",
          revision: AUTOMATIC_CAPTION_MODEL_REVISION,
          device: "wasm",
          progress_callback: reportModelLoadProgress,
        });
      })(),
    };
  }

  try {
    return await transcriberState.promise;
  } catch (error) {
    transcriberState = null;
    throw error;
  }
}

function rejectWorkerRequests(error) {
  workerRequests.forEach((request) => {
    request.reject(error);
  });
  workerRequests.clear();
}

function getAsrWorker() {
  if (typeof Worker === "undefined") {
    return null;
  }

  if (asrWorker) {
    return asrWorker;
  }

  asrWorker = new Worker(new URL("../workers/asr.worker.js", import.meta.url), {
    type: "module",
  });

  asrWorker.addEventListener("message", (event) => {
    const message = event.data;
    const request = workerRequests.get(message?.requestId);
    if (!request) {
      return;
    }

    if (message.type === "progress") {
      request.onProgress?.({
        progress: message.progress,
        phase: message.phase,
      });
      return;
    }

    workerRequests.delete(message.requestId);
    if (message.type === "result") {
      request.resolve({
        output: message.output,
        language: message.language,
        languageDetected: Boolean(message.languageDetected),
        modelId: message.modelId,
      });
      return;
    }

    if (message.type === "error") {
      request.reject(new Error(message.error || "Automatic caption generation failed"));
    }
  });

  asrWorker.addEventListener("error", (event) => {
    const error = new Error(event.message || "The automatic caption worker failed to run");
    asrWorker?.terminate();
    asrWorker = null;
    rejectWorkerRequests(error);
  });

  return asrWorker;
}

function transcribeAudioInWorker(audio, { onProgress, preferredLanguage, signal, requireWorker = false, localModelRoot }) {
  throwIfAborted(signal);
  if (shouldSkipAsrWorker && !requireWorker) {
    return Promise.reject(new Error("The automatic caption worker is disabled for this session."));
  }

  const worker = getAsrWorker();
  if (!worker) {
    return Promise.reject(new Error("This browser does not support the automatic caption worker."));
  }

  const requestId = makeId("asr");
  const transferableAudio = audio.slice();
  return new Promise((resolve, reject) => {
    const abort = () => {
      // A terminating cancellation must never fall through to main-thread ASR.
      const error = new DOMException("Cancelled", "AbortError");
      asrWorker?.terminate();
      asrWorker = null;
      rejectWorkerRequests(error);
    };
    const cleanup = () => signal?.removeEventListener("abort", abort);
    workerRequests.set(requestId, {
      resolve: (value) => { cleanup(); resolve(value); },
      reject: (error) => { cleanup(); reject(error); },
      onProgress,
    });
    signal?.addEventListener("abort", abort, { once: true });

    worker.postMessage(
      {
        type: "transcribe",
        requestId,
        modelId: AUTOMATIC_CAPTION_MODEL_ID,
        audioBuffer: transferableAudio.buffer,
        preferredLanguage,
        localModelRoot,
      },
      [transferableAudio.buffer],
    );
  });
}

async function transcribeAudioOnMainThread(audio, { onProgress, preferredLanguage }) {
  const transcriber = await getTranscriber(onProgress);
  const languageResult = await detectWhisperLanguage(transcriber, audio, preferredLanguage, onProgress);
  const languageLabel = WHISPER_LANGUAGE_NAMES[languageResult.language] ?? languageResult.language.toUpperCase();
  onProgress?.({
    progress: 74,
    phase: `${languageResult.detected ? "Detected" : "Using"} ${languageLabel} for captions`,
  });
  const transcriptionOptions = {
    chunk_length_s: 30,
    max_new_tokens: 224,
    no_repeat_ngram_size: 3,
    repetition_penalty: 1.15,
    stride_length_s: 5,
    return_timestamps: "word",
  };
  if (isMultilingualWhisper(transcriber)) {
    transcriptionOptions.language = languageResult.language;
    transcriptionOptions.task = "transcribe";
  }
  const output = await transcriber(audio, transcriptionOptions);

  return {
    output,
    language: languageResult.language,
    languageDetected: languageResult.detected,
    modelId: AUTOMATIC_CAPTION_MODEL_ID,
    source: "main",
  };
}

function resetAsrWorker() {
  asrWorker?.terminate();
  asrWorker = null;
  workerRequests.clear();
}

async function runTranscription(
  blob,
  { onProgress, preferredLanguage = "en", timelineOffset = 0, grouping = "phrases", signal, requireWorker = false } = {},
) {
  throwIfAborted(signal);
  onProgress?.({ progress: 5, phase: "Decoding source audio" });
  const { audio, duration } = await decodeAudioForAsr(blob);
  throwIfAborted(signal);
  if (!audio.length || !duration) {
    throw new Error("No recognizable audio was detected.");
  }

  let result;
  try {
    result = await transcribeAudioInWorker(audio, { onProgress, preferredLanguage, signal, requireWorker });
    result.source = "worker";
  } catch (error) {
    throwIfAborted(signal);
    if (error?.name === "AbortError" || requireWorker) throw error;
    console.warn("ASR worker failed, falling back to main thread.", error);
    onProgress?.({ progress: 8, phase: "Worker unavailable, switching to main-thread captions" });
    result = await transcribeAudioOnMainThread(audio, { onProgress, preferredLanguage });
  }
  throwIfAborted(signal);

  const segments = captionSegmentsFromWords(result.output?.chunks, duration, {
    timelineOffset, grouping,
    normalizeText: (text) => normalizeAsrText(text),
  });
  if (!segments.length) {
    throw new Error("No usable captions were detected.");
  }

  onProgress?.({ progress: 96, phase: "Writing captions to the track" });
  return {
    segments,
    text: segments.map((segment) => segment.text).join("\n"),
    duration,
    language: result.language,
    languageDetected: result.languageDetected,
  };
}

export async function transcribeAudioToCaptionSegments(blob, options = {}) {
  if (transcriptionActive) throw Object.assign(new Error("EDITOR_BUSY"), { code: "EDITOR_BUSY" });
  transcriptionActive = true;
  try {
    return await runTranscription(blob, options);
  } finally {
    transcriptionActive = false;
  }
}

// Material analysis owns decoding and source coordinates, including empty speech results.
export async function transcribeSourcePcm(audio, { signal, onProgress, preferredLanguage, localModelRoot }) {
  if (transcriptionActive) throw Object.assign(new Error("EDITOR_BUSY"), { code: "EDITOR_BUSY" });
  if (!(audio instanceof Float32Array) || !audio.length || !localModelRoot) throw new Error("Local analysis input is not ready yet.");
  transcriptionActive = true;
  try {
    return await transcribeAudioInWorker(audio, { signal, onProgress, preferredLanguage, localModelRoot, requireWorker: true });
  } finally { transcriptionActive = false; }
}
