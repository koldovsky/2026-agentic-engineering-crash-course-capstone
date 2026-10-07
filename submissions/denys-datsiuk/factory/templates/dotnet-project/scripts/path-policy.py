"""Filename-first checks; denied contents are never inspected."""
import argparse
import fnmatch
import os
import pathlib
import re
import subprocess

SENSITIVE = re.compile(r"(^|/)(\.env[^/]*|appsettings[^/]*\.json|secrets?\.json|[^/]*\.(pfx|p12|pem|key|bak|dump|sql|log)|production-data|exports|backups|user-secrets)(/|$)", re.I)

def stop(message):
    raise SystemExit("STOP: " + message)

def rules(path):
    if not path.is_file() or path.is_symlink():
        stop("missing or unsafe policy file")
    entries = [s.strip() for s in path.read_text().splitlines() if s.strip() and not s.lstrip().startswith("#")]
    if not entries:
        stop("empty policy file")
    return entries

def denied(name, patterns):
    if SENSITIVE.search(name):
        return True
    for entry in patterns:
        variants = [entry, entry[3:]] if entry.startswith("**/") else [entry]
        if any(fnmatch.fnmatchcase(name.lower(), p.lower()) or name.lower() == p.lower().removesuffix("/**") for p in variants):
            return True
    return False

def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args])

def check_changes():
    root = pathlib.Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    allowed = rules(root / os.environ.get("AGENT_SCOPE_FILE", "scope.allowlist"))
    forbidden = rules(root / os.environ.get("AGENT_DENY_FILE", ".agent-deny-paths"))
    paths = set()
    for args in [("diff", "--no-renames", "--name-only", "-z"), ("diff", "--cached", "--no-renames", "--name-only", "-z"), ("ls-files", "--others", "--exclude-standard", "-z")]:
        paths.update(p.decode() for p in git(root, *args).split(b"\0") if p)
    if not paths:
        stop("no changed files to evaluate")
    for name in sorted(paths):
        if denied(name, forbidden):
            stop("denied path changed or untracked: " + name)
        if not any(name == e or (e.endswith("/") and name.startswith(e)) for e in allowed):
            stop("out-of-scope change: " + name)
        if (root / name).is_symlink():
            stop("symlink changes are not permitted")
    additions = []
    for args in [("diff",), ("diff", "--cached")]:
        diff = git(root, *args, "--no-ext-diff", "--no-textconv", "--unified=0", "--", *sorted(paths)).decode(errors="replace")
        additions.extend(s[1:] for s in diff.splitlines() if s.startswith("+") and not s.startswith("+++"))
    for raw in git(root, "ls-files", "--others", "--exclude-standard", "-z").split(b"\0"):
        if not raw:
            continue
        path = root / raw.decode()
        if path.stat().st_size > 2_000_000:
            stop("untracked file too large for content review")
        additions.append(path.read_text(errors="replace"))
    if re.search(r"(password|api[_-]?key|client[_-]?secret|connectionstring)\s*[:=]\s*[^$<{\s]", "\n".join(additions), re.I):
        stop("possible secret in added content")
    if any(re.match(r"src/.*\.(cs|csproj|fs|fsproj)$", p) for p in paths) and not {"docs/specification.md", "docs/traceability.md"}.issubset(paths):
        stop("source change requires both specification and traceability updates")
    print("Agent policy checks passed.")

def check_public(root):
    root = root.resolve()
    forbidden = rules(root / "factory/templates/dotnet-project/.agent-deny-paths")
    try:
        repo = pathlib.Path(subprocess.check_output(["git", "-C", str(root), "rev-parse", "--show-toplevel"], stderr=subprocess.DEVNULL, text=True).strip()).resolve()
        prefix = str(root.relative_to(repo))
        candidates = set()
        for args in [("ls-files", "--cached", "-z"), ("ls-files", "--others", "--exclude-standard", "-z")]:
            candidates.update(repo / raw.decode() for raw in git(repo, *args, "--", prefix).split(b"\0") if raw)
    except subprocess.CalledProcessError:
        candidates = set()
        for current, directories, files in os.walk(root, followlinks=False):
            for name in list(directories):
                path = pathlib.Path(current) / name
                if path.is_symlink():
                    stop("symlink in public package")
                if name in {".git", "bin", "obj", "TestResults", "__pycache__", ".dotnet-home"}:
                    directories.remove(name)
            candidates.update(pathlib.Path(current) / name for name in files)
    for path in candidates:
        name = path.relative_to(root).as_posix()
        if path.is_file() and (name.startswith("video/") or path.name.lower() in {"voiceover.md", "video_script.md", "recording_guide.md"}):
            stop("recording source in public package")
        if path.is_symlink():
            stop("symlink in public package")
        if path.is_file() and (denied(name, forbidden) or path.suffix.lower() in {".mp4", ".mov", ".m4a", ".wav", ".mp3", ".webm"}):
            stop("forbidden public artifact: " + name)
        if path.is_file() and path.suffix.lower() == ".cs" and not name.startswith("factory/fixtures/dotnet-sample/"):
            stop("source outside synthetic fixture")
    print("Public artifact path checks passed.")
    return [path for path in candidates if path.is_file()]

def scan_public(paths, domain_pattern):
    domain = re.compile(domain_pattern, re.I)
    secret = re.compile(r"Password\s*=|ApiKey\s*=|Bearer\s+[A-Za-z0-9._-]+|Host=.*;.*Database=|BEGIN (RSA |OPENSSH )?PRIVATE KEY")
    for path in paths:
        if path.name in {"verify-package.sh", "path-policy.py"} or path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".pdf"}:
            continue
        if path.stat().st_size > 2_000_000:
            stop("text artifact exceeds review size limit")
        text = path.read_text(errors="replace")
        if domain.search(text):
            stop("private domain marker in " + str(path.relative_to(path.parents[0])))
        if secret.search(text):
            stop("potential secret in " + path.name)  # Never print matched content.
    print("Public text scan passed.")

def stage(root, destination, deny_file):
    import shutil
    forbidden = rules(deny_file)
    for current, directories, files in os.walk(root, followlinks=False):
        relative = pathlib.Path(current).relative_to(root)
        for name in list(directories):
            path = pathlib.Path(current) / name
            candidate = (relative / name).as_posix()
            if name in {".git", "bin", "obj", "TestResults"} or denied(candidate, forbidden):
                directories.remove(name)
            elif path.is_symlink():
                stop("symlink in sandbox source")
        for name in files:
            path = pathlib.Path(current) / name
            candidate = (relative / name).as_posix()
            if denied(candidate, forbidden):
                continue  # Filter filenames before any file content is copied.
            if path.is_symlink():
                stop("symlink in sandbox source")
            target = destination / relative / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--changes", action="store_true")
    parser.add_argument("--public-root", type=pathlib.Path)
    parser.add_argument("--content-scan")
    parser.add_argument("--stage-root", type=pathlib.Path)
    parser.add_argument("--stage-destination", type=pathlib.Path)
    parser.add_argument("--deny-file", type=pathlib.Path)
    args = parser.parse_args()
    if args.changes:
        check_changes()
    elif args.public_root:
        paths = check_public(args.public_root)
        if args.content_scan:
            scan_public(paths, args.content_scan)
    elif args.stage_root and args.stage_destination and args.deny_file:
        stage(args.stage_root, args.stage_destination, args.deny_file)
    else:
        parser.error("choose --changes or --public-root")
