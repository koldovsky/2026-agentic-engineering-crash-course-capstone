// Finds ticked "[checks]" tasks in an OpenSpec tasks.md that have no red evidence file.
// Task line convention: `- [x] 2.1 [checks] <description>`; evidence file: `evidence/2.1-red.txt`.
const CHECKS_TASK = /^\s*-\s*\[[xX]\]\s+(\d+(?:\.\d+)*)\s+\[checks\]/;

export function tickedCheckTaskIds(tasksMd) {
  return tasksMd
    .split(/\r?\n/)
    .map((line) => CHECKS_TASK.exec(line)?.[1])
    .filter(Boolean);
}

export function missingEvidence(tasksMd, evidenceFiles) {
  const present = new Set(evidenceFiles);
  return tickedCheckTaskIds(tasksMd).filter((id) => !present.has(`${id}-red.txt`));
}
