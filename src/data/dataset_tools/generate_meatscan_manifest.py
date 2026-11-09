"""Generate separate validated MeatScan integration manifest.

Outputs both JSONL and CSV versions containing:
- image_id
- image_path
- source
- original_label
- foodguard_label
- decision_rule_step
- image_width
- image_height
- validation_status
- duplicate_status
- sha256
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
from pathlib import Path
from PIL import Image

logger = logging.getLogger("generate_meatscan_manifest")


def generate_meatscan_manifest(
    image_dir: Path,
    out_jsonl: Path,
    out_csv: Path,
    base_dir: Path,
) -> int:
    out_jsonl.parent.mkdir(parents=True, exist_ok=True)
    out_csv.parent.mkdir(parents=True, exist_ok=True)

    seen_hashes: dict[str, str] = {}
    records: list[dict] = []

    for cat_name in ["Fresh", "Spoiled"]:
        target_dir = image_dir / cat_name
        if not target_dir.exists():
            continue

        orig_label = cat_name
        fg_label = "normal" if orig_label == "Fresh" else "spoilage_indicator"
        step = "3_normal_appearance" if orig_label == "Fresh" else "2_deterioration_no_growth"

        for img_path in sorted(list(target_dir.glob("*.jpg")) + list(target_dir.glob("*.jpeg")) + list(target_dir.glob("*.png"))):
            try:
                rel_path = img_path.relative_to(base_dir).as_posix()
            except ValueError:
                rel_path = str(img_path)

            try:
                with Image.open(img_path) as im:
                    w, h = im.size
                    im.verify()
                val_status = "valid"
            except Exception as exc:
                w, h = 0, 0
                val_status = f"corrupt: {exc}"

            content = img_path.read_bytes()
            sha = hashlib.sha256(content).hexdigest()
            if sha in seen_hashes:
                dup_status = f"duplicate_of_{seen_hashes[sha]}"
            else:
                seen_hashes[sha] = img_path.name
                dup_status = "unique"

            rec = {
                "image_id": f"img_meatscan_{img_path.stem}",
                "image_path": rel_path,
                "source": "MeatScan",
                "original_label": orig_label,
                "foodguard_label": fg_label,
                "decision_rule_step": step,
                "food_category": "cooked_prepared",
                "image_width": w,
                "image_height": h,
                "validation_status": val_status,
                "duplicate_status": dup_status,
                "sha256": sha,
                "license": "CC BY 4.0",
                "split": "unassigned",
            }
            records.append(rec)

    with open(out_jsonl, "w", encoding="utf-8") as fh:
        for r in records:
            fh.write(json.dumps(r) + "\n")

    fieldnames = [
        "image_id",
        "image_path",
        "source",
        "original_label",
        "foodguard_label",
        "decision_rule_step",
        "food_category",
        "image_width",
        "image_height",
        "validation_status",
        "duplicate_status",
        "sha256",
        "license",
        "split",
    ]
    with open(out_csv, "w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} records in {out_jsonl} and {out_csv}")
    return len(records)


if __name__ == "__main__":
    base = Path.cwd()
    fixture = base / "data" / "synthetic" / "meatscan_pilot_fixture" / "MeatScan_Dataset"
    out_jsonl = base / "data" / "manifests" / "food_quality" / "manifest_meatscan_pilot.jsonl"
    out_csv = base / "data" / "manifests" / "food_quality" / "manifest_meatscan_pilot.csv"

    generate_meatscan_manifest(
        image_dir=fixture,
        out_jsonl=out_jsonl,
        out_csv=out_csv,
        base_dir=base,
    )
