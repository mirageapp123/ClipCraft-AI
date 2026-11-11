// Generates src/i18nIndicCopy.js for the Indian interface languages.
//
// The English source strings are collected from every copy dictionary the app
// can display, machine translated through the public Google Translate endpoint,
// validated (script + placeholder preservation) and cached in
// scripts/i18n/indic-cache.json so reruns only translate new strings.
//
// Usage: node scripts/generate-indic-i18n.mjs [--lang=te,hi] [--force]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleUrl = (relativePath) => pathToFileURL(path.join(root, relativePath)).href;

const ALL_LANGUAGES = ["te", "kn", "ml", "ta", "or", "mr", "bn", "gu", "pa", "hi", "sa"];
const LANGUAGE_SCRIPT_RANGES = {
  te: "\\u0C00-\\u0C7F",
  kn: "\\u0C80-\\u0CFF",
  ml: "\\u0D00-\\u0D7F",
  ta: "\\u0B80-\\u0BFF",
  or: "\\u0B00-\\u0B7F",
  mr: "\\u0900-\\u097F",
  bn: "\\u0980-\\u09FF",
  gu: "\\u0A80-\\u0AFF",
  pa: "\\u0A00-\\u0A7F",
  hi: "\\u0900-\\u097F",
  sa: "\\u0900-\\u097F",
};

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, value = "true"] = argument.replace(/^--/, "").split("=");
    return [key, value];
  }),
);
const languages = args.has("lang") ? args.get("lang").split(",").map((item) => item.trim()).filter(Boolean) : ALL_LANGUAGES;
const force = args.get("force") === "true";
const cachePath = path.join(root, "scripts", "i18n", "indic-cache.json");
const outputPath = path.join(root, "src", "i18nIndicCopy.js");

const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
for (const language of languages) cache[language] ??= {};

const { ENGLISH_TRANSLATABLE_COPY, OPTION_COPY, UI_COPY } = await import(moduleUrl("src/i18n.js"));
const { UI_MESSAGE_COPY } = await import(moduleUrl("src/i18nMessages.js"));
const { WEBMCP_COPY } = await import(moduleUrl("src/i18nWebMcp.js"));
const { getAudioProcessingCopy } = await import(moduleUrl("src/i18nAudioProcessing.js"));
const captionEditing = await import(moduleUrl("src/i18nCaptionEditing.js"));
const { HOST_COPY } = await import(moduleUrl("src/i18nHost.js"));
const { MATERIAL_COPY_KEYS, materialText } = await import(moduleUrl("src/i18nMaterial.js"));
const { SCENE_COPY_KEYS, sceneText } = await import(moduleUrl("src/i18nScenes.js"));
const { PROJECT_IMPORT_COPY } = await import(moduleUrl("src/i18nProjectImport.js"));
const { EXPORT_FAILURE_COPY } = await import(moduleUrl("src/i18nExportFailure.js"));

// Reads a plain object literal out of a JSX module (JSX cannot be imported by Node).
function readObjectLiteral(relativePath, declaration) {
  const text = fs.readFileSync(path.join(root, relativePath), "utf8");
  const start = text.indexOf(declaration);
  if (start < 0) throw new Error(`Missing ${declaration} in ${relativePath}`);
  const begin = start + declaration.lastIndexOf("{");
  let depth = 0;
  let quote = "";
  for (let index = begin; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) {
      // Drop object spreads such as `...COPY.en,`; only the English entry is read.
      const literal = text
        .slice(begin, index + 1)
        .replace(/([{,]\s*)\.\.\.[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\s*(?=[,}])/g, "$1");
      return new Function(`return (${literal});`)();
    }
  }
  throw new Error(`Unterminated ${declaration} in ${relativePath}`);
}

const generationPluginsCopy = readObjectLiteral("src/components/GenerationPlugins.jsx", "const COPY = {");
const generationAuthCopy = readObjectLiteral("src/components/GenerationPlugins.jsx", "const AUTH_RECOVERY_COPY = {");
const generationLocalCopy = readObjectLiteral("src/components/GenerationPlugins.jsx", "const LOCAL_COPY = {");
const aiVectorCopy = readObjectLiteral("src/components/panels.jsx", "const AI_VECTOR_COPY = {");
const aiMusicCopy = readObjectLiteral("src/components/panels.jsx", "const AI_MUSIC_COPY = {");
const aiOptionLabels = readObjectLiteral("src/components/panels.jsx", "const AI_OPTION_LABELS = {");
const firstGuideCopy = readObjectLiteral("src/components/FirstVisualGuide.jsx", "const COPY = {");

// English literals passed as the second argument of t("key", "fallback").
// Keys missing from every dictionary render these, so they need translating too.
function collectTranslatorFallbacks() {
  const found = new Set();
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (!/\.(?:js|jsx)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, "utf8");
      for (const match of text.matchAll(/\bt\(\s*(["'`])[\w.]+\1\s*,\s*(["'`])((?:\\.|(?!\2).)*)\2\s*\)/g)) {
        found.add(match[3]);
      }
    }
  };
  visit(path.join(root, "src"));
  return [...found];
}

const translatorFallbacks = collectTranslatorFallbacks();

const englishSources = {
  ui: UI_COPY.en,
  feature: ENGLISH_TRANSLATABLE_COPY,
  message: UI_MESSAGE_COPY.en,
  option: OPTION_COPY.en,
  webMcp: WEBMCP_COPY.en,
  fallback: translatorFallbacks,
  module: {
    audioProcessing: getAudioProcessingCopy("en"),
    captionEditing: captionEditing.getCaptionEditingCopy("en"),
    videoSourceEnd: captionEditing.getVideoSourceEndCopy("en"),
    captionSpacing: captionEditing.getCaptionSpacingCopy("en"),
    captionKeyword: captionEditing.getCaptionKeywordCopy("en"),
    captionVisualLink: captionEditing.getCaptionVisualLinkCopy("en"),
    captionSelectionHighlight: captionEditing.getCaptionSelectionHighlightCopy("en"),
    host: HOST_COPY.en,
    material: Object.fromEntries(MATERIAL_COPY_KEYS.map((key) => [key, materialText("en", key)])),
    scenes: Object.fromEntries(SCENE_COPY_KEYS.map((key) => [key, sceneText("en", key)])),
    generationPlugins: { ...generationPluginsCopy.en, ...generationAuthCopy.en, ...generationLocalCopy.en },
    projectImport: PROJECT_IMPORT_COPY.en,
    exportFailure: EXPORT_FAILURE_COPY.en,
    aiVector: aiVectorCopy.en,
    aiMusic: aiMusicCopy.en,
    aiMusicLabels: aiOptionLabels.en,
    firstGuide: firstGuideCopy.en,
  },
};

const NON_TRANSLATABLE = /^(?:https?:\/\/|mailto:)/i;
const TECHNICAL_TOKEN = /^[\w.#:/\\-]{1,28}$/;

function shouldTranslate(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (!/[A-Za-z\u00C0-\u024F]/.test(value)) return false;
  if (NON_TRANSLATABLE.test(value)) return false;
  if (!/\s/.test(value) && TECHNICAL_TOKEN.test(value) && /[._/#:0-9-]/.test(value)) return false;
  return true;
}

function collectStrings(value, target) {
  if (typeof value === "string") {
    if (shouldTranslate(value)) target.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, target));
    return;
  }
  if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, target));
}

const allSources = new Set();
collectStrings(englishSources, allSources);

const placeholders = (value) => (value.match(/\{\w+\}/g) ?? []).sort().join("|");

function isValidTranslation(language, source, translated) {
  if (typeof translated !== "string" || !translated.trim()) return false;
  if (placeholders(source) !== placeholders(translated)) return false;
  if (/^[\x00-\x7F\s]*$/.test(source) && !/[a-z]{2,}/i.test(source)) return true;
  return new RegExp(`[${LANGUAGE_SCRIPT_RANGES[language]}]`).test(translated);
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const PLACEHOLDER_MARKER = /__I18N_PH_(\d+)__/g;

function protectPlaceholders(line) {
  const names = [];
  const text = line.replace(/\{(\w+)\}/g, (match, name) => {
    names.push(name);
    return `__I18N_PH_${names.length - 1}__`;
  });
  return { text, names };
}

function restorePlaceholders(text, names) {
  return text.replace(PLACEHOLDER_MARKER, (match, index) => {
    const name = names[Number(index)];
    return name === undefined ? match : `{${name}}`;
  });
}

async function requestTranslation(language, lines) {
  const protectedLines = lines.map(protectPlaceholders);
  const query = protectedLines.map((line) => line.text).join("\n");
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${language}&dt=t&q=${encodeURIComponent(query)}`;
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const parts = (data?.[0] ?? []).map((segment) => segment?.[0] ?? "");
      const translated = parts.join("");
      const translatedLines = translated.split("\n");
      while (translatedLines.length && translatedLines[translatedLines.length - 1] === "") translatedLines.pop();
      if (translatedLines.length === lines.length) {
        return translatedLines.map((line, index) => restorePlaceholders(line, protectedLines[index].names));
      }
      // Fall back to one request per line when the engine merges or splits lines.
      const perLine = [];
      for (const line of lines) perLine.push(...(await requestTranslation(language, [line])));
      return perLine;
    } catch (error) {
      lastError = error;
      await sleep(600 * (attempt + 1) ** 2);
    }
  }
  throw lastError;
}

function writeCache() {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache));
}

async function translateLanguage(language) {
  const pending = [...allSources].filter((source) => force || !cache[language][source] || cache[language][source] === source);
  console.log(`[${language}] ${pending.length} strings to translate (${allSources.size} total)`);
  let fallback = 0;
  let index = 0;
  while (index < pending.length) {
    const batch = [];
    let length = 0;
    while (index < pending.length && (length < 1600 || batch.length === 0)) {
      const source = pending[index];
      if (batch.length && length + source.length > 1800) break;
      batch.push(source);
      length += source.length + 1;
      index += 1;
    }
    let translatedLines;
    try {
      translatedLines = await requestTranslation(language, batch);
    } catch (error) {
      console.error(`[${language}] batch failed: ${error.message}`);
      translatedLines = batch;
    }
    batch.forEach((source, position) => {
      const translated = translatedLines[position];
      if (isValidTranslation(language, source, translated)) {
        cache[language][source] = translated;
      } else {
        cache[language][source] = source;
        fallback += 1;
      }
    });
    if (index % 400 < batch.length) writeCache();
    console.log(`[${language}] ${Math.min(index, pending.length)}/${pending.length}`);
  }
  writeCache();
  console.log(`[${language}] done, ${fallback} untranslated fallbacks`);
}

const runPool = async (items, worker, size) => {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });
  await Promise.all(runners);
};

await runPool(languages, translateLanguage, 3);

function translateValue(language, value) {
  if (typeof value === "string") {
    if (!shouldTranslate(value)) return value;
    return cache[language][value] ?? value;
  }
  if (Array.isArray(value)) return value.map((item) => translateValue(language, item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, translateValue(language, item)]));
  }
  return value;
}

const translateFallbacks = (language) => {
  const sources = englishSources.fallback.filter((value) => shouldTranslate(value));
  const translated = translateValue(language, sources);
  return Object.fromEntries(sources.map((source, index) => [source, translated[index]]));
};

const generated = Object.fromEntries(
  languages.map((language) => [
    language,
    {
      ui: translateValue(language, englishSources.ui),
      feature: translateValue(language, englishSources.feature),
      message: translateValue(language, englishSources.message),
      option: translateValue(language, englishSources.option),
      webMcp: translateValue(language, englishSources.webMcp),
      fallback: translateFallbacks(language),
      module: translateValue(language, englishSources.module),
    },
  ]),
);

const pick = (key) => Object.fromEntries(languages.map((language) => [language, generated[language][key]]));
const serialized = (value) => JSON.stringify(value);

const output = `// Generated by scripts/generate-indic-i18n.mjs. Do not edit by hand.
// Machine translated English UI copy for the Indian interface languages:
// ${languages.join(", ")}.
export const INDIC_UI_COPY = ${serialized(pick("ui"))};
export const INDIC_FEATURE_COPY = ${serialized(pick("feature"))};
export const INDIC_MESSAGE_COPY = ${serialized(pick("message"))};
export const INDIC_OPTION_COPY = ${serialized(pick("option"))};
export const INDIC_WEBMCP_COPY = ${serialized(pick("webMcp"))};
export const INDIC_FALLBACK_COPY = ${serialized(pick("fallback"))};
export const INDIC_MODULE_COPY = ${serialized(pick("module"))};
`;

fs.writeFileSync(outputPath, output);
console.log(`Wrote ${outputPath} (${(output.length / 1024).toFixed(1)} KiB)`);
