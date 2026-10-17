import { requestUrl, requireApiVersion, type App } from "obsidian";
import type { HttpPort, HttpRequest } from "./provider.ts";
import type { SecretPort } from "./settings-record.ts";

const SECRET_API = "1.11.4";

/** Keychain port. Null before Obsidian 1.11.4, which turns Ask off. */
export function obsidianSecretPort(app: App): SecretPort | null {
  if (!requireApiVersion(SECRET_API)) return null;
  return {
    get(id) {
      const value = app.secretStorage.getSecret(id);
      return typeof value === "string" && value.length > 0 ? value : null;
    },
    set(id, secret) {
      app.secretStorage.setSecret(id, secret);
    },
    list() {
      return app.secretStorage.listSecrets();
    },
  };
}

export function obsidianHttpPort(): HttpPort {
  return {
    async send(request: HttpRequest) {
      try {
        const response = await requestUrl({
          url: request.url,
          method: request.method,
          headers: request.headers,
          throw: false,
          ...(request.body !== undefined
            ? { body: request.body, contentType: "application/json" }
            : {}),
        });
        return { status: response.status, body: response.text };
      } catch {
        return { status: 0, body: "" };
      }
    },
  };
}
