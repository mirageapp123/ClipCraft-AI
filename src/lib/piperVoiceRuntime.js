import * as ort from "onnxruntime-web/webgpu";
import ortWasmMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url";
import ortWasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";
import { voiceModelFileUrls } from "../config/voiceModels.js";
import { orderModelUrlsForNetwork } from "./modelSources.js";
import { preparePiperVoiceStorage } from "./voiceModelStorage.js";

ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;
ort.env.wasm.wasmPaths = { mjs: ortWasmMjsUrl, wasm: ortWasmUrl };
ort.env.webgpu.powerPreference = "high-performance";
ort.env.webgpu.forceFallbackAdapter = false;

export async function predictPiperVoice(tts, input, onProgress) {
  const modelPath = tts?.PATH_MAP?.[input.voiceId];
  if (!modelPath || !tts?.HF_BASE) throw new Error(`Unsupported Piper voice: ${input.voiceId}`);

  // vits-web keys its existing OPFS cache by the original Hugging Face URL's
  // filename. Intercept only this voice's two uncached downloads so the owned
  // mirrors keep that source-independent cache identity.
  const upstreamUrls = [
    `${tts.HF_BASE}/${modelPath}.json`,
    `${tts.HF_BASE}/${modelPath}`,
  ];
  const routes = new Map();
  for (const upstreamUrl of upstreamUrls) {
    const suffix = upstreamUrl.slice(`${tts.HF_BASE}/`.length);
    routes.set(upstreamUrl, await orderModelUrlsForNetwork(voiceModelFileUrls(`piper/${suffix}`)));
  }

  const originalFetch = globalThis.fetch;
  await preparePiperVoiceStorage(tts, input.voiceId);
  const mirroredFetch = async (resource, init) => {
    const requestUrl = typeof resource === "string" ? resource : resource?.url;
    const candidates = routes.get(requestUrl);
    if (!candidates) return originalFetch(resource, init);
    const failures = [];
    for (const candidate of candidates) {
      try {
        const response = await originalFetch(candidate, init);
        if (response.ok) return response;
        failures.push(`${new URL(candidate).hostname}: HTTP ${response.status}`);
      } catch (error) {
        failures.push(`${new URL(candidate).hostname}: ${error?.message || String(error)}`);
      }
    }
    throw new Error(`MODEL_MIRRORS_UNAVAILABLE: ${failures.join("; ")}`);
  };
  globalThis.fetch = mirroredFetch;
  const originalConsoleError = console.error;
  let reportedQuotaSkip = false;
  const filteredConsoleError = (...args) => {
    const quotaError = args.some((value) => /QuotaExceededError|exceed.*storage quota/i.test(value?.message || String(value || "")));
    if (!quotaError) originalConsoleError(...args);
    else if (!reportedQuotaSkip) {
      reportedQuotaSkip = true;
      console.info("[Voice] Persistent Piper cache is full; continuing this generation from memory.");
    }
  };
  console.error = filteredConsoleError;
  try {
    return await tts.predict(input, onProgress);
  } finally {
    if (console.error === filteredConsoleError) console.error = originalConsoleError;
    if (globalThis.fetch === mirroredFetch) globalThis.fetch = originalFetch;
  }
}
