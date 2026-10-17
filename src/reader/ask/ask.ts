// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { applyBookCard, type BookCard } from "./canvas.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { bookSendCount, buildAskRequest, buildProbeRequest, parseAskResponse, passageForScope, type AskScope, type HttpPort } from "./provider.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { SecretStore, type AskSettings, type SecretPort } from "./settings-record.ts";

export interface AskRequestInput {
  scope: AskScope;
  page: number;
  question: string;
  pageText?: string;
  selection?: string;
  bookText?: string;
  bookConfirmed?: boolean;
  chapter?: string;
  anchor?: string;
  quote?: string;
}

export type AskRunResult =
  | { status: "ask-off" }
  | { status: "need-secret" }
  | { status: "need-question" }
  | { status: "need-passage" }
  | { status: "bad-url" }
  | { status: "confirm-book"; characters: number }
  | { status: "provider-error" }
  | { status: "canvas-error"; reason: string }
  | {
      status: "ok";
      answer: string;
      canvasPath: string;
      canvasJson: string;
      noteMarkdown: string;
      cardId: string;
    };

function questionOf(input: AskRequestInput): string {
  return input.question.trim();
}

/**
 * Call the user's provider with the key from `secrets`. The key is not
 * written to the canvas, the note, or the returned answer.
 */
export async function runAsk(input: {
  askEnabled: boolean;
  settings: AskSettings;
  secrets: SecretPort;
  http: HttpPort;
  notePath: string;
  noteMarkdown: string;
  canvasJson: string | null;
  request: AskRequestInput;
  ids?: () => string;
}): Promise<AskRunResult> {
  if (!input.askEnabled) return { status: "ask-off" };
  const store = new SecretStore(input.secrets);
  const secret = store.read(input.settings.secretName);
  if (!secret) return { status: "need-secret" };
  if (!questionOf(input.request)) return { status: "need-question" };

  if (input.request.scope === "book" && input.request.bookConfirmed !== true) {
    return { status: "confirm-book", characters: bookSendCount(input.request.bookText) };
  }

  const passage = passageForScope(input.request);
  if (!passage) return { status: "need-passage" };

  const built = buildAskRequest(input.settings, secret, input.request);
  if (!built) return { status: "bad-url" };

  let response: { status: number; body: string };
  try {
    response = await input.http.send({
      url: built.url,
      method: built.method,
      headers: built.headers,
      body: built.body,
    });
  } catch {
    return { status: "provider-error" };
  }

  const parsed = parseAskResponse(input.settings, response.status, response.body, secret);
  if (!parsed.ok) return { status: "provider-error" };

  const card: BookCard = {
    kind: "ask",
    page: input.request.page,
    quote: input.request.quote?.trim() || questionOf(input.request),
    body: parsed.answer,
    chapter: input.request.chapter,
    anchor: input.request.anchor,
  };
  const written = applyBookCard({
    notePath: input.notePath,
    noteMarkdown: input.noteMarkdown,
    canvasJson: input.canvasJson,
    card,
    ids: input.ids,
  });
  if (!written.ok) return { status: "canvas-error", reason: written.reason };
  return {
    status: "ok",
    answer: parsed.answer,
    canvasPath: written.canvasPath,
    canvasJson: written.canvasJson,
    noteMarkdown: written.noteMarkdown,
    cardId: written.cardId,
  };
}

export async function probeAsk(
  settings: AskSettings,
  secrets: SecretPort,
  http: HttpPort,
): Promise<"ok" | "need-secret" | "bad-url" | "provider-error"> {
  const secret = new SecretStore(secrets).read(settings.secretName);
  if (!secret) return "need-secret";
  const request = buildProbeRequest(settings, secret);
  if (!request) return "bad-url";
  try {
    const response = await http.send(request);
    return response.status >= 200 && response.status < 300 ? "ok" : "provider-error";
  } catch {
    return "provider-error";
  }
}
