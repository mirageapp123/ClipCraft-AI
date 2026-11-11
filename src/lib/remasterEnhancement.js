import { REMASTER_DRUNET_MODEL, REMASTER_DRUNET_MODEL_URL } from "../config/models.js";

export const REMASTER_DRUNET_MODEL_LABEL = REMASTER_DRUNET_MODEL.label;
export { REMASTER_DRUNET_MODEL_URL };

let worker = null;
const pending = new Map();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/remaster.worker.js", import.meta.url), { type: "module" });
  worker.addEventListener("message", (event) => {
    const message = event.data ?? {};
    const request = pending.get(message.requestId);
    if (!request) { message.result?.bitmap?.close?.(); return; }
    if (message.type === "progress") { request.onProgress?.(message); return; }
    pending.delete(message.requestId);
    request.signal?.removeEventListener("abort", request.abort);
    if (message.type === "result") request.resolve(message.result);
    else request.reject(new Error(message.error || "Video enhancement failed"));
  });
  worker.addEventListener("error", (event) => {
    const error = new Error(event.message || "The video enhancement worker failed");
    pending.forEach((request) => request.reject(error)); pending.clear();
    worker?.terminate(); worker = null;
  });
  return worker;
}

export function enhanceRemasterFrame({ bitmap, maxLongEdge = 960, strength = 1, outputType = "blob", sequenceId = "", allowResidualReuse = false, reuseThreshold = 0.012, onProgress, signal }) {
  if (!bitmap) return Promise.reject(new Error("There is no frame available to enhance"));
  const requestId = `remaster-${crypto.randomUUID?.() ?? Date.now()}`;
  return new Promise((resolve, reject) => {
    const activeWorker = getWorker();
    const abort = () => {
      pending.delete(requestId);
      bitmap.close?.();
      activeWorker.postMessage({ type: "cancel", requestId });
      const error = new Error("Video enhancement was cancelled"); error.name = "AbortError"; reject(error);
    };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener("abort", abort, { once: true });
    pending.set(requestId, { resolve, reject, onProgress, signal, abort });
    activeWorker.postMessage({ type: "enhance", requestId, bitmap, maxLongEdge, strength, outputType, sequenceId, allowResidualReuse, reuseThreshold }, [bitmap]);
  });
}

export async function captureRemasterSource({ type, src, video }) {
  if (type === "video") {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      throw new Error("The current video frame is not ready yet. Try again shortly.");
    }
    return createImageBitmap(video);
  }
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Failed to read the frame (HTTP ${response.status})`);
  return createImageBitmap(await response.blob());
}

export function disposeRemasterWorker() {
  worker?.terminate(); worker = null;
  pending.forEach((request) => request.reject(new Error("The video enhancement worker has been closed")));
  pending.clear();
}

if (import.meta.hot) {
  import.meta.hot.dispose(disposeRemasterWorker);
}
