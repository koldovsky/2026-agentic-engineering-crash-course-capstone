import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const ALGORITHM = "scrypt";
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

const MAX_COST = 1 << 20;
const MAX_BLOCK_SIZE = 16;
const MAX_PARALLELISM = 4;

function isPowerOfTwo(value: number): boolean {
  return Number.isInteger(value) && value >= 2 && (value & (value - 1)) === 0;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(password, salt, KEY_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELISM });
  return [ALGORITHM, COST, BLOCK_SIZE, PARALLELISM, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== ALGORITHM) return false;

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelism = Number(parts[3]);
  const withinLimits =
    isPowerOfTwo(cost) &&
    cost <= MAX_COST &&
    Number.isInteger(blockSize) &&
    blockSize >= 1 &&
    blockSize <= MAX_BLOCK_SIZE &&
    Number.isInteger(parallelism) &&
    parallelism >= 1 &&
    parallelism <= MAX_PARALLELISM;
  if (!withinLimits) return false;

  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = scryptSync(password, salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelism,
      maxmem: 256 * cost * blockSize,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
