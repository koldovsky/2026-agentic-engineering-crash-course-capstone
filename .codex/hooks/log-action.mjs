import { fileURLToPath } from "node:url";
import { runHook } from "../../scripts/log-agent-action.mjs";

await runHook("codex", fileURLToPath(new URL("../../", import.meta.url)));
