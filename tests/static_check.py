#!/usr/bin/env python3
"""Dependency-free structural checks for the offline TAS site."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_SOURCE_FILES = {
    "README.md",
    "SHA256SUMS",
    "topological-acoustic-stylus-poster.png",
    "topological-acoustic-stylus-slides.pdf",
    "white-paper-83-topological-acoustic-stylus.pdf",
}


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.local_paths: list[str] = []
        self.external_scripts: list[str] = []
        self.inline_handlers: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if attributes.get("id"):
            self.ids.append(attributes["id"] or "")
        for key, value in attrs:
            if key.lower().startswith("on"):
                self.inline_handlers.append(f"{tag}[{key}]")
            if key in {"href", "src"} and value:
                if value.startswith(("https://", "http://", "mailto:", "#", "data:")):
                    if tag == "script" and value.startswith(("http://", "https://")):
                        self.external_scripts.append(value)
                    continue
                self.local_paths.append(value.split("#", 1)[0].split("?", 1)[0])


def require(condition: bool, message: str, failures: list[str]) -> None:
    if not condition:
        failures.append(message)


def main() -> int:
    failures: list[str] = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    parser = SiteParser()
    parser.feed(html)

    duplicate_ids = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
    require(not duplicate_ids, f"duplicate HTML ids: {duplicate_ids}", failures)
    require(not parser.external_scripts, f"external scripts violate offline mode: {parser.external_scripts}", failures)
    require(not parser.inline_handlers, f"inline event handlers found: {parser.inline_handlers}", failures)
    for relative in parser.local_paths:
        require((ROOT / relative).exists(), f"missing local HTML dependency: {relative}", failures)

    script_order = ["js/physics.js", "js/audio.js", "js/app.js"]
    positions = [html.find(f'src="{path}"') for path in script_order]
    require(all(position >= 0 for position in positions), "required scripts are not all linked", failures)
    require(positions == sorted(positions), "script dependency order is incorrect", failures)

    for preset in sorted((ROOT / "presets").glob("*.json")):
        payload = json.loads(preset.read_text(encoding="utf-8"))
        require(payload.get("schemaVersion") == 1, f"{preset.name}: unsupported schema version", failures)
        require(isinstance(payload.get("simulation"), dict), f"{preset.name}: simulation object missing", failures)

    expected_hashes = {}
    source_directory = ROOT / "source"
    published_source_files = {path.name for path in source_directory.iterdir() if path.is_file()}
    require(
        published_source_files == PUBLIC_SOURCE_FILES,
        f"unexpected source publication set: {sorted(published_source_files ^ PUBLIC_SOURCE_FILES)}",
        failures,
    )
    for line in (source_directory / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        digest, filename = line.split(maxsplit=1)
        expected_hashes[filename] = digest
    for filename, expected in expected_hashes.items():
        source_path = source_directory / filename
        require(source_path.exists(), f"source artifact missing: {filename}", failures)
        if source_path.exists():
            actual = hashlib.sha256(source_path.read_bytes()).hexdigest()
            require(actual == expected, f"source hash mismatch: {filename}", failures)
            require(source_path.stat().st_size < 100 * 1024 * 1024, f"GitHub blob too large: {filename}", failures)

    required_safety_phrases = [
        "Not a medical device",
        "Temperature is deliberately shown as **not solved**",
        "Do not use TAS values to build or operate an exposure system"
    ]
    safety_corpus = (ROOT / "README.md").read_text(encoding="utf-8") + (ROOT / "docs" / "SAFETY.md").read_text(encoding="utf-8")
    for phrase in required_safety_phrases:
        require(phrase in safety_corpus, f"required safety boundary missing: {phrase}", failures)

    markdown_link_pattern = re.compile(r"\[[^]]+\]\((?!https?://|mailto:|#)([^)#]+)(?:#[^)]+)?\)")
    for markdown in [ROOT / "README.md", *sorted((ROOT / "docs").glob("*.md"))]:
        text = markdown.read_text(encoding="utf-8")
        for target in markdown_link_pattern.findall(text):
            path = (markdown.parent / target).resolve()
            require(path.exists(), f"{markdown.relative_to(ROOT)}: broken local link {target}", failures)

    if failures:
        print("TAS static checks failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(f"TAS static checks passed: {len(parser.ids)} unique ids, {len(parser.local_paths)} local dependencies, {len(expected_hashes)} verified source artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
