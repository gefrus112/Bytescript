#!/usr/bin/env python3
"""Build one Bytescript release archive from an already-built dist/ tree.

The same script runs locally and in GitHub Actions. It deliberately does
not compile anything: callers first run ``make release`` (or
``mingw32-make release`` on Windows) and the project test suite.
"""

from __future__ import annotations

import argparse
import hashlib
import platform
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from pathlib import Path


ARCH_ALIASES = {
    "amd64": "x86_64",
    "x64": "x86_64",
    "x86_64": "x86_64",
    "aarch64": "arm64",
    "arm64": "arm64",
}

CORE_FILES = {
    "windows": ("bytescript.exe", "bytescript.dll", "bytescript.lib"),
    "linux": ("bytescript", "libbytescript.so"),
    "macos": ("bytescript", "libbytescript.dylib"),
}

MODULE_EXTENSIONS = {
    "windows": ".dll",
    "linux": ".so",
    "macos": ".dylib",
}


def detected_platform() -> str:
    if sys.platform.startswith("win"):
        return "windows"
    if sys.platform == "darwin":
        return "macos"
    if sys.platform.startswith("linux"):
        return "linux"
    raise SystemExit(f"Unsupported release platform: {sys.platform}")


def detected_arch() -> str:
    machine = platform.machine().strip().lower()
    try:
        return ARCH_ALIASES[machine]
    except KeyError as exc:
        raise SystemExit(f"Unsupported release architecture: {machine}") from exc


def normalize_arch(value: str) -> str:
    try:
        return ARCH_ALIASES[value.strip().lower()]
    except KeyError as exc:
        raise SystemExit(f"Unsupported release architecture: {value}") from exc


def expected_source_version(source_root: Path) -> str | None:
    header = source_root / "src" / "bytescript.h"
    if not header.exists():
        return None
    match = re.search(
        r'#define\s+BYTESCRIPT_VERSION\s+"([^"]+)"', header.read_text(encoding="utf-8")
    )
    return match.group(1) if match else None


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"Release packaging failed: {message}")


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def validate_dist(dist: Path, platform_name: str) -> None:
    require(dist.is_dir(), f"dist directory does not exist: {dist}")
    for filename in CORE_FILES[platform_name]:
        require((dist / filename).is_file(), f"missing {dist / filename}")

    for filename in ("bytescript.h", "bytev.h", "platform.h"):
        require((dist / filename).is_file(), f"missing public header {dist / filename}")

    stdlib = dist / "stdlib"
    require(stdlib.is_dir(), f"missing standard library directory: {stdlib}")
    extension = MODULE_EXTENSIONS[platform_name]
    modules = sorted(stdlib.glob(f"*{extension}"))
    maps = sorted(stdlib.glob("*.bs"))
    require(bool(modules), f"no native stdlib modules ({extension}) in {stdlib}")
    require(bool(maps), f"no stdlib map files (.bs) in {stdlib}")


def stage_package(
    *,
    source_root: Path,
    dist: Path,
    package_dir: Path,
    version: str,
    platform_name: str,
    arch: str,
    commit: str,
) -> None:
    # Copy the runtime exactly as built: the stdlib must remain next to the
    # executable or in ./stdlib below it.
    shutil.copytree(dist, package_dir)

    for filename in ("LICENSE", "README.md", "CHANGELOG.md"):
        source = source_root / filename
        if source.is_file():
            copy_file(source, package_dir / filename)

    exemples = source_root / "exemples"
    if exemples.is_dir():
        for source in sorted(exemples.rglob("*.bs")):
            copy_file(source, package_dir / "exemples" / source.relative_to(exemples))

    info = [
        f"Bytescript {version}",
        f"Platform: {platform_name} ({arch})",
        f"Commit: {commit or 'unknown'}",
        "",
        "Keep the executable, shared library and stdlib/ directory together.",
        "Run bytescript --version to verify the installation.",
        "Try the bundled programs with bytescript exemples/hello.bs.",
        "",
    ]
    (package_dir / "RELEASE-INFO.txt").write_text("\n".join(info), encoding="utf-8")


def create_archive(package_dir: Path, archive_path: Path) -> None:
    root_name = package_dir.name
    if archive_path.suffix == ".zip":
        with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for path in sorted(p for p in package_dir.rglob("*") if p.is_file()):
                archive.write(path, Path(root_name) / path.relative_to(package_dir))
    else:
        with tarfile.open(archive_path, "w:gz", compresslevel=9) as archive:
            archive.add(package_dir, arcname=root_name)


def extract_archive(archive_path: Path, destination: Path) -> None:
    if archive_path.suffix == ".zip":
        with zipfile.ZipFile(archive_path) as archive:
            archive.extractall(destination)
    else:
        with tarfile.open(archive_path, "r:gz") as archive:
            # Archives are created by this script immediately above; the
            # data filter is still used on Python versions supporting it.
            try:
                archive.extractall(destination, filter="data")
            except TypeError:
                archive.extractall(destination)


def smoke_test(archive_path: Path, package_name: str, platform_name: str, version: str) -> None:
    with tempfile.TemporaryDirectory(prefix="bytescript-release-smoke-") as temp:
        temp_path = Path(temp)
        extract_archive(archive_path, temp_path)
        package_dir = temp_path / package_name
        executable = package_dir / ("bytescript.exe" if platform_name == "windows" else "bytescript")
        require(executable.is_file(), f"extracted archive is missing {executable.name}")

        work_dir = temp_path / "elsewhere"
        work_dir.mkdir()

        def run(*args: str) -> str:
            result = subprocess.run(
                [str(executable), *args],
                cwd=work_dir,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                timeout=20,
                check=False,
            )
            require(
                result.returncode == 0,
                f"smoke command failed ({' '.join(args)}): {result.stdout.strip()}",
            )
            return result.stdout

        version_output = run("--version").strip()
        require(
            version_output == f"Bytescript {version.removeprefix('v')}",
            f"version mismatch: binary says {version_output!r}, expected {version!r}",
        )
        require(run("-e", "print(6 * 7)").strip().startswith("42"), "-e smoke test failed")
        hello = package_dir / "exemples" / "hello.bs"
        require(hello.is_file(), "extracted archive is missing exemples/hello.bs")
        require("Hello, World!" in run(str(hello)), "hello.bs smoke test failed")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="Release version/tag, e.g. v1.1.0")
    parser.add_argument("--platform", choices=tuple(CORE_FILES), help="Defaults to the host OS")
    parser.add_argument("--arch", help="Defaults to the host architecture")
    parser.add_argument("--dist", type=Path, default=Path("dist"))
    parser.add_argument("--source-root", type=Path, default=Path("."))
    parser.add_argument("--output", type=Path, default=Path("release-assets"))
    parser.add_argument("--commit", default="")
    parser.add_argument("--smoke-test", action="store_true", help="Extract and run the packaged binary")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    version = args.version if args.version.startswith("v") else f"v{args.version}"
    plain_version = version.removeprefix("v")
    require(
        re.fullmatch(r"v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", version) is not None,
        f"version must look like v1.2.3 (got {args.version!r})",
    )

    source_root = args.source_root.resolve()
    dist = args.dist if args.dist.is_absolute() else source_root / args.dist
    output = args.output if args.output.is_absolute() else source_root / args.output
    platform_name = args.platform or detected_platform()
    arch = normalize_arch(args.arch) if args.arch else detected_arch()

    source_version = expected_source_version(source_root)
    if source_version is not None:
        require(
            source_version == plain_version,
            f"src/bytescript.h says {source_version}, but packaging requested {version}",
        )

    validate_dist(dist, platform_name)
    output.mkdir(parents=True, exist_ok=True)

    package_name = f"bytescript-{version}-{platform_name}-{arch}"
    archive_extension = ".zip" if platform_name == "windows" else ".tar.gz"
    archive_path = output / f"{package_name}{archive_extension}"
    if archive_path.exists():
        archive_path.unlink()

    with tempfile.TemporaryDirectory(prefix="bytescript-release-stage-") as temp:
        package_dir = Path(temp) / package_name
        stage_package(
            source_root=source_root,
            dist=dist,
            package_dir=package_dir,
            version=version,
            platform_name=platform_name,
            arch=arch,
            commit=args.commit,
        )
        create_archive(package_dir, archive_path)

    if args.smoke_test:
        smoke_test(archive_path, package_name, platform_name, version)

    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    print(f"Created {archive_path}")
    print(f"SHA-256 {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
