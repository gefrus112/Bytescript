#!/usr/bin/env python3
"""Generate GitHub Release notes from the matching CHANGELOG.md section."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


PLATFORM_LABELS = {
    "windows": "Windows",
    "linux": "Linux",
    "macos": "macOS",
}


def changelog_section(text: str, version: str) -> str:
    plain = version.removeprefix("v")
    heading = re.compile(
        rf"^##[ \t]+\[?v?{re.escape(plain)}\]?(?:[ \t]+.*)?$",
        flags=re.MULTILINE,
    )
    match = heading.search(text)
    if not match:
        raise SystemExit(f"CHANGELOG.md has no section for {version}")

    rest = text[match.end() :]
    next_heading = re.search(r"^##\s+", rest, flags=re.MULTILINE)
    section = rest[: next_heading.start()] if next_heading else rest
    section = section.strip()
    if not section:
        raise SystemExit(f"CHANGELOG.md section for {version} is empty")
    return section


def asset_lines(assets_dir: Path) -> list[str]:
    if not assets_dir.is_dir():
        return []

    assets = sorted(
        p.name
        for p in assets_dir.iterdir()
        if p.is_file() and (p.name.endswith(".zip") or p.name.endswith(".tar.gz"))
    )
    lines: list[str] = []
    for asset in assets:
        label = next(
            (label for key, label in PLATFORM_LABELS.items() if f"-{key}-" in asset),
            "Package",
        )
        lines.append(f"- **{label}:** `{asset}`")
    return lines


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="Release version/tag, e.g. v1.1.0")
    parser.add_argument("--changelog", type=Path, default=Path("CHANGELOG.md"))
    parser.add_argument("--assets-dir", type=Path, default=Path("release-assets"))
    parser.add_argument("--output", type=Path, default=Path("release-notes.md"))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    version = args.version if args.version.startswith("v") else f"v{args.version}"
    section = changelog_section(args.changelog.read_text(encoding="utf-8"), version)
    downloads = asset_lines(args.assets_dir)

    parts = [
        f"Bytescript **{version}** is available with prebuilt packages for Windows, Linux and macOS.",
        "",
        "## Downloads",
        "",
    ]
    parts.extend(downloads or ["- Download the package for your operating system below."])
    parts.extend(
        [
            "- **Checksums:** `SHA256SUMS.txt`",
            "- **Source code:** use the automatic source archives attached by GitHub.",
            "",
            "Extract the archive, keep the executable, shared library and `stdlib/` "
            "directory together, then run `bytescript --version`.",
            "",
            section,
            "",
        ]
    )

    args.output.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
