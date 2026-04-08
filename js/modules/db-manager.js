/**
 * Client-side persistence: cookies (theme) and localStorage (encrypted sign-in data).
 * Passwords are encrypted at rest (AES-GCM + PBKDF2); they are not stored in plain text.
 * Browser storage is never as safe as a password manager—use only on trusted devices.
 */

// -----------------------------------------------------------------------------
// Theme preference — cookies + localStorage (shared key for darkmode.js)
// -----------------------------------------------------------------------------
export const THEME_STORAGE_KEY = "tindapamilya-theme";
const THEME_COOKIE_NAME = "tindapamilya_theme";
const COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

/**
 * @param {string} name
 * @param {string} value
 * @param {{ maxAgeSec?: number; path?: string; sameSite?: "Lax" | "Strict" | "None" }} [opts]
 */
export function setCookie(name, value, opts = {}) {
  const maxAge = opts.maxAgeSec ?? COOKIE_MAX_AGE_SEC;
  const path = opts.path ?? "/";
  const sameSite = opts.sameSite ?? "Lax";
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`;
  if (typeof location !== "undefined" && location.protocol === "https:") {
    cookie += "; Secure";
  }
  document.cookie = cookie;
}

/**
 * @param {string} name
 * @returns {string|null}
 */
export function getCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

/**
 * @param {string} name
 */
export function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * @param {"dark" | "light"} mode
 */
export function setThemePreference(mode) {
  if (mode !== "dark" && mode !== "light") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore quota */
  }
  setCookie(THEME_COOKIE_NAME, mode, { maxAgeSec: COOKIE_MAX_AGE_SEC, path: "/" });
}

/**
 * Cookie first (cross-tab / server-readable), then localStorage.
 * @returns {"dark" | "light" | null}
 */
export function getThemePreference() {
  const fromCookie = getCookie(THEME_COOKIE_NAME);
  if (fromCookie === "dark" || fromCookie === "light") return fromCookie;
  try {
    const fromLs = localStorage.getItem(THEME_STORAGE_KEY);
    if (fromLs === "dark" || fromLs === "light") return fromLs;
  } catch {
    /* ignore */
  }
  return null;
}

// -----------------------------------------------------------------------------
// Saved sign-in — localStorage payload encrypted with Web Crypto (AES-GCM)
// -----------------------------------------------------------------------------
const CREDENTIALS_KEY = "tindapamilya-saved-credentials";
/** Strengthens PBKDF2; not a secret against a determined attacker inspecting the bundle. */
const CREDENTIAL_PEPPER = "tindapamilya:v1:cred-wrap";

/**
 * @param {string} b64
 * @returns {Uint8Array}
 */
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * @param {string} email
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveCredentialsKey(email, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${CREDENTIAL_PEPPER}:${email.trim().toLowerCase()}`),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Saves email (plain) and password (AES-GCM ciphertext). Email is needed for UX and key derivation.
 * @param {string} email
 * @param {string} password
 */
export async function saveEncryptedCredentials(email, password) {
  const trimmed = email.trim();
  if (!trimmed || !password) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveCredentialsKey(trimmed, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(password),
  );
  const payload = {
    v: 1,
    email: trimmed,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(cipherBuf)),
  };
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

/**
 * @returns {Promise<{ email: string; password: string } | null>}
 */
export async function loadEncryptedCredentials() {
  let raw;
  try {
    raw = localStorage.getItem(CREDENTIALS_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (data?.v !== 1 || !data.email || !data.salt || !data.iv || !data.ciphertext) {
    return null;
  }
  try {
    const salt = b64ToBytes(data.salt);
    const iv = b64ToBytes(data.iv);
    const key = await deriveCredentialsKey(data.email, salt);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      b64ToBytes(data.ciphertext),
    );
    const password = new TextDecoder().decode(plainBuf);
    return { email: data.email, password };
  } catch {
    return null;
  }
}

export function clearSavedCredentials() {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
  } catch {
    /* ignore */
  }
}
