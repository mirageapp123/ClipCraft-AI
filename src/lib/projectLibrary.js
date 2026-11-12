/**
 * Browser-local project library.
 *
 * Saved projects are stored as complete portable `.timeline` archives (the same
 * ZIP format used by "Export project package") inside IndexedDB. Metadata is
 * kept in a separate object store so the home screen can list projects without
 * reading every media blob.
 */

const DATABASE_NAME = "clipcraft-project-library";
const DATABASE_VERSION = 1;
const META_STORE = "projects";
const FILE_STORE = "archives";

let databasePromise = null;

function hasIndexedDb() {
  return typeof globalThis !== "undefined" && "indexedDB" in globalThis;
}

function openDatabase() {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("This browser does not support local project storage."));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(FILE_STORE)) {
          database.createObjectStore(FILE_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local project storage."));
      request.onblocked = () => reject(new Error("Local project storage is blocked by another tab."));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Local project storage was interrupted."));
  });
}

function createId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    // Fall through to the timestamp-based identifier.
  }
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeProjectRecord(record) {
  if (!record || typeof record !== "object") return null;
  return {
    id: String(record.id || ""),
    name: String(record.name || "Untitled project"),
    createdAt: Number(record.createdAt) || 0,
    updatedAt: Number(record.updatedAt) || Number(record.createdAt) || 0,
    duration: Number(record.duration) || 0,
    ratioId: typeof record.ratioId === "string" ? record.ratioId : "",
    clipCount: Number(record.clipCount) || 0,
    size: Number(record.size) || 0,
    thumbnail: typeof record.thumbnail === "string" ? record.thumbnail : "",
  };
}

/** List saved project metadata, newest first. The archive blobs stay unread. */
export async function listSavedProjects() {
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, "readonly");
  const request = transaction.objectStore(META_STORE).getAll();
  const records = await requestResult(request);
  return (Array.isArray(records) ? records : [])
    .map(normalizeProjectRecord)
    .filter((record) => record?.id)
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getSavedProject(id) {
  if (!id) return null;
  const database = await openDatabase();
  const transaction = database.transaction(META_STORE, "readonly");
  const record = await requestResult(transaction.objectStore(META_STORE).get(id));
  return normalizeProjectRecord(record);
}

/** Read the stored archive blob for one project. */
export async function getSavedProjectArchive(id) {
  if (!id) return null;
  const database = await openDatabase();
  const transaction = database.transaction(FILE_STORE, "readonly");
  const archive = await requestResult(transaction.objectStore(FILE_STORE).get(id));
  return archive instanceof Blob ? archive : null;
}

/**
 * Store (or update) a project. `print` is the name shown on the home screen.
 * Returns the saved metadata record.
 */
export async function saveProjectToLibrary({
  id,
  name,
  archive,
  thumbnail = "",
  duration = 0,
  ratioId = "",
  clipCount = 0,
}) {
  if (!(archive instanceof Blob)) throw new Error("The project archive could not be created.");
  const safeName = String(name || "").trim().slice(0, 120) || "Untitled project";
  const database = await openDatabase();
  const now = Date.now();
  const existing = id ? await getSavedProject(id) : null;
  const record = {
    id: existing?.id || id || createId(),
    name: safeName,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
    ratioId: typeof ratioId === "string" ? ratioId : "",
    clipCount: Number.isFinite(clipCount) ? Math.max(0, clipCount) : 0,
    size: archive.size,
    thumbnail: thumbnail || existing?.thumbnail || "",
  };
  const transaction = database.transaction([META_STORE, FILE_STORE], "readwrite");
  transaction.objectStore(FILE_STORE).put(archive, record.id);
  transaction.objectStore(META_STORE).put(record);
  await transactionDone(transaction);
  return normalizeProjectRecord(record);
}

export async function deleteSavedProject(id) {
  if (!id) return;
  const database = await openDatabase();
  const transaction = database.transaction([META_STORE, FILE_STORE], "readwrite");
  transaction.objectStore(META_STORE).delete(id);
  transaction.objectStore(FILE_STORE).delete(id);
  await transactionDone(transaction);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The preview image could not be loaded."));
    image.src = url;
  });
}

function loadVideoFrame(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else resolve(video);
    };
    const timer = window.setTimeout(() => finish(new Error("The preview frame timed out.")), 5000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      try {
        const time = Number.isFinite(video.duration) && video.duration > 0.2
          ? Math.min(0.1, video.duration / 3)
          : 0;
        if (time > 0) {
          const onSeeked = () => finish();
          video.addEventListener("seeked", onSeeked, { once: true });
          video.currentTime = time;
        } else {
          finish();
        }
      } catch (error) {
        finish(error);
      }
    };
    video.onerror = () => finish(new Error("The preview video could not be loaded."));
    video.src = url;
  });
}

/**
 * Create a small cover image for a saved project from its first visual clip.
 * Runs entirely on-device and never uploads media.
 */
export async function createProjectThumbnail(segment, { width = 480, height = 270 } = {}) {
  if (!segment) return "";
  const blob = segment.blob instanceof Blob ? segment.blob : null;
  const source = blob ? URL.createObjectURL(blob) : typeof segment.src === "string" ? segment.src : "";
  if (!source) return "";
  const isVideo = segment.type === "video" || (blob ? blob.type.startsWith("video/") : false);
  try {
    const media = isVideo ? await loadVideoFrame(source) : await loadImage(source);
    const sourceWidth = media.videoWidth || media.naturalWidth || 0;
    const sourceHeight = media.videoHeight || media.naturalHeight || 0;
    if (!sourceWidth || !sourceHeight) return "";
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.fillStyle = "#0b1220";
    context.fillRect(0, 0, width, height);
    const scale = Math.max(width / sourceWidth, height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    context.drawImage(media, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    if (isVideo) {
      media.pause?.();
      media.removeAttribute?.("src");
      media.load?.();
    }
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  } finally {
    if (blob) URL.revokeObjectURL(source);
  }
}
