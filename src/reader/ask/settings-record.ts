// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { DEFAULT_ASK_SETTINGS, type AskProviderId, type AskSettings } from "../../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isRecord } from "../../util/record.ts";

export type { AskProviderId, AskSettings };
export { DEFAULT_ASK_SETTINGS };

/** Obsidian secret ids: lowercase alphanumeric, optional dashes, short names. */
const SECRET_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SECRET_ID = 64;
const MAX_MODEL = 120;

const LEAKED_FIELDS = [
  "apiKey",
  "api_key",
  "secret",
  "token",
  "key",
  "authorization",
  "password",
] as const;

export function isAskProvider(value: unknown): value is AskProviderId {
  return value === "openai" || value === "anthropic" || value === "openai-compatible";
}

export function isSecretId(value: string): boolean {
  return value.length > 0 && value.length <= MAX_SECRET_ID && SECRET_ID.test(value);
}

function leakedValues(raw: Record<string, unknown>): Set<string> {
  const leaked = new Set<string>();
  for (const field of LEAKED_FIELDS) {
    const value = raw[field];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) leaked.add(trimmed);
    }
  }
  return leaked;
}

function cleanLine(value: unknown, max: number, leaked: Set<string>): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/[\r\n\0]/g, "");
  if (!trimmed || leaked.has(trimmed)) return "";
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** https anywhere, or http only on localhost. No userinfo, no other schemes. */
export function isAllowedAskBase(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 300) return false;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol === "https:") return true;
  if (url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function normalizeAskBase(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return isAllowedAskBase(trimmed) ? trimmed : "";
}

/** Fresh settings object. Drops secret values and unknown fields. */
export function normalizeAskSettings(raw: unknown): AskSettings {
  if (!isRecord(raw)) return { ...DEFAULT_ASK_SETTINGS };
  const leaked = leakedValues(raw);
  const secretName = cleanLine(raw.secretName, MAX_SECRET_ID, leaked);
  return {
    provider: isAskProvider(raw.provider) ? raw.provider : DEFAULT_ASK_SETTINGS.provider,
    model: cleanLine(raw.model, MAX_MODEL, leaked),
    secretName: isSecretId(secretName) ? secretName : "",
    baseUrl: normalizeAskBase(cleanLine(raw.baseUrl, 300, leaked)),
  };
}

export function cloneAskSettings(ask: AskSettings): AskSettings {
  return normalizeAskSettings(ask);
}

/** Read port for Obsidian `SecretStorage`, or a fake in tests. */
export interface SecretPort {
  get(id: string): string | null;
  set(id: string, secret: string): void;
  list(): string[];
}

export type SecretSaveResult =
  | { ok: true }
  | { ok: false; reason: "bad-id" | "empty" };

/**
 * Keychain wrapper. The value stays in the port. Callers must not write the
 * return value of `read` into settings, notes, canvas cards, or notices.
 */
export class SecretStore {
  private readonly port: SecretPort;

  constructor(port: SecretPort) {
    this.port = port;
  }

  read(id: string): string | null {
    if (!isSecretId(id)) return null;
    const value = this.port.get(id);
    return typeof value === "string" && value.length > 0 ? value : null;
  }

  save(id: string, secret: string): SecretSaveResult {
    if (!isSecretId(id)) return { ok: false, reason: "bad-id" };
    if (!secret.trim()) return { ok: false, reason: "empty" };
    this.port.set(id, secret);
    return { ok: true };
  }

  list(): string[] {
    return this.port.list().filter((id) => isSecretId(id));
  }
}

/** Remove a secret string if a provider error or answer echoes it. */
export function redactSecret(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join("[redacted]");
}
