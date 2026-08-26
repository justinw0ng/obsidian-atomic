import test from "node:test";
import assert from "node:assert/strict";
import { nowYear, resolveBlockYear } from "../src/dates.ts";

test("resolveBlockYear prefers opts.year then frontmatter then fallback", () => {
  assert.equal(
    resolveBlockYear({ year: "2024" }, 2026, { frontmatterYear: 2025 }),
    2024,
  );
  assert.equal(
    resolveBlockYear({}, 2026, { frontmatterYear: 2025 }),
    2025,
  );
  assert.equal(resolveBlockYear({}, 2026, { frontmatterYear: "nope" }), 2026);
  assert.equal(resolveBlockYear({}, 2026, { frontmatterYear: 0 }), 2026);
  assert.equal(resolveBlockYear({}, 2026, { frontmatterYear: 2101 }), 2101);
});

test("resolveBlockYear ignores a non-numeric year option", () => {
  assert.equal(
    resolveBlockYear({ year: "nope" }, 2026, { frontmatterYear: 2024 }),
    2024,
  );
});

test("resolveBlockYear uses source path only when frontmatter is absent", () => {
  assert.equal(
    resolveBlockYear({}, 2026, {
      sourcePath: "atomics/exercise/Gym/2025/2025-06-10.md",
    }),
    2025,
  );
  assert.equal(
    resolveBlockYear({}, 2026, {
      frontmatterYear: 2024,
      sourcePath: "atomics/exercise/Gym/2025/2025-06-10.md",
    }),
    2024,
  );
});

test("nowYear matches timezone calendar year", () => {
  assert.equal(typeof nowYear("UTC"), "number");
});
