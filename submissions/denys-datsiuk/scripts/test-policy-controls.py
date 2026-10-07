"""Regression tests use only self-created synthetic files in temporary repos."""
import os
import pathlib
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "factory/templates/dotnet-project/scripts"

class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.temp.name)
        self.git("init", "-q")
        self.write("scope.allowlist", "src/Component/\ntests/\ndocs/specification.md\ndocs/traceability.md\n")
        self.write(".agent-deny-paths", "**/.env*\nsrc/Component/restricted.txt\n")
        self.write("docs/specification.md", "Synthetic specification\n")
        self.write("docs/traceability.md", "Synthetic traceability\n")
        self.git("add", ".")
        self.git("-c", "user.name=Fixture", "-c", "user.email=fixture@invalid.local", "commit", "-qm", "baseline")
    def tearDown(self):
        self.temp.cleanup()
    def git(self, *args):
        subprocess.run(["git", "-C", str(self.root), *args], check=True, capture_output=True)
    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    def check(self, expected):
        result = subprocess.run(["python3", str(SCRIPTS / "path-policy.py"), "--changes"], cwd=self.root, capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, expected, result.stdout + result.stderr)
    def test_exact_doc_and_allowed_new_file_pass(self):
        self.write("docs/specification.md", "Updated synthetic contract\n")
        self.write("tests/Example.txt", "Synthetic assertion\n")
        self.check(True)
    def test_untracked_environment_denied(self):
        self.write(".env.synthetic", "synthetic fixture, not a secret\n")
        self.check(False)
    def test_staged_environment_denied(self):
        self.write(".env.synthetic", "synthetic fixture\n")
        self.git("add", ".env.synthetic")
        self.check(False)
    def test_exact_path_is_not_prefix(self):
        self.write("docs/specification.md.extra", "outside exact scope\n")
        self.check(False)
    def test_custom_deny_overrides_allowed_directory(self):
        self.write("src/Component/restricted.txt", "denied synthetic content\n")
        self.check(False)
    def test_rename_outside_scope_denied(self):
        self.git("mv", "docs/specification.md", "docs/specification.md.extra")
        self.check(False)
    def test_both_docs_required_for_source(self):
        self.write("src/Component/Example.cs", "// Synthetic fixture\n")
        self.write("docs/specification.md", "updated\n")
        self.check(False)
        self.write("docs/traceability.md", "updated\n")
        self.check(True)
    def test_symlink_denied_before_read(self):
        path = self.root / "tests/link.txt"
        path.parent.mkdir(exist_ok=True)
        path.symlink_to("/does/not/exist")
        self.check(False)
    def test_staging_uses_same_deny_rules(self):
        self.write(".ENV.synthetic", "synthetic denied data\n")
        self.write("src/Component/restricted.txt", "custom denied data\n")
        self.write("tests/allowed.txt", "allowed synthetic data\n")
        with tempfile.TemporaryDirectory() as destination:
            subprocess.run(["python3", str(SCRIPTS / "path-policy.py"), "--stage-root", str(self.root), "--stage-destination", destination, "--deny-file", str(self.root / ".agent-deny-paths")], check=True)
            target = pathlib.Path(destination)
            self.assertFalse((target / ".ENV.synthetic").exists())
            self.assertFalse((target / "src/Component/restricted.txt").exists())
            self.assertFalse((target / ".git").exists())
            self.assertTrue((target / "tests/allowed.txt").exists())

class TestResultTests(unittest.TestCase):
    def test_empty_missing_failed_and_valid_results(self):
        for total, executed, passed, failed, expected in [(0, 0, 0, 0, False), (1, 1, 0, 1, False), (1, 0, 0, 0, False), (2, 2, 2, 0, True)]:
            with self.subTest(total=total, failed=failed), tempfile.TemporaryDirectory() as tmp:
                pathlib.Path(tmp, "result.trx").write_text(f'<TestRun xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010"><ResultSummary outcome="Completed"><Counters total="{total}" executed="{executed}" passed="{passed}" failed="{failed}"/></ResultSummary></TestRun>')
                result = subprocess.run(["python3", str(SCRIPTS / "test-results.py"), tmp], capture_output=True)
                self.assertEqual(result.returncode == 0, expected)
        with tempfile.TemporaryDirectory() as tmp:
            self.assertNotEqual(subprocess.run(["python3", str(SCRIPTS / "test-results.py"), tmp], capture_output=True).returncode, 0)

class PublicTreeTests(unittest.TestCase):
    def test_generated_files_ignored_but_forced_media_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            def git(*args):
                subprocess.run(['git', '-C', tmp, *args], check=True, capture_output=True)
            git('init', '-q')
            policy = root / 'factory/templates/dotnet-project/.agent-deny-paths'
            policy.parent.mkdir(parents=True)
            policy.write_text('**/obj/**\n.env*\n')
            (root / '.gitignore').write_text('obj/\n*.mp4\n')
            git('add', '.')
            (root / 'obj').mkdir()
            (root / 'obj/build.cache').write_text('synthetic build cache')
            def check():
                return subprocess.run(['python3', str(SCRIPTS/'path-policy.py'), '--public-root', tmp], capture_output=True).returncode
            self.assertEqual(check(), 0)
            (root / 'ignored.mp4').write_text('synthetic media marker')
            self.assertEqual(check(), 0)
            git('add', '-f', 'ignored.mp4')
            self.assertNotEqual(check(), 0)

if __name__ == "__main__":
    unittest.main()
