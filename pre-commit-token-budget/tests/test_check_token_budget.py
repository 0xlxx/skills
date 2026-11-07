#!/usr/bin/env python3
"""Regression tests for the pre-commit token-budget hook."""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
HOOK = SKILL_DIR / "scripts" / "check_token_budget.py"
LIMIT_BYTES = 20_000


class TokenBudgetTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp_dir.name)
        self.env = os.environ.copy()
        self.env.update(
            {
                "GIT_CONFIG_GLOBAL": os.devnull,
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_AUTHOR_NAME": "Test",
                "GIT_AUTHOR_EMAIL": "test@example.com",
                "GIT_COMMITTER_NAME": "Test",
                "GIT_COMMITTER_EMAIL": "test@example.com",
            }
        )
        self.git("init", "-q")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def git(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["git", *args],
            cwd=self.repo,
            env=self.env,
            check=True,
            capture_output=True,
            text=True,
        )

    def write(self, relative_path: str, content: bytes) -> Path:
        path = self.repo / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def stage(self, *relative_paths: str) -> None:
        self.git("add", "--", *relative_paths)

    def run_hook(self) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(HOOK)],
            cwd=self.repo,
            env=self.env,
            capture_output=True,
            text=True,
        )

    def test_exactly_5000_tokens_passes(self) -> None:
        self.write("exact.md", b"a" * LIMIT_BYTES)
        self.stage("exact.md")
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_one_byte_over_blocks_and_explains_split(self) -> None:
        self.write("too-big.md", b"a" * (LIMIT_BYTES + 1))
        self.stage("too-big.md")
        result = self.run_hook()
        self.assertEqual(result.returncode, 1)
        self.assertIn("too-big.md", result.stderr)
        self.assertIn("5,001 tokens", result.stderr)
        self.assertIn("How to split:", result.stderr)
        self.assertIn("semantic boundaries", result.stderr)
        self.assertIn("git add", result.stderr)

    def test_only_staged_content_is_measured(self) -> None:
        self.write("small.md", b"small")
        self.write("local-only.md", b"a" * (LIMIT_BYTES + 1))
        self.stage("small.md")
        self.assertEqual(self.run_hook().returncode, 0)

        self.stage("local-only.md")
        self.assertEqual(self.run_hook().returncode, 1)

    def test_index_content_wins_over_worktree_content(self) -> None:
        path = self.write("changed.md", b"a" * (LIMIT_BYTES + 1))
        self.stage("changed.md")
        path.write_bytes(b"small")
        result = self.run_hook()
        self.assertEqual(result.returncode, 1)
        self.assertIn("changed.md", result.stderr)

    def test_lockfiles_and_builtin_codegen_are_ignored(self) -> None:
        self.write("package-lock.json", b"x" * (LIMIT_BYTES + 1))
        self.write("generated/schema.md", b"x" * (LIMIT_BYTES + 1))
        self.write("src/bundle.min.js", b"x" * (LIMIT_BYTES + 1))
        self.stage(
            "package-lock.json", "generated/schema.md", "src/bundle.min.js"
        )
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_project_ignore_file_uses_gitignore_syntax(self) -> None:
        self.write(".token-budget-ignore", b"fixtures/**/*.json\n")
        self.write("fixtures/cases/huge.json", b"x" * (LIMIT_BYTES + 1))
        self.stage("fixtures/cases/huge.json")
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_gitattributes_can_declare_generated_content(self) -> None:
        self.write(".gitattributes", b"schema.ts linguist-generated=true\n")
        self.write("schema.ts", b"x" * (LIMIT_BYTES + 1))
        self.stage(".gitattributes", "schema.ts")
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_binary_content_is_ignored(self) -> None:
        self.write("asset.dat", b"\0" + b"x" * (LIMIT_BYTES + 1))
        self.stage("asset.dat")
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_installer_creates_working_hook_and_is_idempotent(self) -> None:
        result = subprocess.run(
            [sys.executable, str(HOOK), "--install"],
            cwd=self.repo,
            env=self.env,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        hook_path = self.repo / ".git" / "hooks" / "pre-commit"
        checker_path = self.repo / ".agent-hooks" / "pre-commit-token-budget.py"
        self.assertTrue(hook_path.is_file())
        self.assertTrue(os.access(hook_path, os.X_OK))
        self.assertTrue(checker_path.is_file())

        self.write("too-big.md", b"a" * (LIMIT_BYTES + 1))
        self.stage("too-big.md")
        blocked = subprocess.run(
            [str(hook_path)],
            cwd=self.repo,
            env=self.env,
            capture_output=True,
            text=True,
        )
        self.assertEqual(blocked.returncode, 1)
        self.assertIn("too-big.md", blocked.stderr)

        reinstalled = subprocess.run(
            [sys.executable, str(HOOK), "--install"],
            cwd=self.repo,
            env=self.env,
            capture_output=True,
            text=True,
        )
        self.assertEqual(reinstalled.returncode, 0, reinstalled.stderr)

    def test_installer_preserves_an_existing_unmanaged_hook(self) -> None:
        hook_path = self.repo / ".git" / "hooks" / "pre-commit"
        hook_path.parent.mkdir(parents=True, exist_ok=True)
        original = "#!/bin/sh\nprintf 'existing hook\\n'\n"
        hook_path.write_text(original, encoding="utf-8")
        hook_path.chmod(0o755)

        result = subprocess.run(
            [sys.executable, str(HOOK), "--install"],
            cwd=self.repo,
            env=self.env,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(hook_path.read_text(encoding="utf-8"), original)
        self.assertIn("Existing pre-commit hook preserved", result.stderr)
        self.assertIn("|| exit $?", result.stderr)


if __name__ == "__main__":
    unittest.main()
