// Claude Code PostToolUse hook: lint each edited frontend file right away; exit 2 feeds the errors back to the agent.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const frontendDir = resolve(projectDir, "frontend");
const input = JSON.parse(readFileSync(0, "utf8"));
const edited = relative(frontendDir, resolve(projectDir, input.tool_input?.file_path ?? ""));
const isFrontendSource = !edited.startsWith("..") && !edited.includes("node_modules") && /\.(ts|tsx|js|jsx|mjs)$/.test(edited);

if (isFrontendSource) {
  try {
    execFileSync("npx", ["eslint", "--no-warn-ignored", edited], { cwd: frontendDir, stdio: "pipe" });
  } catch (error) {
    console.error(`eslint: ${error.stdout ?? ""}${error.stderr ?? ""}`);
    process.exit(2);
  }
}
