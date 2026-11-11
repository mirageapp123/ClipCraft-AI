const ACCOUNTS_KEY = "clipcraft-accounts-v1";
const SESSION_KEY = "clipcraft-session-v1";
const PASSWORD_ITERATIONS = 150_000;
const PASSWORD_MIN_LENGTH = 8;

function authError(code, message) {
  return Object.assign(new Error(message), { code });
}

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full storage quota must not crash the entrance flow.
  }
}

function readAccounts() {
  const accounts = readJson(ACCOUNTS_KEY, []);
  return Array.isArray(accounts) ? accounts : [];
}

function writeAccounts(accounts) {
  writeJson(ACCOUNTS_KEY, accounts);
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function base64ToBytes(value) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bytes;
}

async function digestPassword(password, salt) {
  const key = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function emitChange(session) {
  window.dispatchEvent(new CustomEvent("clipcraft-auth-change", { detail: session }));
}

function setSession(session) {
  if (session) writeJson(SESSION_KEY, session);
  else {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }
  emitChange(session);
  return session;
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validatePassword(value) {
  const password = String(value ?? "");
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`;
  }
  if (password.length > 256) return "That password is too long.";
  return "";
}

export function getAuthSession() {
  const session = readJson(SESSION_KEY, null);
  if (!session || typeof session !== "object" || typeof session.provider !== "string") return null;
  if (session.provider !== "guest" && !isValidEmail(session.email)) return null;
  return session;
}

export function hasStoredAccount(email) {
  const target = normalizeEmail(email);
  return readAccounts().some((account) => account.email === target);
}

export async function createAccount(email, password) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw authError("INVALID_EMAIL", "Enter a valid email address.");
  const passwordError = validatePassword(password);
  if (passwordError) throw authError("INVALID_PASSWORD", passwordError);
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === normalized)) {
    throw authError("ACCOUNT_EXISTS", "An account with this email already exists. Sign in instead.");
  }
  const salt = randomBytes(16);
  const hash = await digestPassword(String(password), salt);
  const account = {
    email: normalized,
    salt: bytesToBase64(salt),
    hash,
    provider: "email",
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  return setSession({ provider: "email", email: normalized, createdAt: account.createdAt });
}

export async function signIn(email, password) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw authError("INVALID_EMAIL", "Enter a valid email address.");
  const account = readAccounts().find((item) => item.email === normalized);
  if (!account) throw authError("ACCOUNT_NOT_FOUND", "No account found for this email. Create an account first.");
  const hash = await digestPassword(String(password), base64ToBytes(account.salt));
  if (!constantTimeEqual(hash, account.hash)) throw authError("WRONG_PASSWORD", "Incorrect password. Try again.");
  return setSession({ provider: "email", email: normalized, createdAt: account.createdAt });
}

export function continueAsGuest() {
  return setSession({ provider: "guest", email: "", createdAt: new Date().toISOString() });
}

export function signInWithGoogleProfile(profile) {
  const email = normalizeEmail(profile?.email);
  if (!isValidEmail(email)) throw authError("INVALID_GOOGLE_ACCOUNT", "Google did not return a usable email address.");
  return setSession({
    provider: "google",
    email,
    name: String(profile?.name ?? ""),
    picture: String(profile?.picture ?? ""),
    createdAt: new Date().toISOString(),
  });
}

export function signOut() {
  setSession(null);
}

const GOOGLE_CLIENT_KEY = "clipcraft-google-client-id-v1";
const GOOGLE_CLIENT_PATTERN = /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;
const GOOGLE_PROMPT_TIMEOUT_MS = 10_000;
const GOOGLE_NO_SESSION_REASONS = new Set(["opt_out_or_no_session", "no_credentials"]);
const GOOGLE_CLIENT_ERROR_REASONS = new Set(["unregistered_origin", "invalid_client", "missing_client_id"]);

export function getGoogleClientId() {
  let stored = "";
  try {
    stored = String(window.localStorage.getItem(GOOGLE_CLIENT_KEY) ?? "").trim();
  } catch {
    // Storage can be unavailable in private browsing; fall back to the build value.
  }
  if (GOOGLE_CLIENT_PATTERN.test(stored)) return stored;
  return String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
}

export function setGoogleClientId(value) {
  const clientId = String(value ?? "").trim();
  if (!GOOGLE_CLIENT_PATTERN.test(clientId)) {
    throw authError(
      "INVALID_CLIENT_ID",
      "That does not look like a Google OAuth Web client ID. Paste the full value that ends with .apps.googleusercontent.com.",
    );
  }
  try {
    window.localStorage.setItem(GOOGLE_CLIENT_KEY, clientId);
  } catch {
    throw authError("GOOGLE_STORAGE_FAILED", "This browser could not save the client ID. Check that storage is enabled.");
  }
  return clientId;
}

export function clearGoogleClientId() {
  try {
    window.localStorage.removeItem(GOOGLE_CLIENT_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

let googleScriptPromise = null;

export function preloadGoogleIdentity() {
  if (!getGoogleClientId()) return;
  loadGoogleIdentityScript().catch(() => {});
}

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") return Promise.reject(authError("GOOGLE_UNAVAILABLE", "Google sign-in is unavailable here."));
  if (window.google?.accounts?.id || window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleScriptPromise = null;
      reject(authError("GOOGLE_UNAVAILABLE", "Could not load Google sign-in. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

function profileFromGoogleCredential(credential, clientId) {
  const segment = String(credential || "").split(".")[1];
  if (!segment) throw authError("GOOGLE_FAILED", "Google returned an incomplete sign-in response. Try again.");
  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(segment)));
  } catch {
    throw authError("GOOGLE_FAILED", "Google returned a sign-in response that could not be read. Try again.");
  }
  if (claims.aud !== clientId) {
    throw authError("GOOGLE_CLIENT_REJECTED", "Google returned a token for a different client ID. Update the saved client ID and try again.");
  }
  if (claims.exp && claims.exp * 1000 <= Date.now()) {
    throw authError("GOOGLE_FAILED", "The Google sign-in response expired. Try again.");
  }
  if (claims.email_verified === false) {
    throw authError("INVALID_GOOGLE_ACCOUNT", "That Google email address is not verified.");
  }
  return {
    email: claims.email,
    name: String(claims.name || claims.given_name || ""),
    picture: String(claims.picture || ""),
  };
}

function describeGoogleError(error) {
  const text = `${error?.message || ""} ${error?.type || ""}`.toLowerCase();
  if (/origin|client|audience|unauthorized/.test(text)) {
    return authError(
      "GOOGLE_CLIENT_REJECTED",
      `Google rejected this site or client ID. Add ${window.location.origin} as an Authorized JavaScript origin for the client, then try again.`,
    );
  }
  if (/popup|closed|cancel|dismiss|access_denied|interaction_required/.test(text)) {
    return authError("GOOGLE_CANCELLED", "Google sign-in was cancelled.");
  }
  return authError("GOOGLE_FAILED", "Google sign-in could not be completed. Please try again.");
}

function requestGooglePromptProfile(clientId, idApi) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = 0;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      callback(value);
    };
    try {
      idApi.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: (response) => {
          try {
            finish(resolve, profileFromGoogleCredential(response?.credential, clientId));
          } catch (error) {
            finish(reject, error);
          }
        },
      });
      idApi.prompt((notification) => {
        if (!notification) return;
        if (notification.isDisplayedMoment?.()) {
          // The picker is on screen; a slow user must not trip the safety timer.
          window.clearTimeout(timer);
          return;
        }
        if (notification.isDismissedMoment?.()) {
          const reason = notification.getDismissedReason?.();
          finish(
            reject,
            reason === "credential_returned"
              ? authError("GOOGLE_FAILED", "Google finished signing in but did not return a profile. Try again.")
              : authError("GOOGLE_CANCELLED", "Google sign-in was cancelled."),
          );
        } else if (notification.isSkippedMoment?.()) {
          finish(reject, googlePromptBlockedError(notification.getSkippedReason?.()));
        } else if (notification.isNotDisplayed?.()) {
          finish(reject, googlePromptBlockedError(notification.getNotDisplayedReason?.()));
        }
      });
      timer = window.setTimeout(
        () =>
          finish(
            reject,
            authError(
              "GOOGLE_PROMPT_UNAVAILABLE",
              "Google did not show an account picker. Sign in to Google in this browser first, then try again — or continue with email.",
            ),
          ),
        GOOGLE_PROMPT_TIMEOUT_MS,
      );
    } catch (error) {
      finish(reject, describeGoogleError(error));
    }
  });
}

function googlePromptBlockedError(reason) {
  if (GOOGLE_CLIENT_ERROR_REASONS.has(reason)) {
    return authError(
      "GOOGLE_CLIENT_REJECTED",
      `Google rejected this site or client ID. Add ${window.location.origin} as an Authorized JavaScript origin for the client, then try again.`,
    );
  }
  if (GOOGLE_NO_SESSION_REASONS.has(reason)) {
    return authError(
      "GOOGLE_NO_ACCOUNT",
      "This browser is not signed in to Google, so there is no account to choose. Sign in to Google in this browser, then try again — or continue with email.",
    );
  }
  if (reason === "secure_http_required") {
    return authError("GOOGLE_UNAVAILABLE", "Google sign-in needs HTTPS here. Open the app over HTTPS or continue with email.");
  }
  if (reason === "browser_not_supported") {
    return authError("GOOGLE_UNAVAILABLE", "This browser does not support Google sign-in. Try Chrome or Edge, or continue with email.");
  }
  return promptUnavailableError();
}

function promptUnavailableError() {
  return authError(
    "GOOGLE_PROMPT_UNAVAILABLE",
    "Google could not show the account picker. Sign in to Google in this browser first, then try again — or continue with email.",
  );
}

export async function signInWithGoogle() {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw authError("GOOGLE_NOT_CONFIGURED", "Google sign-in needs a client ID before it can start.");
  }
  await loadGoogleIdentityScript();
  const accounts = window.google?.accounts;
  if (!accounts?.id) {
    throw authError("GOOGLE_UNAVAILABLE", "Google sign-in is unavailable in this browser. Try Chrome or Edge, or continue with email.");
  }
  const profile = await requestGooglePromptProfile(clientId, accounts.id);
  return signInWithGoogleProfile(profile);
}
