#!/usr/bin/env python3
"""Reject staged files above a 5,000-token budget (bytes / 4)."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

LIMIT_TOKENS = 5_000
BYTES_PER_TOKEN = 4
LIMIT_BYTES = LIMIT_TOKENS * BYTES_PER_TOKEN
IGNORE_FILE = ".token-budget-ignore"
HOOK_SOURCE = ".agent-hooks/pre-commit-token-budget.py"
HOOK_MARKER = "managed by pre-commit-token-budget"

DEFAULT_IGNORES = """\
# Lockfiles and package-manager state
package-lock.json
npm-shrinkwrap.json
pnpm-lock.yaml
yarn.lock
bun.lock
bun.lockb
deno.lock
Cargo.lock
poetry.lock
uv.lock
Pipfile.lock
composer.lock
Gemfile.lock
go.sum
mix.lock
pubspec.lock
Podfile.lock
Package.resolved
gradle.lockfile
flake.lock
*.lock

# Generated, vendored, and build output
generated/
gen/
vendor/
third_party/
node_modules/
dist/
build/
out/
coverage/
.next/
.nuxt/
.svelte-kit/
__pycache__/
*.min.js
*.min.css
*.map
*.generated.*
*.gen.*
*_pb2.py
*_pb2.pyi
*.pb.go
*.pb.cc
*.pb.h
*.g.dart
*.freezed.dart
*.designer.cs
*.Designer.cs
*.snap
"""


class GitError(RuntimeError):
    pass


def run_git(
    root: Path,
    *args: str,
    input_bytes: bytes | None = None,
    check: bool = True,
) -> subprocess.CompletedProcess[bytes]:
    proc = subprocess.run(
        ["git", "-C", str(root), *args],
        input=input_bytes,
        capture_output=True,
    )
    if check and proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", "replace").strip()
        raise GitError(f"git {' '.join(args)} failed: {detail}")
    return proc


def find_repo_root() -> Path:
    proc = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
    )
    if proc.returncode != 0:
        raise GitError("not inside a Git work tree")
    return Path(os.fsdecode(proc.stdout.rstrip(b"\n"))).resolve()


def staged_entries(root: Path) -> list[tuple[str, str, str]]:
    changed = run_git(
        root, "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"
    ).stdout
    staged = {os.fsdecode(path) for path in changed.split(b"\0") if path}
    if not staged:
        return []

    index = run_git(root, "ls-files", "--stage", "-z").stdout
    entries: list[tuple[str, str, str]] = []
    for record in index.split(b"\0"):
        if not record:
            continue
        metadata, raw_path = record.split(b"\t", 1)
        mode, oid, stage_number = metadata.decode("ascii").split()
        path = os.fsdecode(raw_path)
        if path in staged and stage_number == "0":
            entries.append((path, mode, oid))
    return entries


def object_sizes(root: Path, oids: set[str]) -> dict[str, int]:
    if not oids:
        return {}
    payload = ("\n".join(sorted(oids)) + "\n").encode("ascii")
    proc = run_git(
        root,
        "cat-file",
        "--batch-check=%(objectname) %(objecttype) %(objectsize)",
        input_bytes=payload,
    )
    sizes: dict[str, int] = {}
    for line in proc.stdout.decode("ascii").splitlines():
        fields = line.split()
        if len(fields) == 3 and fields[1] == "blob":
            sizes[fields[0]] = int(fields[2])
    return sizes


def write_excludes(root: Path) -> str:
    custom = root / IGNORE_FILE
    handle = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        prefix="pre-commit-token-budget-",
        suffix=".gitignore",
        delete=False,
    )
    try:
        handle.write(DEFAULT_IGNORES)
        if custom.is_file():
            handle.write("\n# Project-specific rules from .token-budget-ignore\n")
            handle.write(custom.read_text(encoding="utf-8", errors="replace"))
            handle.write("\n")
    finally:
        handle.close()
    return handle.name


def is_ignored(root: Path, path: str, excludes_path: str) -> bool:
    proc = run_git(
        root,
        "-c",
        f"core.excludesFile={excludes_path}",
        "check-ignore",
        "--no-index",
        "-q",
        "--",
        path,
        check=False,
    )
    if proc.returncode not in (0, 1):
        detail = proc.stderr.decode("utf-8", "replace").strip()
        raise GitError(f"git check-ignore failed for {path!r}: {detail}")
    return proc.returncode == 0


def is_declared_non_agent(root: Path, path: str) -> bool:
    proc = run_git(
        root,
        "check-attr",
        "--cached",
        "-z",
        "linguist-generated",
        "linguist-vendored",
        "diff",
        "binary",
        "--",
        path,
    )
    fields = proc.stdout.split(b"\0")
    for index in range(0, len(fields) - 2, 3):
        attribute = fields[index + 1].decode("ascii", "replace")
        value = fields[index + 2].decode("utf-8", "replace")
        if attribute in {"linguist-generated", "linguist-vendored", "binary"}:
            if value in {"set", "true"}:
                return True
        if attribute == "diff" and value == "unset":
            return True
    return False


def is_binary(root: Path, oid: str) -> bool:
    proc = subprocess.Popen(
        ["git", "-C", str(root), "cat-file", "blob", oid],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    assert proc.stdout is not None
    sample = proc.stdout.read(8192)
    proc.kill()
    proc.wait()
    return b"\0" in sample


def token_count(byte_count: int) -> int:
    return (byte_count + BYTES_PER_TOKEN - 1) // BYTES_PER_TOKEN


def format_failure(violations: list[tuple[str, int]]) -> str:
    lines = [
        (
            f"pre-commit token budget exceeded: "
            f"limit {LIMIT_TOKENS:,} tokens ({LIMIT_BYTES:,} bytes)"
        ),
        "",
        f"{len(violations)} staged file(s) over budget:",
    ]
    for path, byte_count in violations:
        tokens = token_count(byte_count)
        lines.append(
            f"  {path}  {byte_count:,} bytes  "
            f"≈ {tokens:,} tokens  (+{tokens - LIMIT_TOKENS:,})"
        )

    lines.extend(
        [
            "",
            "How to split:",
            "  1. Split at semantic boundaries: one responsibility, topic, or API",
            "     per file. Do not cut the content into arbitrary equal byte chunks.",
            "  2. Keep the original path as a short entry point. Move detail into",
            "     sibling files named by role (for example advanced.md, reference.md,",
            "     errors.md), then update every link and index that pointed here.",
            "  3. Check every resulting file is <= 20,000 bytes, then re-stage all",
            "     of them with git add and run git commit again.",
            "",
            "Example:",
            "  docs/guide.md  24,312 bytes  (over budget)",
            "  -> docs/guide.md             3,200 bytes  (overview + links)",
            "  -> docs/guide/advanced.md   12,000 bytes",
            "  -> docs/guide/reference.md   9,112 bytes",
            "",
            "If a file is a lockfile, codegen, vendored, or binary: do not split it;",
            "  - add its path/glob to .token-budget-ignore (gitignore syntax), or",
            "  - mark it in .gitattributes, e.g. `path linguist-generated=true`.",
            "Ignored: built-in lock/codegen/vendor paths, binaries, .token-budget-ignore",
            "matches, and linguist-generated/linguist-vendored files.",
        ]
    )
    return "\n".join(lines)


def check(root: Path) -> int:
    entries = staged_entries(root)
    if not entries:
        return 0

    sizes = object_sizes(root, {oid for _, _, oid in entries})
    excludes_path = write_excludes(root)
    violations: list[tuple[str, int]] = []
    try:
        for path, mode, oid in entries:
            if mode in {"120000", "160000"}:
                continue
            byte_count = sizes.get(oid, 0)
            if byte_count <= LIMIT_BYTES:
                continue
            if is_declared_non_agent(root, path):
                continue
            if is_ignored(root, path, excludes_path):
                continue
            if is_binary(root, oid):
                continue
            violations.append((path, byte_count))
    finally:
        os.unlink(excludes_path)

    if not violations:
        return 0
    violations.sort(key=lambda item: (-item[1], item[0]))
    print(format_failure(violations), file=sys.stderr)
    return 1


def install(root: Path) -> int:
    source = Path(__file__).resolve()
    target = root / HOOK_SOURCE
    target.parent.mkdir(parents=True, exist_ok=True)
    if source != target.resolve():
        shutil.copy2(source, target)

    hooks_path = run_git(
        root, "rev-parse", "--path-format=absolute", "--git-path", "hooks"
    ).stdout
    hooks_dir = Path(os.fsdecode(hooks_path.rstrip(b"\n")))
    hooks_dir.mkdir(parents=True, exist_ok=True)
    hook_path = hooks_dir / "pre-commit"

    if hook_path.exists():
        existing = hook_path.read_text(encoding="utf-8", errors="replace")
        if HOOK_MARKER not in existing:
            print(
                f"Existing pre-commit hook preserved: {hook_path}\n"
                "Add this line after its shebang, before other checks:\n\n"
                '  python3 "$(git rev-parse --show-toplevel)/'
                '.agent-hooks/pre-commit-token-budget.py" || exit $?\n',
                file=sys.stderr,
            )
            return 2

    hook_path.write_text(
        "#!/bin/sh\n"
        f"# {HOOK_MARKER}. Re-run the installer to update.\n"
        'exec python3 "$(git rev-parse --show-toplevel)/'
        '.agent-hooks/pre-commit-token-budget.py" "$@"\n',
        encoding="utf-8",
    )
    hook_path.chmod(0o755)
    print(f"Installed pre-commit hook: {hook_path}")
    print(f"Checker: {target}")
    print(f"Next: git add {HOOK_SOURCE}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Reject staged agent-authored files over 5,000 estimated tokens "
            "(bytes / 4)."
        )
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="install the checker and pre-commit shim in the current repository",
    )
    args = parser.parse_args()

    try:
        root = find_repo_root()
        return install(root) if args.install else check(root)
    except GitError as error:
        print(f"pre-commit token budget: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
