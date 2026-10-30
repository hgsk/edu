"""Detect stale numbered screenshots and missing explanations without launching a browser."""
import hashlib
import json
from pathlib import Path
from workbook_files import read_workbook


def validate(root: Path) -> list[str]:
    errors = []
    root = root.resolve()
    def same(relative, digest):
        file = (root / relative).resolve()
        if not file.is_relative_to(root) or not file.is_file():
            errors.append(f"Numbered figure dependency missing: {relative}")
        elif hashlib.sha256(file.read_bytes()).hexdigest() != digest:
            errors.append(f"Numbered figure is stale; recapture after changing: {relative}")
    try:
        config_path = root / "scripts/workbook-targets.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        report = json.loads((root / "assets/workbook/targets/captures.json").read_text(encoding="utf-8"))
        workbook = read_workbook(root)
        # Historical figures remain checked against unchanged source data.
        for archive in (root / "docs/legacy-workbook").glob("day*.md"):
            workbook += archive.read_text(encoding="utf-8").replace("](../../assets/", "](../assets/")
        same("scripts/workbook-targets.json", report["config_sha256"])
        if report["status"] != "PASS" or report["cleanup"] != "PASS":
            errors.append("Numbered figure capture or browser cleanup has not passed")
        captured = {item["id"]: item for item in report["figures"]}
        if len({item["id"] for item in config["figures"]}) != len(config["figures"]):
            errors.append("Duplicate numbered figure id in capture plan")
        if set(captured) != {item["id"] for item in config["figures"]}:
            errors.append("Numbered figure coverage differs from capture plan")
        for relative, digest in report["sources"].items():
            same(relative, digest)
        for figure in config["figures"]:
            if not 1 <= len(figure["points"]) <= 3:
                errors.append(f"Numbered figure must have 1-3 targets: {figure['id']}")
                continue
            shot = captured.get(figure["id"])
            if not shot:
                continue
            same(figure["output"], shot["sha256"])
            marker = f"](../{figure['output']})"
            if marker not in workbook:
                errors.append(f"Numbered figure missing from workbook: {figure['id']}")
                continue
            following = workbook.split(marker, 1)[1].split("![", 1)[0][:2000]
            for number in range(len(figure["points"])):
                if "①②③"[number] not in following:
                    errors.append(f"Missing nearby explanation {number+1}: {figure['id']}")
    except (OSError, ValueError, KeyError) as exc:
        errors.append(f"Cannot validate numbered figures: {exc}")
    return errors
