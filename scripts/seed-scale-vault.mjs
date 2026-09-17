#!/usr/bin/env node
/**
 * Seed a large Atomic vault for daily-note first-open profiling.
 *
 *   node scripts/seed-scale-vault.mjs /tmp/atomic-scale-e2e-vault
 */
import { seedScaleE2eVault, NODE_DAILY_NOTE_SCALE } from "../e2e/lib/scale-vault.mjs";

const vaultPath = process.argv[2] || "/tmp/atomic-scale-e2e-vault";
const gym = Number(process.env.ATOMIC_SCALE_GYM || NODE_DAILY_NOTE_SCALE.gymSessions);
const golf = Number(process.env.ATOMIC_SCALE_GOLF || NODE_DAILY_NOTE_SCALE.golfSessions);
const reading = Number(
  process.env.ATOMIC_SCALE_READING || NODE_DAILY_NOTE_SCALE.readingItems,
);

const result = seedScaleE2eVault({
  vaultPath,
  deployPlugin: process.env.ATOMIC_SCALE_DEPLOY !== "0",
  scale: { gymSessions: gym, golfSessions: golf, readingItems: reading },
});

process.stdout.write(
  `${JSON.stringify({ ...result, gym, golf, reading }, null, 2)}\n`,
);
