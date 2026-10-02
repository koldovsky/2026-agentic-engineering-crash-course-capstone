// Regenerates frontend/src/app/api/schema.d.ts from the contract in force (ADR 0010): the active
// change's contracts/openapi.yaml if it has one, otherwise openspec/contracts/openapi.yaml.
// Used by `npm --prefix frontend run generate:api` and the API-types step of `check:fe`.
import path from 'node:path';
import { ROOT, run } from './lib/proc.mjs';
import { contractPath } from './lib/contract.mjs';

const contract = path.relative(path.join(ROOT, 'frontend'), contractPath(ROOT)).replace(/\\/g, '/');
const result = await run(`npm --prefix frontend exec -- openapi-typescript "${contract}" -o src/app/api/schema.d.ts`, {
  cwd: path.join(ROOT, 'frontend'),
});
process.exitCode = result.exitCode;
