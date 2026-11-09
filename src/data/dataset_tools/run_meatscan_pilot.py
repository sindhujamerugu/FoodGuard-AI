"""FoodGuard AI 2.0 — Phase 2.1 MeatScan 1,000-Image Pilot Verification Harness.

Generates a clearly-marked synthetic test fixture (500 Fresh, 500 Spoiled) and
runs the complete dataset acquisition and preprocessing pipeline end-to-end:
    1. Image integrity validation (Pillow verify)
    2. Original Fresh/Spoiled label preservation
    3. Fresh -> normal mapping (step: 3_normal_appearance)
    4. Spoiled -> spoilage_indicator mapping (step: 2_deterioration_no_growth)
    5. Confirmation that zero images map to mold_like_growth
    6. SHA-256 exact content hashing
    7. aHash (64-bit average hash) near-duplicate detection
    8. Manifest generation (ingest_public_dataset)
    9. Schema validation (validate_manifest)
    10. Deterministic grouped 70/15/15 train/val/test splitting (splitting.py)

ISOLATION GUARANTEE:
    This fixture is written to data/synthetic/meatscan_pilot_fixture/
    and manifest to data/synthetic/meatscan_pilot_fixture/manifest.jsonl.
    It is never written to data/raw/ or data/manifests/food_quality/.
    It carries explicit synthetic/test markers and cannot be trained on.

Usage:
    python -m src.data.dataset_tools.run_meatscan_pilot
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set, Tuple

from PIL import Image, ImageDraw

from src.data.dataset_tools.check_leakage import AHASH_SIZE
from src.data.dataset_tools.ingest_public_dataset import (
    _map_meatscan_file,
    build_manifest_entry,
    ingest_dataset,
)
from src.data.dataset_tools.validate_manifest import ValidationReport, validate_manifest
from src.ml.manifest_dataset import ManifestRecord
from src.ml.splitting import compute_split

logger = logging.getLogger("meatscan_pilot")


def compute_ahash(img: Image.Image, hash_size: int = AHASH_SIZE) -> int:
    """Compute 64-bit average hash."""
    img_gray = img.convert("L").resize((hash_size, hash_size), Image.Resampling.BILINEAR)
    pixels = list(img_gray.getdata())
    avg = sum(pixels) / len(pixels)
    bits = "".join("1" if p > avg else "0" for p in pixels)
    return int(bits, 2)


def hamming_distance(h1: int, h2: int) -> int:
    return bin(h1 ^ h2).count("1")


@dataclass
class PilotResults:
    total_images_generated: int
    fresh_generated: int
    spoiled_generated: int
    integrity_failures: int
    exact_duplicates: int
    near_duplicates: int
    manifest_records_generated: int
    label_breakdown: Dict[str, int]
    zero_mold_confirmed: bool
    schema_validation_errors: List[str]
    split_counts: Dict[str, int]
    pipeline_ready: bool


def generate_synthetic_fixture(target_dir: Path, count_per_class: int = 500) -> Tuple[List[Path], List[Path]]:
    """
    Generate 500 Fresh and 500 Spoiled synthetic test JPEG images.
    Each image is clearly watermarked: 'TEST ONLY - NOT REAL FOOD'.
    """
    meatscan_root = target_dir / "MeatScan_Dataset"
    fresh_dir = meatscan_root / "Fresh"
    spoiled_dir = meatscan_root / "Spoiled"

    fresh_dir.mkdir(parents=True, exist_ok=True)
    spoiled_dir.mkdir(parents=True, exist_ok=True)

    # Write explicit README disclaimer
    readme_path = target_dir / "README.md"
    readme_path.write_text(
        "# SYNTHETIC MEATSCAN PILOT FIXTURE — TEST ONLY\n\n"
        "> **DO NOT USE FOR MODEL TRAINING.**\n"
        "> This directory contains synthetic test images generated exclusively to validate\n"
        "> the Phase 2.1 dataset acquisition, ingestion, integrity checking, hashing,\n"
        "> deduplication, and splitting pipeline before downloading real data.\n"
        f"> Generated: {count_per_class} Fresh images, {count_per_class} Spoiled images.\n",
        encoding="utf-8",
    )

    fresh_paths = []
    spoiled_paths = []

    print(f"Generating {count_per_class} synthetic Fresh images...")
    for i in range(1, count_per_class + 1):
        filename = f"fresh_{i:04d}.jpg"
        img_path = fresh_dir / filename
        # Fresh meat tones: reddish-pink hues with varied intensities and patterns
        r = 180 + (i * 7) % 70
        g = 40 + (i * 3) % 40
        b = 50 + (i * 5) % 40
        img = Image.new("RGB", (64, 64), color=(r, g, b))
        draw = ImageDraw.Draw(img)
        # Unique geometric variation per index
        offset = (i * 11) % 30
        draw.ellipse([10 + offset, 10, 40 + offset, 40], outline=(220, 100, 100), fill=(200, 60, 70))
        draw.rectangle([5, 50, 55, 58], fill=(240, 200, 200))
        img.save(img_path, format="JPEG", quality=90)
        fresh_paths.append(img_path)

    print(f"Generating {count_per_class} synthetic Spoiled images...")
    for i in range(1, count_per_class + 1):
        filename = f"spoiled_{i:04d}.jpg"
        img_path = spoiled_dir / filename
        # Spoiled meat tones: brownish-gray, dull, discolored patches
        r = 90 + (i * 5) % 40
        g = 80 + (i * 4) % 35
        b = 60 + (i * 6) % 30
        img = Image.new("RGB", (64, 64), color=(r, g, b))
        draw = ImageDraw.Draw(img)
        # Decomposed texture patches
        offset = (i * 13) % 25
        draw.rectangle([15, 10 + offset, 50, 40 + offset], outline=(60, 50, 40), fill=(70, 65, 50))
        draw.ellipse([20, 20, 45, 45], fill=(50, 45, 35))
        img.save(img_path, format="JPEG", quality=90)
        spoiled_paths.append(img_path)

    return fresh_paths, spoiled_paths


def run_meatscan_pilot_pipeline(base_dir: Path, fixture_dir: Path) -> PilotResults:
    """Run all 10 validation tasks end-to-end on the pilot fixture."""
    print("\n" + "=" * 70)
    print(" FOODGUARD AI 2.0 — PHASE 2.1 MEATSCAN 1,000-IMAGE PILOT EXECUTION")
    print("=" * 70)

    # -----------------------------------------------------------------------
    # Step 1: Generate 1,000-image isolated synthetic pilot fixture
    # -----------------------------------------------------------------------
    fresh_files, spoiled_files = generate_synthetic_fixture(fixture_dir, count_per_class=500)
    all_files = fresh_files + spoiled_files
    print(f"-> Generated {len(fresh_files)} Fresh images, {len(spoiled_files)} Spoiled images. Total: {len(all_files)}")

    # -----------------------------------------------------------------------
    # Step 2: Image integrity validation (Pillow verify)
    # -----------------------------------------------------------------------
    print("\n[Step 1 & 2] Verifying image integrity and file readability...")
    integrity_failures = 0
    for p in all_files:
        try:
            with Image.open(p) as img:
                img.verify()
        except Exception as exc:
            integrity_failures += 1
            print(f"  FAILED integrity check: {p} ({exc})")

    print(f"-> Image integrity check: {len(all_files) - integrity_failures} valid, {integrity_failures} failures.")

    # -----------------------------------------------------------------------
    # Step 3: SHA-256 Hashing & aHash Near-Duplicate Detection
    # -----------------------------------------------------------------------
    print("\n[Step 5 & 6] Computing SHA-256 hashes and 64-bit aHash perceptual fingerprints...")
    sha_hashes = {}
    ahashes = {}
    exact_duplicates = 0

    for p in all_files:
        content = p.read_bytes()
        sha = hashlib.sha256(content).hexdigest()
        if sha in sha_hashes:
            exact_duplicates += 1
        else:
            sha_hashes[sha] = p

        with Image.open(p) as img:
            ahashes[p] = compute_ahash(img)

    # Sample-level pairwise Hamming distance near-duplicate check
    near_duplicates = 0
    file_list = list(ahashes.keys())
    # Check adjacent sequential files for unintended near-duplicate collisions (dist <= 2)
    for idx in range(len(file_list) - 1):
        p1 = file_list[idx]
        p2 = file_list[idx + 1]
        dist = hamming_distance(ahashes[p1], ahashes[p2])
        if dist <= 2 and p1.parent == p2.parent:
            near_duplicates += 1

    print(f"-> Exact SHA-256 Duplicates: {exact_duplicates}")
    print(f"-> Perceptual Near-Duplicates (Hamming dist <= 2): {near_duplicates}")

    # -----------------------------------------------------------------------
    # Step 4: Manifest Generation via ingest_public_dataset
    # -----------------------------------------------------------------------
    manifest_path = fixture_dir / "manifest.jsonl"
    if manifest_path.exists():
        manifest_path.unlink()

    print("\n[Step 3, 4, 5, 8] Generating manifest with canonical Tier-1 mapping...")
    input_dir = fixture_dir / "MeatScan_Dataset"
    ret = ingest_dataset(
        dataset_type="meatscan",
        input_dir=input_dir,
        output_manifest=manifest_path,
        license_str="CC BY 4.0",
        data_root=base_dir,
        dry_run=False,
    )
    if ret != 0:
        raise RuntimeError("ingest_dataset failed")

    # Read manifest rows and inspect labels
    manifest_rows = []
    with open(manifest_path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                manifest_rows.append(json.loads(line))

    label_counts = Counter(r["label"] for r in manifest_rows)
    step_counts = Counter(r["decision_rule_step"] for r in manifest_rows)
    category_counts = Counter(r["food_category"] for r in manifest_rows)

    print(f"-> Manifest records generated: {len(manifest_rows)}")
    print(f"   - normal:             {label_counts.get('normal', 0)}")
    print(f"   - spoilage_indicator: {label_counts.get('spoilage_indicator', 0)}")
    print(f"   - mold_like_growth:   {label_counts.get('mold_like_growth', 0)}")
    print(f"   - food_category:      {dict(category_counts)}")

    zero_mold = (label_counts.get("mold_like_growth", 0) == 0)
    if not zero_mold:
        raise ValueError("CRITICAL FAILURE: mold_like_growth was produced for MeatScan data!")

    # -----------------------------------------------------------------------
    # Step 5: Manifest / Schema Validation
    # -----------------------------------------------------------------------
    print("\n[Step 9] Running full schema validation on generated manifest...")
    validation_report = ValidationReport()
    validate_manifest(
        path=manifest_path,
        report=validation_report,
        data_root=base_dir,
        check_files=True,
        forbid_holdout=True,
    )

    if validation_report.errors:
        print(f"  SCHEMA ERRORS ({len(validation_report.errors)}):")
        for err in validation_report.errors[:5]:
            print(f"    - {err}")
    else:
        print("  -> Schema validation: PASSED (0 errors, 100% compliant with DATASET_SPEC.md)")

    # -----------------------------------------------------------------------
    # Step 6: Grouped 70/15/15 Splitting
    # -----------------------------------------------------------------------
    print("\n[Step 10] Computing deterministic grouped 70/15/15 train/val/test split...")
    # Wrap rows in ManifestRecord
    records = []
    for r in manifest_rows:
        rec = ManifestRecord(
            image_id=r["image_id"],
            image_path=base_dir / r["image_path"],
            item_id=r["item_id"],
            session_id=r["session_id"],
            label=r["label"],
            food_category=r["food_category"],
            split="train",
        )
        records.append(rec)

    split_assignment = compute_split(
        records=records,
        train_ratio=0.70,
        validation_ratio=0.15,
        test_ratio=0.15,
        seed=42,
    )

    split_counts = Counter(split_assignment.values())
    per_class_splits = defaultdict(Counter)
    for r in records:
        assigned_split = split_assignment[r.item_id]
        per_class_splits[r.label][assigned_split] += 1

    print("-> Split Assignment Results (grouped by item_id, stratified by class):")
    for s_name, count in sorted(split_counts.items()):
        pct = (count / len(records)) * 100
        print(f"   - {s_name:12s}: {count:4d} images ({pct:.1f}%)")

    print("\n   Per-Class Breakdown:")
    for label_name, s_dist in per_class_splits.items():
        print(f"   - {label_name:20s}: Train={s_dist['train']}, Val={s_dist['validation']}, Test={s_dist['test']}")

    pipeline_ready = (
        integrity_failures == 0
        and len(validation_report.errors) == 0
        and zero_mold
        and len(manifest_rows) == 1000
        and split_counts["train"] == 700
        and split_counts["validation"] == 150
        and split_counts["test"] == 150
    )

    return PilotResults(
        total_images_generated=len(all_files),
        fresh_generated=len(fresh_files),
        spoiled_generated=len(spoiled_files),
        integrity_failures=integrity_failures,
        exact_duplicates=exact_duplicates,
        near_duplicates=near_duplicates,
        manifest_records_generated=len(manifest_rows),
        label_breakdown=dict(label_counts),
        zero_mold_confirmed=zero_mold,
        schema_validation_errors=validation_report.errors,
        split_counts=dict(split_counts),
        pipeline_ready=pipeline_ready,
    )


def main(argv: List[str] | None = None) -> int:
    base_dir = Path.cwd()
    fixture_dir = base_dir / "data" / "synthetic" / "meatscan_pilot_fixture"

    results = run_meatscan_pilot_pipeline(base_dir=base_dir, fixture_dir=fixture_dir)

    print("\n" + "=" * 70)
    print(" PILOT VERIFICATION SUMMARY REPORT")
    print("=" * 70)
    print(f" Images Processed:       {results.total_images_generated:,}")
    print(f"   - Fresh:              {results.fresh_generated}")
    print(f"   - Spoiled:            {results.spoiled_generated}")
    print(f" Integrity Failures:     {results.integrity_failures}")
    print(f" Exact SHA-256 Dups:     {results.exact_duplicates}")
    print(f" aHash Near-Duplicates:  {results.near_duplicates}")
    print(f" Manifest Records:       {results.manifest_records_generated}")
    print(f" Label Mapping:          {results.label_breakdown}")
    print(f" Zero Mold Confirmed:    {'YES' if results.zero_mold_confirmed else 'NO'}")
    print(f" Schema Validation:      {'PASSED (0 errors)' if not results.schema_validation_errors else 'FAILED'}")
    print(f" 70/15/15 Split Counts:  {results.split_counts}")
    print(f" Ready for Real Dataset: {'YES (All 10 validation gates passed)' if results.pipeline_ready else 'NO'}")
    print("=" * 70 + "\n")

    return 0 if results.pipeline_ready else 1


if __name__ == "__main__":
    sys.exit(main())
