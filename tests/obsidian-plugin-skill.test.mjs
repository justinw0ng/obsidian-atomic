import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillDir = join(root, ".cursor/skills/obsidian-plugin-e2e");
const skillFile = join(skillDir, "SKILL.md");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function markdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(path));
    else if (entry.name.endsWith(".md")) out.push(path);
  }
  return out;
}

function allFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(path));
    else out.push(path);
  }
  return out;
}

function relativeNames(dir) {
  return allFiles(dir)
    .map((path) => path.slice(dir.length + 1))
    .sort();
}

function relativeLinks(markdown) {
  const links = [];
  const re = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(markdown))) {
    const href = match[1].split("#")[0].split(" ")[0];
    if (!href) continue;
    if (/^[a-z]+:/i.test(href)) continue;
    if (href.startsWith("/")) continue;
    links.push(href);
  }
  return links;
}

test("obsidian-plugin-e2e skill has required frontmatter", () => {
  const text = readFileSync(skillFile, "utf8");
  assert.ok(text.startsWith("---\n"), "SKILL.md must start with YAML frontmatter");
  const end = text.indexOf("\n---\n", 4);
  assert.notEqual(end, -1, "frontmatter must close");
  const fm = text.slice(4, end);
  assert.match(fm, /^name:\s*obsidian-plugin-e2e\s*$/m);
  assert.match(fm, /^description:\s*>-\s*$/m);
  assert.match(fm, /End-to-end develop/);
  assert.match(fm, /\/obsidian-plugin-e2e/);
});

test("obsidian-plugin-e2e skill relative links resolve", () => {
  for (const file of markdownFiles(skillDir)) {
    const text = readFileSync(file, "utf8");
    for (const href of relativeLinks(text)) {
      const target = resolve(dirname(file), href);
      assert.ok(existsSync(target), `${file} links to missing ${href}`);
    }
  }
});

test("obsidian-plugin-e2e skill names files that still exist", () => {
  const required = [
    "AGENTS.md",
    "package.json",
    "manifest.json",
    "esbuild.config.mjs",
    "src/main.ts",
    "src/core.ts",
    "src/core/hobby.ts",
    "src/core/gym-log.ts",
    "src/core/update-notes.ts",
    "src/core/update-notes.json",
    "src/codeblocks.ts",
    "src/data/vault-source.ts",
    "src/util/vault-path.ts",
    "src/settings.ts",
    "src/util/core-plugin-options.ts",
    "src/core/dashboard.ts",
    "e2e/health-check.test.mjs",
    "e2e/lib/obsidian.mjs",
    "e2e/lib/vault.mjs",
    "tests/e2e-selectors.test.mjs",
    "tests/security.test.mjs",
    "tests/ci-paths.test.mjs",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    ".github/plugin-source-paths.txt",
    "scripts/bump-version.mjs",
    "scripts/set-update-note.mjs",
    "scripts/ensure-pr-version.mjs",
    "scripts/check-version-conflict.mjs",
  ];
  for (const rel of required) {
    assert.ok(existsSync(join(root, rel)), `skill references missing ${rel}`);
  }
});

test("package.json still has the verify commands the skill requires", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const script of [
    "test",
    "typecheck",
    "build",
    "dev",
    "test:e2e",
    "docs:user-guide-screenshots",
    "docs:hero-gif",
  ]) {
    assert.equal(typeof pkg.scripts[script], "string", `missing script ${script}`);
  }
  assert.match(pkg.scripts.test, /experimental-strip-types/);
  assert.match(pkg.scripts.typecheck, /tsc --noEmit/);
  assert.match(pkg.scripts["test:e2e"], /e2e\/\*\.test\.mjs/);
  assert.match(pkg.scripts["docs:hero-gif"], /animate-hero-gif\.py/);
});

test("AGENTS.md points at the obsidian-plugin-e2e skill", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /\.cursor\/skills\/obsidian-plugin-e2e\/SKILL\.md/);
});

test("AGENTS.md points at the vendored security-audit skill", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /\.cursor\/skills\/security-audit\/SKILL\.md/);
  const skill = read(".cursor/skills/security-audit/SKILL.md");
  assert.ok(skill.startsWith("---\n"), "security-audit SKILL.md must start with YAML frontmatter");
  assert.match(skill, /^name:\s*security-audit\s*$/m);
});

test("AGENTS.md points at the vendored thermo-nuclear skill", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /\.cursor\/skills\/thermo-nuclear-code-quality-review\/SKILL\.md/);
  const skill = read(".cursor/skills/thermo-nuclear-code-quality-review/SKILL.md");
  assert.ok(skill.startsWith("---\n"), "thermo-nuclear SKILL.md must start with YAML frontmatter");
  assert.match(skill, /^name:\s*thermo-nuclear-code-quality-review\s*$/m);
});

test("security-audit skill is pinned to the Cloudflare default-branch commit", () => {
  const pin = read(".cursor/skills/security-audit.SOURCE.md");
  assert.match(pin, /https:\/\/github\.com\/cloudflare\/security-audit-skill/);
  assert.match(pin, /c1c8a8c1471069fb0e188eeaff69b8e8db6564a8/);
  assert.match(pin, /default branch/i);
  assert.match(pin, /security-audit\.LICENSE/);
  assert.match(read(".cursor/skills/security-audit.LICENSE"), /MIT License/);
  assert.match(read(".cursor/skills/security-audit.LICENSE"), /Cloudflare, Inc\./);
});

test("thermo-nuclear skill is pinned to the cursor/plugins default-branch commit", () => {
  const pin = read(".cursor/skills/thermo-nuclear-code-quality-review.SOURCE.md");
  assert.match(pin, /https:\/\/github\.com\/cursor\/plugins/);
  assert.match(pin, /thermo-nuclear-code-quality-review/);
  assert.match(pin, /e43c7ee26e0038c6c1fa8380dd34ce86ff94cb2a/);
  assert.match(pin, /default branch/i);
});

test("vendored security-audit pack matches the pinned file set and relative links", () => {
  const dir = join(root, ".cursor/skills/security-audit");
  assert.deepEqual(relativeNames(dir), [
    "AI-AND-LLM.md",
    "ATTACK-CLASSES.md",
    "CLIENT-SIDE.md",
    "CLOUD-AND-DEPLOYMENT.md",
    "DATA-ISOLATION-AND-LIFECYCLE.md",
    "DESKTOP-MOBILE-AND-LOCAL-IPC.md",
    "HUNTING.md",
    "MEMORY-SAFETY-AND-BINARY.md",
    "PROTOCOLS-RPC-AND-MESSAGING.md",
    "RECONNAISSANCE.md",
    "RESOURCE-EXHAUSTION-AND-AVAILABILITY.md",
    "SKILL.md",
    "SUPPLY-CHAIN-AND-RELEASE.md",
    "VALIDATION-AND-REPORTING.md",
    "WEB-PROTOCOL-AND-AUTH.md",
    "report-schema.json",
    "validate-coverage-ledger.cjs",
    "validate-coverage-ledger.test.cjs",
    "validate-findings.cjs",
    "validate-findings.test.cjs",
  ]);
  for (const file of markdownFiles(dir)) {
    const text = readFileSync(file, "utf8");
    for (const href of relativeLinks(text)) {
      const target = resolve(dirname(file), href);
      assert.ok(existsSync(target), `${file} links to missing ${href}`);
    }
  }
});

test("vendored thermo-nuclear pack is the pinned SKILL.md only", () => {
  const dir = join(root, ".cursor/skills/thermo-nuclear-code-quality-review");
  assert.deepEqual(relativeNames(dir), ["SKILL.md"]);
});

test("skill and AGENTS.md ban instanceof Element and redundant type assertions", () => {
  const skill = read(".cursor/skills/obsidian-plugin-e2e/SKILL.md");
  const review = read(".cursor/skills/obsidian-plugin-e2e/references/plugin-review.md");
  const agents = read("AGENTS.md");
  for (const text of [skill, review, agents]) {
    assert.match(text, /instanceOf\(Element\)/);
    assert.match(text, /instanceof Element/);
    assert.match(text, /no-unnecessary-type-assertion/);
  }
});

test("skill and AGENTS.md document Obsidian API hygiene from 1.4.7 review", () => {
  const skill = read(".cursor/skills/obsidian-plugin-e2e/SKILL.md");
  const hygiene = read(".cursor/skills/obsidian-plugin-e2e/references/obsidian-api-hygiene.md");
  const review = read(".cursor/skills/obsidian-plugin-e2e/references/plugin-review.md");
  const agents = read("AGENTS.md");
  assert.match(skill, /obsidian-api-hygiene\.md/);
  assert.match(review, /obsidian-api-hygiene\.md/);
  assert.match(agents, /obsidian-api-hygiene\.md/);
  for (const text of [skill, hygiene, agents]) {
    assert.match(text, /activeWindow/);
    assert.match(text, /globalThis/);
    assert.match(text, /messageEl/);
    assert.match(text, /\*Covered/);
  }
  assert.match(skill, /noticeEl/);
  assert.match(hygiene, /noticeEl/);
  assert.match(hygiene, /no-unsafe-assignment/);
  assert.match(hygiene, /core-plugin-options\.ts/);
  assert.match(hygiene, /\(this: object\) => unknown/);
  assert.match(hygiene, /e2e-selectors\.test\.mjs/);
});

test("skill and AGENTS.md require a Thermo-Nuclear review gate before ready", () => {
  const skill = read(".cursor/skills/obsidian-plugin-e2e/SKILL.md");
  const agents = read("AGENTS.md");
  const cloud = read(".cursor/skills/obsidian-plugin-e2e/references/cloud.md");
  for (const text of [skill, agents]) {
    assert.match(text, /Thermo-Nuclear Code Quality Review/);
    assert.match(text, /REQUEST CHANGES/);
    assert.match(text, /confirmed security-audit findings/);
    assert.match(text, /CodeRabbit/);
    assert.match(text, /security-audit/);
    assert.match(text, /\.cursor\/skills\/security-audit\/SKILL\.md/);
    assert.match(text, /\.cursor\/skills\/thermo-nuclear-code-quality-review\/SKILL\.md/);
  }
  assert.match(cloud, /Thermo-Nuclear Code Quality Review/);
  assert.match(cloud, /security-audit/);
  assert.match(cloud, /\.cursor\/skills\/security-audit\/SKILL\.md/);
  assert.match(cloud, /\.cursor\/skills\/thermo-nuclear-code-quality-review\/SKILL\.md/);
});

test("skill and AGENTS.md keep hero banner capture rules", () => {
  const verify = read(".cursor/skills/obsidian-plugin-e2e/references/verify.md");
  const agents = read("AGENTS.md");
  for (const text of [verify, agents]) {
    assert.match(text, /capture-readme-hero\.sh/);
    assert.match(text, /heatmap, bookshelf, and cue overlay/);
    assert.match(text, /no scrollbar/);
    assert.match(text, /Center the mobile \/ narrow view/);
    assert.match(text, /docs:user-guide-screenshots/);
    assert.match(text, /docs:hero-gif/);
  }
});

test("skill and AGENTS.md keep in-app update notes and optional Actions inputs", () => {
  const skill = read(".cursor/skills/obsidian-plugin-e2e/SKILL.md");
  const release = read(".cursor/skills/obsidian-plugin-e2e/references/release.md");
  const agents = read("AGENTS.md");
  const cloud = read(".cursor/skills/obsidian-plugin-e2e/references/cloud.md");
  for (const text of [skill, release, agents, cloud]) {
    assert.match(text, /update note/);
  }
  for (const text of [skill, release, agents]) {
    assert.match(text, /latest update note/);
    assert.doesNotMatch(text, /Do not finalize/);
  }
  assert.match(skill, /one note may cover multiple PRs/i);
  assert.match(release, /one note may cover multiple PRs/i);
  assert.match(release, /src\/core\/update-notes\.json/);
  assert.match(release, /release_notes/);
  assert.match(release, /release_notes_zh_hant/);
  assert.match(release, /optional/i);
  assert.match(release, /body\.en/);
  assert.match(release, /body\.zh-Hant/);
  assert.match(agents, /src\/core\/update-notes\.json/);
  assert.match(agents, /release_notes/);
  assert.match(agents, /release_notes_zh_hant/);
  assert.match(agents, /optional/i);
  assert.match(cloud, /optional/i);
  for (const text of [skill, release, agents]) {
    assert.match(text, /zh-Hant/);
    assert.match(text, /must equal the plugin version being shipped/);
    assert.match(text, /older semver/);
    assert.match(text, /never ship with catalog behind manifest/);
  }
  assert.match(read("scripts/bump-version.mjs"), /src\/core\/update-notes\.json/);
  assert.match(release, /bump-version\.mjs[\s`]+keeps catalog/);
  assert.match(cloud, /must equal the plugin version being shipped/);
  assert.match(cloud, /never ship with catalog behind manifest/);
  assert.doesNotMatch(release, /staged 1\.1\.9 bodies/);
  assert.doesNotMatch(release, /catalog `version` stays at the current manifest/);
  assert.match(release, /中英夾雜/);
  assert.match(release, /口語語法/);
  assert.match(release, /開每日筆記同Heat Map會快啲/);
  for (const text of [skill, agents]) {
    assert.match(text, /中英夾雜/);
  }
});
