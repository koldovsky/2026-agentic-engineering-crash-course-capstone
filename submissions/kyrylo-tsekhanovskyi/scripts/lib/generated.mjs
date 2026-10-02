// Staleness check for generated files: regenerate, compare, and always put the original back, so the
// check never changes the working tree (a stale staged file must fail on every commit attempt).
import fs from 'node:fs';

export async function isUpToDate(file, regenerate) {
  const original = fs.existsSync(file) ? fs.readFileSync(file) : null;
  try {
    await regenerate();
    return original !== null && fs.existsSync(file) && fs.readFileSync(file).equals(original);
  } finally {
    if (original === null) fs.rmSync(file, { force: true });
    else fs.writeFileSync(file, original);
  }
}
