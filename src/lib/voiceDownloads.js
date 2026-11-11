import { zip, zipSync } from "fflate";
import { voiceModelFileUrls } from "../config/voiceModels.js";
import { orderModelUrlsForNetwork } from "./modelSources.js";

const KOKORO_UPSTREAM_VOICES = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices";
const PIPER_UPSTREAM = "https://huggingface.co/diffusionstudio/piper-voices/resolve/main";

// Piper stores its per-voice graphs under a language hierarchy. The runtime
// resolves the same paths through vits-web's PATH_MAP, so the download plan
// mirrors those exact files.
const PIPER_MODEL_PATHS = {
  "de_DE-thorsten-medium": "de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx",
  "es_ES-davefx-medium": "es/es_ES/davefx/medium/es_ES-davefx-medium.onnx",
  "fr_FR-siwis-medium": "fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx",
  "it_IT-riccardo-x_low": "it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx",
  "pt_BR-faber-medium": "pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx",
};

const MMS_MODEL_PATHS = {
  "vi_VN-mms-medium": "mms-vie",
  "ru_RU-mms-medium": "mms-rus",
  "th_TH-mms-medium": "mms-tha",
};

const AUDIO_EXTENSIONS = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

const PACK_CACHE_LIMIT = 2;
const packCache = new Map();

export function isUsableAudioBlob(blob) {
  return typeof Blob !== "undefined" && blob instanceof Blob && blob.size > 128;
}

export function voiceoverFilename(blob, base = "clipcraft-voiceover") {
  const mime = String(blob?.type || "").split(";")[0].trim().toLowerCase();
  return `${base}.${AUDIO_EXTENSIONS[mime] || "wav"}`;
}

export function triggerBlobDownload(blob, filename) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error("EMPTY_DOWNLOAD");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Large model packs need a few seconds to hand off to the browser's
  // downloader before their object URL can be released.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}

export function triggerVoiceoverDownload(blob, base = "clipcraft-voiceover") {
  return triggerBlobDownload(blob, voiceoverFilename(blob, base));
}

function mirrorFile(suffix, name = suffix.split("/").pop()) {
  return { name, urls: voiceModelFileUrls(suffix) };
}

function planForVoice(voice) {
  if (voice.engine === "kokoro") {
    const files = [
      mirrorFile("kokoro/onnx/model_quantized.onnx", "onnx/model_quantized.onnx"),
      mirrorFile("kokoro/config.json"),
      mirrorFile("kokoro/tokenizer.json"),
      mirrorFile("kokoro/tokenizer_config.json"),
      {
        name: `voices/${voice.id}.bin`,
        urls: [
          ...voiceModelFileUrls(`kokoro/voices/${voice.id}.bin`),
          `${KOKORO_UPSTREAM_VOICES}/${voice.id}.bin`,
        ],
      },
    ];
    return {
      files,
      label: `Kokoro 82M (q8 ONNX) · ${voice.name}`,
      description: "Kokoro 82M quantized ONNX graph, tokenizer and the selected voice style tensor.",
      sources: files.flatMap((file) => file.urls),
    };
  }
  if (voice.engine === "piper") {
    const path = PIPER_MODEL_PATHS[voice.id];
    if (!path) return null;
    const fileName = path.split("/").pop();
    const files = [
      {
        name: fileName,
        urls: [...voiceModelFileUrls(`piper/${path}`), `${PIPER_UPSTREAM}/${path}`],
      },
      {
        name: `${fileName}.json`,
        urls: [...voiceModelFileUrls(`piper/${path}.json`), `${PIPER_UPSTREAM}/${path}.json`],
      },
    ];
    return {
      files,
      label: `Piper ONNX · ${voice.name}`,
      description: "Piper VITS ONNX voice graph and its phoneme configuration.",
      sources: files.flatMap((file) => file.urls),
    };
  }
  if (voice.engine === "mms") {
    const model = MMS_MODEL_PATHS[voice.id];
    if (!model) return null;
    const graph = model === "mms-tha" ? "model.onnx" : "onnx/model_quantized.onnx";
    const files = [
      mirrorFile(`${model}/${graph}`),
      mirrorFile(`${model}/config.json`),
      mirrorFile(`${model}/tokenizer.json`),
      mirrorFile(`${model}/tokenizer_config.json`),
      mirrorFile(`${model}/special_tokens_map.json`),
      mirrorFile(`${model}/added_tokens.json`),
      mirrorFile(`${model}/vocab.json`),
    ];
    if (model !== "mms-tha") files.push(mirrorFile(`${model}/quantize_config.json`));
    return {
      files,
      label: `MMS VITS ONNX · ${voice.name}`,
      description: "MMS VITS ONNX voice graph, tokenizer and vocabulary files.",
      sources: files.flatMap((file) => file.urls),
    };
  }
  if (voice.engine === "supertonic") {
    const files = [
      mirrorFile("supertonic/voice_styles/F1.json", "voice_styles/F1.json"),
      mirrorFile("supertonic/config.json"),
      mirrorFile("supertonic/onnx/tts.json", "onnx/tts.json"),
      mirrorFile("supertonic/onnx/unicode_indexer.json", "onnx/unicode_indexer.json"),
    ];
    return {
      files,
      label: `Supertonic 3 ONNX · ${voice.name}`,
      description: "Supertonic voice style and runtime configuration (the shared graph is cached by the editor).",
      sources: files.flatMap((file) => file.urls),
    };
  }
  return null;
}

function buildModelInfo(voice, plan) {
  const lines = [
    "ClipCraft voice model pack",
    `Voice: ${voice.name} (${voice.id})`,
    `Model: ${plan.label}`,
    `Description: ${plan.description}`,
    `Downloaded: ${new Date().toISOString()}`,
    "",
    "Sources:",
    ...plan.sources.map((url) => `- ${url}`),
    "",
  ];
  return new TextEncoder().encode(lines.join("\n"));
}

async function fetchModelBytes(file, onChunk) {
  const candidates = await orderModelUrlsForNetwork(file.urls);
  let lastError;
  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const total = Number(response.headers.get("content-length")) || 0;
      if (!response.body?.getReader) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        onChunk?.(bytes.byteLength, bytes.byteLength || total);
        return bytes;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.length) {
          chunks.push(value);
          loaded += value.length;
          onChunk?.(loaded, total);
        }
      }
      const bytes = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return bytes;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`MODEL_MIRRORS_UNAVAILABLE: ${file.name}: ${lastError?.message || lastError || "unknown error"}`);
}

function zipEntries(entries) {
  return new Promise((resolve, reject) => {
    zip(entries, { level: 0 }, (error, data) => {
      if (!error) {
        resolve(data);
        return;
      }
      try {
        resolve(zipSync(entries, { level: 0 }));
      } catch (fallbackError) {
        reject(fallbackError);
      }
    });
  });
}

export async function buildVoiceModelPack(voice, { onProgress, onStatus } = {}) {
  if (!voice?.id) throw new Error("VOICE_REQUIRED");
  const plan = planForVoice(voice);
  if (!plan?.files?.length) throw new Error("MODEL_NOT_AVAILABLE");

  const cacheKey = `${voice.engine}:${voice.id}`;
  const cached = packCache.get(cacheKey);
  if (cached) {
    onProgress?.(100);
    return cached;
  }

  const entries = {};
  let totalBytes = 0;
  for (let index = 0; index < plan.files.length; index += 1) {
    const file = plan.files[index];
    onStatus?.({
      phase: "downloading",
      index: index + 1,
      total: plan.files.length,
      name: file.name,
      label: plan.label,
    });
    const bytes = await fetchModelBytes(file, (loaded, total) => {
      const withinFile = total > 0 ? Math.min(1, loaded / total) : 0;
      const percent = Math.round(((index + withinFile) / plan.files.length) * 92);
      onProgress?.(Math.max(1, Math.min(92, percent)));
    });
    entries[file.name] = bytes;
    totalBytes += bytes.byteLength;
  }

  entries["MODEL_INFO.txt"] = buildModelInfo(voice, plan);
  onStatus?.({ phase: "packaging", label: plan.label });
  const zipped = await zipEntries(entries);
  const pack = {
    blob: new Blob([zipped], { type: "application/zip" }),
    filename: `clipcraft-${voice.id}-voice-model.zip`,
    bytes: zipped.byteLength,
    sourceBytes: totalBytes,
    label: plan.label,
  };

  packCache.set(cacheKey, pack);
  while (packCache.size > PACK_CACHE_LIMIT) {
    packCache.delete(packCache.keys().next().value);
  }
  onProgress?.(100);
  return pack;
}

export function isModelDownloadError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return /MODEL_MIRRORS_UNAVAILABLE|MODEL_NOT_AVAILABLE|failed to fetch|fetch failed|networkerror|load failed|HTTP 4\d\d|HTTP 5\d\d/i.test(message);
}
