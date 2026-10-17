const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;
const MAX_ENTRY_BYTES = 8 * 1024 * 1024;

export type ZipEntry = {
  name: string;
  read: () => Promise<Uint8Array>;
};

export type ZipArchive = {
  entries: ZipEntry[];
};

type ZipFile = {
  name: string;
  data: Uint8Array;
  method?: 0 | 8;
};

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== "function") {
    throw new Error("deflate is unavailable");
  }
  const stream = new CompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const write = writer.write(bytes.slice()).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  let total = 0;
  const read = (async () => {
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      if (!step.value) continue;
      total += step.value.byteLength;
      chunks.push(step.value);
    }
  })();
  await Promise.all([write, read]);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function findEocd(bytes: Uint8Array): number {
  const start = Math.max(0, bytes.length - (22 + 65535));
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (
      bytes[index] === 0x50 &&
      bytes[index + 1] === 0x4b &&
      bytes[index + 2] === 0x05 &&
      bytes[index + 3] === 0x06
    ) {
      return index;
    }
  }
  return -1;
}

function safeName(name: string): string | null {
  const text = name.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!text || text.includes("\0")) return null;
  const parts = text.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") return null;
    out.push(part);
  }
  return out.join("/");
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") {
    throw new Error("deflate is unavailable");
  }
  const stream = new DecompressionStream("deflate-raw");
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();
  const copy = bytes.slice();
  const write = writer.write(copy).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  let total = 0;
  const read = (async () => {
    for (;;) {
      const step = await reader.read();
      if (step.done) break;
      if (!step.value) continue;
      total += step.value.byteLength;
      if (total > MAX_ENTRY_BYTES) throw new Error("zip entry is too large");
      chunks.push(step.value);
    }
  })();
  await Promise.all([write, read]);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function openZip(bytes: Uint8Array): Promise<ZipArchive> {
  const eocd = findEocd(bytes);
  if (eocd < 0) throw new Error("zip end of central directory was not found");
  const view = viewOf(bytes);
  const count = view.getUint16(eocd + 10, true);
  const offset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || offset === 0xffffffff) {
    throw new Error("zip64 archives are not supported");
  }
  const decoder = new TextDecoder("utf-8");
  const entries: ZipEntry[] = [];
  let cursor = offset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length) throw new Error("zip central directory is truncated");
    if (view.getUint32(cursor, true) !== SIG_CENTRAL) {
      throw new Error("zip central directory entry is invalid");
    }
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = safeName(decoder.decode(nameBytes));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (!name) continue;
    const encrypted = (flags & 1) === 1;
    entries.push({
      name,
      read: async () => {
        if (encrypted) throw new Error("zip entry is encrypted");
        if (method !== 0 && method !== 8) throw new Error("zip method is unsupported");
        if (uncompressedSize > MAX_ENTRY_BYTES || compressedSize > MAX_ENTRY_BYTES) {
          throw new Error("zip entry is too large");
        }
        if (localOffset + 30 > bytes.length) throw new Error("zip local header is truncated");
        if (view.getUint32(localOffset, true) !== SIG_LOCAL) {
          throw new Error("zip local header is invalid");
        }
        const localName = view.getUint16(localOffset + 26, true);
        const localExtra = view.getUint16(localOffset + 28, true);
        const dataOffset = localOffset + 30 + localName + localExtra;
        const data = bytes.subarray(dataOffset, dataOffset + compressedSize);
        if (data.byteLength !== compressedSize) throw new Error("zip entry is truncated");
        if (method === 0) return data.slice();
        return inflateRaw(data);
      },
    });
  }
  return { entries };
}

export function zipEntry(archive: ZipArchive, name: string): ZipEntry | null {
  const norm = name.replace(/\\/g, "/").replace(/^\/+/, "");
  const exact = archive.entries.find((entry) => entry.name === norm);
  if (exact) return exact;
  const lower = norm.toLowerCase();
  return archive.entries.find((entry) => entry.name.toLowerCase() === lower) ?? null;
}

function packZip(files: readonly { name: Uint8Array; stored: Uint8Array; raw: Uint8Array; method: number }[]): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const local = new Uint8Array(30 + file.name.byteLength + file.stored.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, SIG_LOCAL, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, file.method, true);
    localView.setUint32(18, file.stored.byteLength, true);
    localView.setUint32(22, file.raw.byteLength, true);
    localView.setUint16(26, file.name.byteLength, true);
    local.set(file.name, 30);
    local.set(file.stored, 30 + file.name.byteLength);
    locals.push(local);

    const central = new Uint8Array(46 + file.name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, SIG_CENTRAL, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, file.method, true);
    centralView.setUint32(20, file.stored.byteLength, true);
    centralView.setUint32(24, file.raw.byteLength, true);
    centralView.setUint16(28, file.name.byteLength, true);
    centralView.setUint32(42, offset, true);
    central.set(file.name, 46);
    centrals.push(central);
    offset += local.byteLength;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.byteLength, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, SIG_EOCD, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const total = offset + centralSize + eocd.byteLength;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of locals) {
    out.set(part, cursor);
    cursor += part.byteLength;
  }
  for (const part of centrals) {
    out.set(part, cursor);
    cursor += part.byteLength;
  }
  out.set(eocd, cursor);
  return out;
}

/** Stored-only zip. Tests build small EPUBs with this. */
export function zipStored(files: readonly ZipFile[]): Uint8Array {
  const encoder = new TextEncoder();
  return packZip(
    files.map((file) => ({
      name: encoder.encode(file.name),
      stored: file.data,
      raw: file.data,
      method: 0,
    })),
  );
}

/** Deflated zip, for EPUB fixtures that match files on disk. */
export async function zipDeflated(files: readonly ZipFile[]): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const packed = [];
  for (const file of files) {
    const stored = file.method === 8 ? await deflateRaw(file.data) : file.data;
    packed.push({
      name: encoder.encode(file.name),
      stored,
      raw: file.data,
      method: file.method === 8 ? 8 : 0,
    });
  }
  return packZip(packed);
}
