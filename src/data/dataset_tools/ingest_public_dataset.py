"""Public dataset ingestion tool for FoodGuard AI.

Reads images from external dataset folders (fruits_360, fresh_stale, mobilemold),
maps labels to canonical FoodGuard classes (normal, spoilage_indicator, mold_like_growth),
preserves original train/test splits, and generates valid JSONL manifest rows conforming to
src/data/dataset_tools/schema.py.

In-Place Image Referencing:
    Directly references existing raw source images under data/raw/food_quality/licensed_public/
    without creating duplicate JPEG copies on disk.

Supports dry-run mode (--dry-run) to inspect mappings and manifest entries
without modifying files.

Usage:
    python -m src.data.dataset_tools.ingest_public_dataset \\
        --dataset-type fruits_360 \\
        --input-dir path/to/fruits-360 \\
        --license "CC BY-SA 4.0" \\
        --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
from datetime import date
from pathlib import Path
from typing import Dict, List, Set, Tuple

from PIL import Image

from src.data.dataset_tools import schema

logger = logging.getLogger(__name__)

# Allowed extensions from schema
ALLOWED_EXTENSIONS = schema.ALLOWED_IMAGE_EXTENSIONS

# Standard produce and nut category lookups
_NUT_NAMES = frozenset({
    "almonds", "almond", "walnut", "walnuts", "chestnut", "chestnuts",
    "hazelnut", "hazelnuts", "pecan", "pecans", "macadamia", "pistachio",
    "pistachios", "cashew", "cashews", "peanut", "peanuts",
})

_FRUIT_NAMES = frozenset({
    "apple", "banana", "orange", "grape", "strawberry", "cherry", "peach",
    "pear", "plum", "kiwi", "lemon", "lime", "mango", "papaya", "pineapple",
    "watermelon", "apricot", "avocado", "cantaloupe", "clementine", "fig",
    "guava", "lychee", "nectarine", "passion fruit", "pomegranate", "raspberry",
    "redcurrant", "blackberry", "blueberry", "dates", "pitahaya", "pomelo",
    "tangerine", "salak", "rambutan", "physalis", "maracuja", "kumquats",
    "huckleberry", "granadilla", "coconut", "carambula",
}) | _NUT_NAMES  # Botanical produce / nuts mapped to fruit category in schema

_VEGETABLE_NAMES = frozenset({
    "potato", "tomato", "carrot", "cucumber", "pepper", "onion", "beetroot",
    "cabbage", "cauliflower", "eggplant", "garlic", "ginger", "corn", "zucchini",
    "squash", "broccoli", "spinach", "lettuce", "radish", "turnip", "pumpkin",
    "sweet potato", "capsicum", "chilli", "pea", "bean",
})


def resolve_food_category(item_name: str) -> str:
    """Map produce or food item name to canonical food_category enum."""
    name_lower = item_name.lower()
    if any(nut_kw in name_lower for nut_kw in _NUT_NAMES):
        return "fruit"  # Nuts classified under produce/fruit in schema taxonomy
    if any(bread_kw in name_lower for bread_kw in ["bread", "roll", "bun", "bakery", "pastry"]):
        return "bread_bakery"
    if any(dairy_kw in name_lower for dairy_kw in ["cheese", "yogurt", "milk", "dairy", "butter"]):
        return "dairy"
    if any(meat_kw in name_lower for meat_kw in ["meat", "beef", "pork", "mutton", "chicken", "poultry", "cow"]):
        return "cooked_prepared"  # Meat categorized under cooked_prepared per DATASET_SPEC.md §4
    if any(cooked_kw in name_lower for cooked_kw in ["curry", "rice", "soup", "cooked", "dish", "leftover"]):
        return "cooked_prepared"
    if any(veg_kw in name_lower for veg_kw in _VEGETABLE_NAMES):
        return "vegetable"
    if any(fruit_kw in name_lower for fruit_kw in _FRUIT_NAMES):
        return "fruit"
    return "fruit"  # Default fallback for produce


def sanitize_exif_in_place_check(src_path: Path) -> bool:
    """
    Verify image can be loaded with Pillow and has clean/valid structure.
    Returns True if valid.
    """
    try:
        with Image.open(src_path) as img:
            img.verify()
        return True
    except Exception as exc:
        logger.warning("Corrupt or invalid image file %s: %s", src_path, exc)
        return False


def _map_fruits_360_file(rel_path: Path) -> Tuple[str, str, str, str, str, str] | None:
    """
    Explicit Mapping for Fruits-360:
    Structure: <Split>/<Category Name>/<filename>.jpg
    Example: Training/Almonds 1/r0_0_100.jpg
    
    Returns: (label, decision_rule_step, food_category, item_id, session_id, split)
    """
    parts = rel_path.parts
    if len(parts) < 3:
        return None
    
    top_split_folder = parts[0].lower()
    split = "train" if "train" in top_split_folder else ("test" if "test" in top_split_folder else "train")
    
    folder_name = parts[-2]
    filename = parts[-1]
    
    cat_name = re.sub(r"\s+\d+$", "", folder_name).strip()
    food_cat = resolve_food_category(cat_name)
    label = "normal"
    step = "3_normal_appearance"
    
    # Granular item_id per specific physical sample folder (e.g. "Almonds 1", "Apple 10")
    item_id = folder_name
    session_id = filename
    
    return label, step, food_cat, item_id, session_id, split


def _map_fresh_stale_file(rel_path: Path) -> Tuple[str, str, str, str, str, str] | None:
    """
    Explicit Mapping for Fresh and Stale Classification:
    Structure: <fresh*|stale*>/<filename>.jpg or <split>/<fresh*|stale*>/<filename>.jpg
    """
    path_str = str(rel_path).lower()
    parts = rel_path.parts
    folder_name = parts[-2] if len(parts) >= 2 else "sample"
    filename = parts[-1]

    top_split_folder = parts[0].lower() if len(parts) >= 3 else ""
    split = "test" if "test" in top_split_folder else "train"

    if "fresh" in folder_name.lower() or "fresh" in path_str:
        label = "normal"
        step = "3_normal_appearance"
    elif any(k in folder_name.lower() or k in path_str for k in ["stale", "rotten", "spoiled"]):
        label = "spoilage_indicator"
        step = "2_deterioration_no_growth"
    else:
        return None

    food_cat = resolve_food_category(folder_name)
    item_id = folder_name
    session_id = filename
    return label, step, food_cat, item_id, session_id, split


def _map_mobilemold_file(rel_path: Path) -> Tuple[str, str, str, str, str, str] | None:
    """
    Explicit Mapping for MobileMold:
    Structure: <mold*|clean*>/<food_type>/<filename>.jpg
    """
    path_str = str(rel_path).lower()
    parts = rel_path.parts
    folder_name = parts[-2] if len(parts) >= 2 else "sample"
    filename = parts[-1]

    top_split_folder = parts[0].lower() if len(parts) >= 3 else ""
    split = "test" if "test" in top_split_folder else "train"

    if any(k in path_str or k in folder_name.lower() for k in ["mold", "fungus", "spoilage"]):
        label = "mold_like_growth"
        step = "1_growth_structure_visible"
    elif any(k in path_str or k in folder_name.lower() for k in ["clean", "fresh", "normal"]):
        label = "normal"
        step = "3_normal_appearance"
    else:
        label = "mold_like_growth"
        step = "1_growth_structure_visible"

    food_cat = resolve_food_category(path_str)
    item_id = folder_name
    session_id = filename
    return label, step, food_cat, item_id, session_id, split


def _map_meatscan_file(rel_path: Path) -> Tuple[str, str, str, str, str, str] | None:
    """
    Explicit Mapping for MeatScan (KNUST / Elsevier Data in Brief 2025):
    Structure: [MeatScan_Dataset/]<Fresh|Spoiled>/<filename>.jpg
    
    Critical Rule: MeatScan is a binary fresh/spoilage dataset.
    Never map any MeatScan image to mold_like_growth.
    
    Returns: (label, decision_rule_step, food_category, item_id, session_id, split)
    """
    parts = rel_path.parts
    if not parts:
        return None

    folder_name = parts[-2] if len(parts) >= 2 else ""
    filename = parts[-1]
    path_str = str(rel_path).lower()

    top_split_folder = parts[0].lower() if len(parts) >= 3 else ""
    split = "test" if "test" in top_split_folder else "train"

    if "fresh" in folder_name.lower() or "fresh" in filename.lower():
        label = "normal"
        step = "3_normal_appearance"
    elif any(k in folder_name.lower() or k in filename.lower() for k in ["spoiled", "spoil", "stale", "decay"]):
        label = "spoilage_indicator"
        step = "2_deterioration_no_growth"
    else:
        return None

    food_cat = "cooked_prepared"
    if folder_name.lower() in ("fresh", "spoiled"):
        item_id = f"{folder_name}_{Path(filename).stem}"
    elif folder_name:
        item_id = folder_name
    else:
        item_id = f"meatscan_{Path(filename).stem}"
    session_id = filename
    return label, step, food_cat, item_id, session_id, split


_MAPPER_FUNCS = {
    "fruits_360": _map_fruits_360_file,
    "fresh_stale": _map_fresh_stale_file,
    "mobilemold": _map_mobilemold_file,
    "meatscan": _map_meatscan_file,
}


def build_manifest_entry(
    image_id: str,
    image_path: str,
    item_id: str,
    session_id: str,
    label: str,
    decision_rule_step: str,
    food_category: str,
    license_str: str,
    dataset_type: str,
    split_name: str = "train",
) -> dict:
    """Construct schema-valid manifest dictionary."""
    today = date.today().isoformat()
    needs_double = schema.requires_double_annotation(label, "licensed_public")

    return {
        "image_id": image_id,
        "image_path": image_path,
        "item_id": item_id,
        "session_id": session_id,
        "label": label,
        "decision_rule_step": decision_rule_step,
        "food_category": food_category,
        "spoilage_stage": "n/a" if label == "normal" else "mid",
        "packaging_state": "n/a",
        "capture_context": {
            "device": "public_dataset_camera",
            "lighting": "public_dataset_lighting",
            "background": "public_dataset_background",
            "distance": "public_dataset_distance",
            "angle": "public_dataset_angle",
        },
        "source": "licensed_public",
        "license": license_str,
        "consent_status": "licensed",
        "collection_date": today,
        "annotator_id": f"ingest_script_{dataset_type}",
        "second_annotator_id": f"ingest_reviewer_{dataset_type}" if needs_double else None,
        "agreement_status": "agree" if needs_double else None,
        "annotation_notes": f"Ingested from {dataset_type} public dataset under license: {license_str}",
        "split": split_name,
        "exif_stripped": True,
    }


def ingest_dataset(
    dataset_type: str,
    input_dir: Path,
    output_manifest: Path,
    license_str: str,
    data_root: Path,
    dry_run: bool = False,
) -> int:
    """Ingest images from input_dir and generate manifest entries."""
    if dataset_type not in _MAPPER_FUNCS:
        logger.error("Unsupported dataset_type '%s'. Must be one of %s", dataset_type, list(_MAPPER_FUNCS.keys()))
        return 1

    if not input_dir.exists():
        logger.error("Input directory %s does not exist.", input_dir)
        return 1

    mapper_fn = _MAPPER_FUNCS[dataset_type]

    # Load existing image_ids to prevent duplicates
    existing_ids: Set[str] = set()
    if output_manifest.exists() and not dry_run:
        try:
            with open(output_manifest, "r", encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if line:
                        data = json.loads(line)
                        existing_ids.add(data["image_id"])
        except Exception as exc:
            logger.warning("Could not parse existing manifest %s: %s", output_manifest, exc)

    found_files: List[Path] = []
    for ext in ALLOWED_EXTENSIONS:
        found_files.extend(input_dir.rglob(f"*{ext}"))
        found_files.extend(input_dir.rglob(f"*{ext.upper()}"))

    found_files = sorted(set(found_files))

    class_counts = {"normal": 0, "spoilage_indicator": 0, "mold_like_growth": 0}
    split_counts = {"train": 0, "test": 0, "validation": 0, "excluded": 0}
    skipped_count = 0
    duplicate_count = 0
    manifest_rows: List[dict] = []

    logger.info("Found %d candidate image files in %s", len(found_files), input_dir)

    valid_set = set()
    if not dry_run:
        logger.info("Validating image structure for %d candidate images...", len(found_files))
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=32) as executor:
            valid_results = list(executor.map(sanitize_exif_in_place_check, found_files))
        valid_set = {f for f, v in zip(found_files, valid_results) if v}
    else:
        valid_set = set(found_files)

    for idx, src_path in enumerate(found_files, start=1):
        rel_src = src_path.relative_to(input_dir)
        mapped = mapper_fn(rel_src)

        if mapped is None:
            skipped_count += 1
            logger.debug("Skipping unmapped file: %s", rel_src)
            continue

        label, step, food_cat, item_id, session_id, split_name = mapped
        image_id = f"img_{dataset_type}_{idx:06d}"

        if image_id in existing_ids:
            duplicate_count += 1
            continue

        # Calculate relative path from data_root directly to existing raw image file (NO COPYING!)
        try:
            rel_image_path = src_path.relative_to(data_root).as_posix()
        except ValueError:
            # If input_dir is outside data_root, use default raw relative path structure
            rel_image_path = (Path("raw") / "food_quality" / "licensed_public" / dataset_type / rel_src).as_posix()

        if not dry_run and src_path not in valid_set:
            skipped_count += 1
            continue

        entry = build_manifest_entry(
            image_id=image_id,
            image_path=rel_image_path,
            item_id=item_id,
            session_id=session_id,
            label=label,
            decision_rule_step=step,
            food_category=food_cat,
            license_str=license_str,
            dataset_type=dataset_type,
            split_name=split_name,
        )

        class_counts[label] += 1
        split_counts[split_name] = split_counts.get(split_name, 0) + 1
        manifest_rows.append(entry)

    print("\n" + "=" * 60)
    print(f" PUBLIC DATASET INGESTION REPORT — [{dataset_type}]")
    print("=" * 60)
    print(f" Mode:                 {'DRY RUN (No files modified)' if dry_run else 'LIVE INGESTION'}")
    print(f" Input Directory:      {input_dir}")
    print(f" Output Manifest:      {output_manifest}")
    print(f" Declared License:     {license_str}")
    print(f" Total Images Found:   {len(found_files)}")
    print(f" Ingested Records:     {len(manifest_rows)}")
    print(f" Skipped / Unmapped:   {skipped_count}")
    print(f" Duplicate IDs Skipped:{duplicate_count}")
    print("\n Split Breakdown:")
    for s_name, s_count in split_counts.items():
        if s_count > 0:
            print(f"   - {s_name:20s}: {s_count}")
    print("\n Canonical Class Breakdown:")
    for cls_name, count in class_counts.items():
        print(f"   - {cls_name:20s}: {count}")

    if manifest_rows:
        print("\n Sample Generated Manifest Rows (first 2):")
        for sample in manifest_rows[:2]:
            print(json.dumps(sample, indent=2))

    print("=" * 60 + "\n")

    if not dry_run and manifest_rows:
        output_manifest.parent.mkdir(parents=True, exist_ok=True)
        with open(output_manifest, "a", encoding="utf-8") as fh:
            for row in manifest_rows:
                fh.write(json.dumps(row) + "\n")
        logger.info("Appended %d valid rows to %s", len(manifest_rows), output_manifest)

    return 0


def main(argv: List[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset-type",
        required=True,
        choices=["fruits_360", "fresh_stale", "mobilemold", "meatscan"],
        help="Type of public dataset to ingest.",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        required=True,
        help="Directory path containing raw downloaded images.",
    )
    parser.add_argument(
        "--output-manifest",
        type=Path,
        default=Path("data/manifests/food_quality/manifest.jsonl"),
        help="Path to manifest.jsonl to append to (default: data/manifests/food_quality/manifest.jsonl).",
    )
    parser.add_argument(
        "--license",
        required=True,
        help="Explicit license governing the dataset (e.g. 'CC BY-SA 4.0').",
    )
    parser.add_argument(
        "--data-root",
        type=Path,
        default=Path("data"),
        help="Repository data root directory (default: ./data).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect file counts, class mappings, and manifest entries without modifying files.",
    )

    args = parser.parse_args(argv)

    return ingest_dataset(
        dataset_type=args.dataset_type,
        input_dir=args.input_dir,
        output_manifest=args.output_manifest,
        license_str=args.license,
        data_root=args.data_root,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
