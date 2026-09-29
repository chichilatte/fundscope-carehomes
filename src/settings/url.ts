import { parseSelectedSettings, type SelectedSettings } from "./settings";

/** Query-string key that carries the encoded settings. */
export const SHARE_PARAM = "s";

/**
 * Encode the current settings as a compact, URL-safe string.
 * JSON → UTF-8 bytes → base64url (no padding).
 */
export function encodeSelectedSettings(settings: SelectedSettings): string {
  const json = JSON.stringify(settings);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode and validate an encoded settings string; null if malformed. */
export function decodeSelectedSettings(encoded: string): SelectedSettings | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return parseSelectedSettings(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

/** Read encoded settings from a `location.search` string (e.g. "?s=…"). */
export function parseShareUrl(search: string): SelectedSettings | null {
  const raw = new URLSearchParams(search).get(SHARE_PARAM);
  if (raw === null) return null;
  return decodeSelectedSettings(raw);
}

/** Build a share URL: the current page with `?s=…` carrying the settings. */
export function buildShareUrl(settings: SelectedSettings, currentHref: string): string {
  const url = new URL(currentHref);
  url.search = `${SHARE_PARAM}=${encodeSelectedSettings(settings)}`;
  url.hash = "";
  return url.toString();
}
