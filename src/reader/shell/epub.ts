import type { ReaderBlock } from "./paginate.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { openZip, zipEntry, type ZipArchive } from "./zip.ts";

export type EpubBook = {
  blocks: ReaderBlock[];
};

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function visibleText(html: string): string {
  return decodeXml(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToReaderBlocks(html: string): ReaderBlock[] {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const blocks: ReaderBlock[] = [];
  const pattern = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of withoutNoise.matchAll(pattern)) {
    const text = visibleText(match[2] ?? "");
    if (!text) continue;
    const tag = (match[1] ?? "").toLowerCase();
    blocks.push({ kind: tag.startsWith("h") ? "heading" : "paragraph", text });
  }
  if (blocks.length) return blocks;
  const fallback = visibleText(withoutNoise.replace(/<\/(div|section|article)>/gi, "\n"));
  return fallback ? [{ kind: "paragraph", text: fallback }] : [];
}

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1]?.trim() ?? "";
}

function resolveZipPath(baseFile: string, href: string): string {
  const decoded = decodeURIComponent(href.split("#")[0] ?? "").replace(/\\/g, "/");
  if (!decoded) return "";
  if (decoded.startsWith("/")) return decoded.replace(/^\/+/, "");
  const dir = baseFile.includes("/") ? baseFile.slice(0, baseFile.lastIndexOf("/") + 1) : "";
  const parts = `${dir}${decoded}`.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

async function textEntry(archive: ZipArchive, name: string): Promise<string> {
  const entry = zipEntry(archive, name);
  if (!entry) throw new Error(`missing ${name}`);
  const bytes = await entry.read();
  return new TextDecoder("utf-8").decode(bytes);
}

export async function readEpub(bytes: Uint8Array): Promise<EpubBook> {
  const archive = await openZip(bytes);
  const container = await textEntry(archive, "META-INF/container.xml");
  const root = container.match(/full-path\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!root) throw new Error("epub container has no rootfile");
  const opfPath = resolveZipPath("", root);
  const opf = await textEntry(archive, opfPath);
  const manifest = new Map<string, string>();
  for (const tag of opf.matchAll(/<item\b[^>]*>/gi)) {
    const raw = tag[0] ?? "";
    const id = attr(raw, "id");
    const href = attr(raw, "href");
    if (!id || !href) continue;
    manifest.set(id, resolveZipPath(opfPath, href));
  }
  const spine: string[] = [];
  for (const tag of opf.matchAll(/<itemref\b[^>]*>/gi)) {
    const idref = attr(tag[0] ?? "", "idref");
    const href = manifest.get(idref);
    if (href) spine.push(href);
  }
  const blocks: ReaderBlock[] = [];
  for (const href of spine) {
    let html = "";
    try {
      html = await textEntry(archive, href);
    } catch {
      continue;
    }
    blocks.push(...htmlToReaderBlocks(html));
  }
  return { blocks };
}
