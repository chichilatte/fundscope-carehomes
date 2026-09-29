import { describe, expect, it } from "vitest";
import { defaultSelectedSettings } from "../src/settings/settings";
import {
  buildShareUrl,
  decodeSelectedSettings,
  encodeSelectedSettings,
  parseShareUrl,
  SHARE_PARAM,
} from "../src/settings/url";

describe("share URL encoding", () => {
  it("round-trips settings through encode/decode", () => {
    const settings = defaultSelectedSettings();
    expect(decodeSelectedSettings(encodeSelectedSettings(settings))).toEqual(settings);
  });

  it("encodes to URL-safe characters only", () => {
    const encoded = encodeSelectedSettings(defaultSelectedSettings());
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects malformed and truncated input", () => {
    expect(decodeSelectedSettings("!!!not-base64!!!")).toBeNull();
    expect(decodeSelectedSettings("")).toBeNull();
    const valid = encodeSelectedSettings(defaultSelectedSettings());
    expect(decodeSelectedSettings(valid.slice(0, 4))).toBeNull();
  });

  it("rejects valid base64 that is not a valid settings object", () => {
    const bogus = btoa('{"nope":true}').replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeSelectedSettings(bogus)).toBeNull();
  });
});

describe("share URL parsing", () => {
  it("reads settings from a search string", () => {
    const settings = defaultSelectedSettings();
    const search = `?${SHARE_PARAM}=${encodeSelectedSettings(settings)}`;
    expect(parseShareUrl(search)).toEqual(settings);
  });

  it("returns null when the param is absent or empty", () => {
    expect(parseShareUrl("")).toBeNull();
    expect(parseShareUrl("?other=1")).toBeNull();
    expect(parseShareUrl(`?${SHARE_PARAM}=`)).toBeNull();
  });
});

describe("buildShareUrl", () => {
  it("builds a URL carrying the encoded settings and drops hash/other params", () => {
    const settings = defaultSelectedSettings();
    const url = buildShareUrl(settings, "https://example.com/app/?foo=bar#frag");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://example.com");
    expect(parsed.pathname).toBe("/app/");
    expect(parsed.hash).toBe("");
    expect(parsed.searchParams.get(SHARE_PARAM)).toBe(encodeSelectedSettings(settings));
    expect(parsed.searchParams.get("foo")).toBeNull();
  });
});
