/** First-open cost of the default daily note. No Obsidian imports. */

export type DailyNoteScale = {
  gymSessions: number;
  golfSessions: number;
  readingItems: number;
};

export type DailyNotePassCaches = {
  /** True after layout ready, when folder scans are stored. */
  listCached: boolean;
  /** True after the first Time-log parse of each reading item. */
  timeLogCached: boolean;
};

export type DailyNotePassIo = {
  /** `vault.cachedRead` of reading item bodies for the heatmap. */
  readingBodyReads: number;
  /** `metadataCache.getFileCache` lookups while listing notes. */
  metadataLookups: number;
  /**
   * Hobby-item folder walks. Bookshelf and the reading heatmap each walk
   * when the list cache is cold.
   */
  hobbyListWalks: number;
  sessionListWalks: number;
};

/**
 * Default daily note: `atomic-bookshelf`, `atomic-heatmap` of gym/golf/reading,
 * `atomic-today`, `atomic-actions`. Gym/golf heatmaps read frontmatter only.
 * The reading heatmap parses every item Time log.
 */
export function dailyNotePassIo(
  scale: DailyNoteScale,
  caches: DailyNotePassCaches,
): DailyNotePassIo {
  const hobbyListWalks = caches.listCached ? 1 : 2;
  return {
    readingBodyReads: caches.timeLogCached ? 0 : scale.readingItems,
    metadataLookups:
      scale.gymSessions +
      scale.golfSessions +
      scale.readingItems * hobbyListWalks,
    hobbyListWalks,
    sessionListWalks: 2,
  };
}

/**
 * Startup passes for a restored daily note. The restore pass is skipped when
 * live blocks wait for `workspace.layoutReady` before reading the vault.
 */
export function dailyNoteStartupPasses(options: {
  renderBeforeLayoutReady: boolean;
  metadataReadyAtLayoutReady: boolean;
}): Array<"restore" | "layout-ready" | "metadata-resolved"> {
  const passes: Array<"restore" | "layout-ready" | "metadata-resolved"> = [];
  if (options.renderBeforeLayoutReady) passes.push("restore");
  passes.push("layout-ready");
  if (!options.metadataReadyAtLayoutReady) passes.push("metadata-resolved");
  return passes;
}

export function cachesAfterPass(
  pass: "restore" | "layout-ready" | "metadata-resolved",
): DailyNotePassCaches {
  switch (pass) {
    case "restore":
      return { listCached: false, timeLogCached: false };
    case "layout-ready":
      return { listCached: false, timeLogCached: true };
    case "metadata-resolved":
      return { listCached: false, timeLogCached: true };
    default: {
      const unseen: never = pass;
      throw new Error(`Unknown daily-note pass: ${unseen}`);
    }
  }
}

/** Sum I/O across a startup sequence. Time logs stay warm after the first pass. */
export function dailyNoteStartupIo(
  scale: DailyNoteScale,
  passes: Array<"restore" | "layout-ready" | "metadata-resolved">,
): DailyNotePassIo {
  const total: DailyNotePassIo = {
    readingBodyReads: 0,
    metadataLookups: 0,
    hobbyListWalks: 0,
    sessionListWalks: 0,
  };
  let timeLogCached = false;
  for (const pass of passes) {
    const io = dailyNotePassIo(scale, {
      listCached: false,
      timeLogCached,
    });
    total.readingBodyReads += io.readingBodyReads;
    total.metadataLookups += io.metadataLookups;
    total.hobbyListWalks += io.hobbyListWalks;
    total.sessionListWalks += io.sessionListWalks;
    if (pass === "restore" || pass === "layout-ready") timeLogCached = true;
  }
  return total;
}
