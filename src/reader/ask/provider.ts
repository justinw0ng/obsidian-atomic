// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isRecord } from "../../util/record.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isAllowedAskBase, isAskProvider, normalizeAskBase, redactSecret, type AskSettings } from "./settings-record.ts";

export { isAllowedAskBase, normalizeAskBase };

export interface HttpRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export interface HttpPort {
  send(request: HttpRequest): Promise<HttpResponse>;
}

export type AskScope = "page" | "selection" | "book";

const OPENAI_CHAT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODELS = "https://api.openai.com/v1/models";
const ANTHROPIC_MESSAGES = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODELS = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";
const PASSAGE_CAP = 12_000;
const BOOK_CAP = 24_000;
const QUESTION_CAP = 2_000;

const SYSTEM_PROMPT =
  "Answer from the passage the user supplies. Be brief. Do not ask for or repeat API keys.";

export function isAskScope(value: unknown): value is AskScope {
  return value === "page" || value === "selection" || value === "book";
}

export function resolvedModel(settings: AskSettings): string {
  const custom = settings.model.trim();
  if (custom) return custom;
  switch (settings.provider) {
    case "openai":
    case "openai-compatible":
      return "gpt-4.1";
    case "anthropic":
      return "claude-sonnet-4-5";
    default: {
      const unreachable: never = settings.provider;
      return unreachable;
    }
  }
}

function chatUrl(settings: AskSettings): string | null {
  switch (settings.provider) {
    case "openai":
      return OPENAI_CHAT;
    case "anthropic":
      return ANTHROPIC_MESSAGES;
    case "openai-compatible": {
      const base = normalizeAskBase(settings.baseUrl);
      if (!base) return null;
      if (base.endsWith("/chat/completions")) return base;
      return `${base}/chat/completions`;
    }
    default: {
      const unreachable: never = settings.provider;
      return unreachable;
    }
  }
}

function modelsUrl(settings: AskSettings): string | null {
  switch (settings.provider) {
    case "openai":
      return OPENAI_MODELS;
    case "anthropic":
      return ANTHROPIC_MODELS;
    case "openai-compatible": {
      const base = normalizeAskBase(settings.baseUrl);
      if (!base) return null;
      const root = base.endsWith("/chat/completions")
        ? base.slice(0, -"/chat/completions".length)
        : base;
      return `${root}/models`;
    }
    default: {
      const unreachable: never = settings.provider;
      return unreachable;
    }
  }
}

function authHeaders(settings: AskSettings, secret: string): Record<string, string> {
  switch (settings.provider) {
    case "openai":
    case "openai-compatible":
      return { Authorization: `Bearer ${secret}` };
    case "anthropic":
      return {
        "x-api-key": secret,
        "anthropic-version": ANTHROPIC_VERSION,
      };
    default: {
      const unreachable: never = settings.provider;
      return unreachable;
    }
  }
}

function clip(text: string, max: number): { text: string; shortened: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= max) return { text: trimmed, shortened: false };
  return { text: trimmed.slice(0, max), shortened: true };
}

export function passageForScope(input: {
  scope: AskScope;
  pageText?: string;
  selection?: string;
  bookText?: string;
}): { text: string; characters: number; shortened: boolean } | null {
  switch (input.scope) {
    case "page": {
      const page = clip(input.pageText ?? "", PASSAGE_CAP);
      if (!page.text) return null;
      return { text: page.text, characters: page.text.length, shortened: page.shortened };
    }
    case "selection": {
      const selection = clip(input.selection ?? "", PASSAGE_CAP);
      if (!selection.text) return null;
      return {
        text: selection.text,
        characters: selection.text.length,
        shortened: selection.shortened,
      };
    }
    case "book": {
      const book = clip(input.bookText ?? "", BOOK_CAP);
      if (!book.text) return null;
      return { text: book.text, characters: book.text.length, shortened: book.shortened };
    }
    default: {
      const unreachable: never = input.scope;
      return unreachable;
    }
  }
}

function userMessage(input: {
  scope: AskScope;
  page: number;
  passage: string;
  shortened: boolean;
  question: string;
}): string {
  const label = input.shortened ? "Passage shortened." : "";
  const scopeLine = (() => {
    switch (input.scope) {
      case "page":
        return `Page ${input.page}`;
      case "selection":
        return `Selection on page ${input.page}`;
      case "book":
        return "Whole book";
      default: {
        const unreachable: never = input.scope;
        return unreachable;
      }
    }
  })();
  return [scopeLine, label, input.passage, `Question:\n${input.question}`]
    .filter((part) => part.trim())
    .join("\n\n");
}

export interface BuiltRequest extends HttpRequest {
  /** Present only so callers can redact. Never write this onto a card. */
  secret: string;
}

function chatBody(settings: AskSettings, user: string): string {
  const model = resolvedModel(settings);
  switch (settings.provider) {
    case "openai":
    case "openai-compatible":
      return JSON.stringify({
        model,
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
      });
    case "anthropic":
      return JSON.stringify({
        model,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: user }],
      });
    default: {
      const unreachable: never = settings.provider;
      return unreachable;
    }
  }
}

export function buildAskRequest(
  settings: AskSettings,
  secret: string,
  input: {
    scope: AskScope;
    page: number;
    question: string;
    pageText?: string;
    selection?: string;
    bookText?: string;
  },
): BuiltRequest | null {
  if (!isAskProvider(settings.provider) || !secret) return null;
  const url = chatUrl(settings);
  const passage = passageForScope(input);
  const question = clip(input.question, QUESTION_CAP).text;
  if (!url || !passage || !question) return null;
  const body = chatBody(
    settings,
    userMessage({
      scope: input.scope,
      page: input.page,
      passage: passage.text,
      shortened: passage.shortened,
      question,
    }),
  );
  if (body.includes(secret)) return null;
  return {
    url,
    method: "POST",
    headers: authHeaders(settings, secret),
    body,
    secret,
  };
}

export function buildProbeRequest(settings: AskSettings, secret: string): HttpRequest | null {
  if (!secret) return null;
  const url = modelsUrl(settings);
  if (!url) return null;
  return {
    url,
    method: "GET",
    headers: authHeaders(settings, secret),
  };
}

function textContent(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!Array.isArray(value)) return null;
  const parts: string[] = [];
  for (const part of value) {
    if (typeof part === "string") parts.push(part);
    else if (isRecord(part) && typeof part.text === "string") parts.push(part.text);
  }
  const joined = parts.join("").trim();
  return joined || null;
}

export function parseAskResponse(
  settings: AskSettings,
  status: number,
  body: string,
  secret: string,
): { ok: true; answer: string } | { ok: false; message: string } {
  const fail = (message: string) => ({
    ok: false as const,
    message: redactSecret(message, secret).slice(0, 180),
  });
  if (status < 200 || status >= 300) {
    let detail = "Provider did not answer";
    try {
      const parsed: unknown = JSON.parse(body);
      if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === "string") {
        detail = parsed.error.message;
      }
    } catch {
      detail = body.trim() || detail;
    }
    return fail(detail);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return fail("Provider did not answer");
  }
  if (!isRecord(parsed)) return fail("Provider did not answer");
  let answer: string | null = null;
  switch (settings.provider) {
    case "openai":
    case "openai-compatible": {
      const choices = parsed.choices;
      if (Array.isArray(choices) && isRecord(choices[0]) && isRecord(choices[0].message)) {
        answer = textContent(choices[0].message.content);
      }
      break;
    }
    case "anthropic":
      answer = textContent(parsed.content);
      break;
    default: {
      const unreachable: never = settings.provider;
      return unreachable;
    }
  }
  if (!answer) return fail("Provider did not answer");
  return { ok: true, answer: redactSecret(answer, secret) };
}

export function bookSendCount(bookText: string | undefined): number {
  return clip(bookText ?? "", BOOK_CAP).text.length;
}
