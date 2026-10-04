---
name: init-log
description: Step-by-step logging of the project initiation skills (init-project, docker-build, yii-clone-install, yii-prepare, init-api, generate-api, init-emulator, generate-emulator) into logs/init_<timestamp>/log_<skill name>.log - one JSON line per step with action, start_time, end_time, execution_time. Use whenever an initiation skill runs, to record its steps for checking and debugging.
---

# Init log

Every initiation skill records its steps here. Helper script: `.claude/skills/init-log/init-log.sh` (bash, run from the
repository root; in Git Bash `date +%s%3N` gives milliseconds).

## Layout
```text
logs/                                  git-ignored contents (logs/.gitignore = "*" + "!.gitignore")
    init_<unix seconds>/               one directory per initiation run (created once, see "Run directory")
        log_init-project.log           one file per skill: log_<skill name>.log (skill name exactly as in its SKILL.md)
        log_docker-build.log
        log_yii-clone-install.log      builds the one shared skeleton in tmp/yii-skeleton
        log_yii-prepare.log            prepares that skeleton
        log_init-api.log               copies the skeleton into demo/ and sets up the API
        log_generate-api.log           generates the API code from its layer specs
        log_init-emulator.log          copies the skeleton into emulator/ and sets up the emulator
        log_generate-emulator.log      generates the emulator code from its layer specs
```
- Every skill writes `log_<skill name>.log`. If a skill is run again in the same run, it appends to its file.

## Log line format
One JSON object per line (JSON Lines), exactly these keys:

```json
{"action": "composer install --prefer-dist", "start_time": 1790372363564, "end_time": 1790372363942, "execution_time": 378}
```

| Key | Meaning |
|-----|---------|
| `action` | short text about the step (what was done, with the file name where useful; the app is known from the file name); a failed step is prefixed `FAILED: ` |
| `start_time` | Unix epoch, **milliseconds** (integer) |
| `end_time` | Unix epoch, milliseconds |
| `execution_time` | `end_time - start_time`, milliseconds (integer) |

No other keys, no secrets (never log values from `.env`, tokens or passwords; commands are described, not dumped).
Details of an error go to the chat report, not into the log.

## Run directory
- `init-project` creates it at the very start and passes the path to every sub-skill it runs ("log dir: ...").
- A skill started **on its own** (no path given) creates its own: `bash .claude/skills/init-log/init-log.sh start` prints the
  path `logs/init_<unix seconds>`. Keep that path for all later steps of the run.
- If a path was given, never create another directory.

## Recording a step
1. A step is one meaningful action: a command, a file created/changed, a check, a called sub-skill. Not every keystroke.
2. **Command:** wrap it with `run` (runs it, times it, logs it, returns its exit code and passes the output through):
   ```bash
   bash .claude/skills/init-log/init-log.sh run "$LOG_DIR/log_<skill>.log" "docker compose up -d --build" -- docker compose up -d --build
   ```
   Quote the action; everything after `--` is the command. Environment prefixes work as usual (`MSYS_NO_PATHCONV=1 bash ... run ...`).
3. **Not a shell command** (file written with Write/Edit, a sub-skill, a manual check): take `now` before and after, then `add`:
   ```bash
   START=$(bash .claude/skills/init-log/init-log.sh now)      # before the action
   # ... do the action ...
   bash .claude/skills/init-log/init-log.sh add "$LOG_DIR/log_<skill>.log" "create demo/controllers/BaseController.php" "$START" "$(bash .claude/skills/init-log/init-log.sh now)"
   ```
   Each Bash call is a separate shell: capture `START` and call `add` in the same command, or remember the number and pass it
   literally. If the action really happens between two Bash calls, log it with the two `now` values.
4. **Failure:** `run` logs `FAILED: <action>` automatically. For a non-shell step that failed, call `add` with the action text
   `FAILED: ...`. Then stop the skill as its own rules say.
5. A skill that calls another skill logs the call as one step in its own file (`use skill yii-prepare (tmp/yii-skeleton)`) and passes the
   log dir on; the callee logs its inner steps in its own file.

## Checking a run
```bash
ls logs/                                                     # runs, newest = last
cat logs/init_<ts>/log_init-api.log                          # steps of one skill
```
Slowest steps of a run (node is available on the host):
```bash
node -e 'const fs=require("fs"),d=process.argv[1];fs.readdirSync(d).filter(f=>f.endsWith(".log")).forEach(f=>fs.readFileSync(d+"/"+f,"utf8").trim().split("\n").filter(Boolean).forEach(l=>{const o=JSON.parse(l);console.log(o.execution_time+"ms\t"+f+"\t"+o.action)}))' logs/init_<ts> | sort -rn | head
```
A `FAILED:` line is the step where the run stopped; the lines before it show what had succeeded.

## Rules
- Log files are written only under `logs/init_<timestamp>/`; never elsewhere, never edit or delete old logs unless the user asks.
- Keep the exact file names (`log_<skill name>.log`) and the four JSON keys - other tools/people read them.
- Logging must not change the behaviour of the skill: if the log helper fails (e.g. no write access), report it once and
  continue the skill without logging.
