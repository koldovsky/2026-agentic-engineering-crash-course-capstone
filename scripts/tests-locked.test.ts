import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = join(process.cwd(), "scripts", "tests-locked.mjs");
let repo: string;

const git = (...args: string[]) => {
  const r = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
};
const write = (file: string, content: string) => {
  mkdirSync(dirname(join(repo, file)), { recursive: true });
  writeFileSync(join(repo, file), content);
};
const commit = (message: string) => {
  git("add", "-A");
  git("commit", "-q", "-m", message);
};
const run = () => spawnSync(process.execPath, [script], { cwd: repo, encoding: "utf8" });

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "tests-locked-"));
  git("init", "-q");
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "Test");
  git("config", "commit.gpgsign", "false");
  write("openspec/changes/add-shop/tasks.md", "- [ ] 0.1 red tests\n");
  write("openspec/changes/archive/old/tasks.md", "done\n");
  commit("docs: add spec");
});

afterEach(() => rmSync(repo, { recursive: true, force: true }));

describe("tests-locked", () => {
  it("skips a change that has no red commit yet", () => {
    write("lib/shop.test.ts", "draft");
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("skip    add-shop");
  });

  it("passes when implementation changes but red tests do not", () => {
    write("lib/shop.test.ts", "red");
    write("e2e/shop.spec.ts", "red");
    write("lib/shop.ts", "throw");
    commit("test(add-shop): add failing tests");
    write("lib/shop.ts", "impl");
    write("lib/extra.test.ts", "new test is allowed");
    commit("feat(add-shop): implement shop");
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("2 locked test file(s) unchanged");
  });

  it("fails when a red unit test is edited after the red commit", () => {
    write("lib/shop.test.ts", "red");
    commit("test(add-shop): add failing tests");
    write("lib/shop.test.ts", "weakened");
    commit("feat(add-shop): implement shop");
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("LOCKED  add-shop: lib/shop.test.ts");
  });

  it("fails on uncommitted edits and deletions of red tests", () => {
    write("lib/shop.test.ts", "red");
    write("e2e/shop.spec.ts", "red");
    commit("test(add-shop): add failing tests");
    write("lib/shop.test.ts", "dirty");
    unlinkSync(join(repo, "e2e/shop.spec.ts"));
    const r = run();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("lib/shop.test.ts");
    expect(r.stderr).toContain("e2e/shop.spec.ts");
  });

  it("accepts a new red commit as the new baseline", () => {
    write("lib/shop.test.ts", "red v1");
    commit("test(add-shop): add failing tests");
    write("lib/shop.test.ts", "red v2 after spec update");
    commit("test(add-shop): update tests for revised spec");
    expect(run().status).toBe(0);
  });

  it("ignores test commits of other changes", () => {
    write("lib/other.test.ts", "red");
    commit("test(other-change): add failing tests");
    write("lib/other.test.ts", "edited");
    commit("fix: whatever");
    expect(run().status).toBe(0);
  });
});
