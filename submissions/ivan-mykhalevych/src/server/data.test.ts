import { beforeEach, describe, expect, it } from "vitest";
import type { Attempt } from "../lib/attempts";
import { importData, getData, recordAttempt } from "./data";
import { openDatabase } from "./db";
import type { Db } from "./db";
import { createUser, deleteUser } from "./users";

let db: Db;
let alice: number;
let bob: number;

function makeUser(email: string): number {
  const user = createUser(db, { email, displayName: "U", passwordHash: "h" }, 0);
  if (user === "email-taken") throw new Error("unexpected");
  return user.id;
}

const attempt = (at: number, level: Attempt["level"] = "junior", percent = 50, topic = "Basics"): Attempt => {
  const correct = percent / 10;
  return {
    at,
    level,
    total: 10,
    correct,
    percent,
    results: Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, topic, correct: i < correct })),
  };
};

beforeEach(() => {
  db = openDatabase(":memory:");
  alice = makeUser("alice@example.com");
  bob = makeUser("bob@example.com");
});

describe("getData and recordAttempt (spec R25)", () => {
  it("starts empty", () => {
    expect(getData(db, alice)).toEqual({ best: {}, attempts: [] });
  });

  it("appends an attempt and raises the best score of its level", () => {
    expect(recordAttempt(db, alice, attempt(1, "junior", 40))).toEqual({ ok: true });
    expect(recordAttempt(db, alice, attempt(2, "junior", 80))).toEqual({ ok: true });
    expect(recordAttempt(db, alice, attempt(3, "junior", 60))).toEqual({ ok: true });
    expect(recordAttempt(db, alice, attempt(4, "senior", 10))).toEqual({ ok: true });
    const data = getData(db, alice);
    expect(data.best).toEqual({ junior: 80, senior: 10 });
    expect(data.attempts.map((a) => a.at)).toEqual([1, 2, 3, 4]);
  });

  it("returns attempts oldest first even when they were recorded out of order", () => {
    for (const at of [3, 1, 2]) recordAttempt(db, alice, attempt(at));
    expect(getData(db, alice).attempts.map((a) => a.at)).toEqual([1, 2, 3]);
  });

  it("rejects invalid attempts and stores nothing", () => {
    const bad = [
      null,
      "text",
      { ...attempt(1), level: "expert" },
      { ...attempt(1), percent: 150 },
      { ...attempt(1), correct: 7 },
      { ...attempt(1), percent: 100 },
      { ...attempt(1), at: "now" },
      { ...attempt(1), results: [{ id: 1 }] },
    ];
    for (const value of bad) expect(recordAttempt(db, alice, value)).toEqual({ ok: false, error: "attempt-invalid" });
    expect(getData(db, alice)).toEqual({ best: {}, attempts: [] });
  });

  it("keeps only the newest 200 attempts", () => {
    for (let at = 1; at <= 205; at++) recordAttempt(db, alice, attempt(at));
    const { attempts } = getData(db, alice);
    expect(attempts).toHaveLength(200);
    expect(attempts[0].at).toBe(6);
    expect(attempts[199].at).toBe(205);
  });

  it("stores hostile text as plain data", () => {
    const hostile = "'); DROP TABLE attempts; --";
    expect(recordAttempt(db, alice, attempt(1, "junior", 50, hostile))).toEqual({ ok: true });
    expect(getData(db, alice).attempts[0].results[0].topic).toBe(hostile);
  });
});

describe("importData (spec R25)", () => {
  it("keeps the higher best score per level and adds new levels", () => {
    recordAttempt(db, alice, attempt(1, "junior", 60));
    const data = importData(db, alice, { best: { junior: 40, middle: 30, senior: 101, bogus: 5 }, attempts: [] });
    expect(data.best).toEqual({ junior: 60, middle: 30 });
    expect(importData(db, alice, { best: { junior: 90 }, attempts: [] }).best.junior).toBe(90);
  });

  it("merges attempts, de-duplicates by time, sorts and drops invalid entries", () => {
    recordAttempt(db, alice, attempt(1));
    recordAttempt(db, alice, attempt(2, "junior", 70));
    const data = importData(db, alice, { best: {}, attempts: [attempt(3), attempt(2, "junior", 90), { nonsense: true }, attempt(0)] });
    expect(data.attempts.map((a) => a.at)).toEqual([0, 1, 2, 3]);
    expect(data.attempts.find((a) => a.at === 2)?.percent).toBe(70);
  });

  it("reads at most 200 incoming attempts and keeps the newest 200 overall", () => {
    const incoming = Array.from({ length: 250 }, (_, i) => attempt(i + 1));
    const data = importData(db, alice, { best: {}, attempts: incoming });
    expect(data.attempts).toHaveLength(200);
    expect(data.attempts[199].at).toBe(200);
  });

  it("ignores payloads of the wrong shape", () => {
    recordAttempt(db, alice, attempt(1));
    expect(importData(db, alice, { best: "x", attempts: "y" })).toEqual(getData(db, alice));
    expect(importData(db, alice, {})).toEqual(getData(db, alice));
  });
});

describe("account isolation (spec R25, R28)", () => {
  it("never mixes data between accounts", () => {
    recordAttempt(db, alice, attempt(1, "junior", 90));
    importData(db, bob, { best: { middle: 20 }, attempts: [attempt(5, "middle", 20)] });
    expect(getData(db, alice)).toEqual({ best: { junior: 90 }, attempts: [attempt(1, "junior", 90)] });
    expect(getData(db, bob).best).toEqual({ middle: 20 });
    expect(getData(db, bob).attempts.map((a) => a.at)).toEqual([5]);
  });

  it("deleting one account removes only its data", () => {
    recordAttempt(db, alice, attempt(1));
    recordAttempt(db, bob, attempt(2));
    deleteUser(db, alice);
    expect(getData(db, alice)).toEqual({ best: {}, attempts: [] });
    expect(getData(db, bob).attempts.map((a) => a.at)).toEqual([2]);
  });
});
