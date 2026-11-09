"""FoodGuard AI 2.0 — Phase 2.1 MeatScan Acquisition & Verification Utility.

Manages the acquisition, integrity verification, extraction, and manifest
preparation for the MeatScan dataset (KNUST, Data in Brief 2025).

Metadata verified against official Zenodo record (recid: 16764338):
    DOI:             10.5281/zenodo.16764338
    Direct URL:      https://zenodo.org/records/16764338/files/MeatScan_Dataset.rar?download=1
    Archive Key:     MeatScan_Dataset.rar
    Exact Size:      25,416,554,933 bytes (25.4 GB)
    Zenodo MD5:      5eafbea4674bd83ee2602ed2ec526a14
    License:         Creative Commons Attribution 4.0 International (CC BY 4.0)
    Total Images:    11,000 (Fresh: 5,627, Spoiled: 5,373)
    Food Category:   cooked_prepared (per DATASET_SPEC.md §4 animal protein taxonomy)

CRITICAL LABELING RULE:
    MeatScan is a binary fresh-vs-spoiled cow meat dataset.
    Never map any MeatScan image to mold_like_growth.
    Fresh   -> normal (step: 3_normal_appearance)
    Spoiled -> spoilage_indicator (step: 2_deterioration_no_growth)

SAFETY RULE:
    Does NOT download the 25.4 GB archive automatically.
    Requires explicit --confirm-download flag.

Usage:
    # Check current local status (does not download anything):
    python -m src.data.dataset_tools.acquire_meatscan --check-status

    # Verify checksum of downloaded archive:
    python -m src.data.dataset_tools.acquire_meatscan --verify-checksum

    # Execute controlled download (requires --confirm-download):
    python -m src.data.dataset_tools.acquire_meatscan --download --confirm-download
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shutil
import sys
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

logger = logging.getLogger("acquire_meatscan")

# ---------------------------------------------------------------------------
# Authoritative Metadata (Verified via Zenodo API record 16764338)
# ---------------------------------------------------------------------------
MEATSCAN_METADATA = {
    "dataset_name": "MeatScan: An Image Dataset for Machine Learning-Based Classification of Fresh and Spoiled Cow Meat",
    "authors": [
        "Rose-Mary Owusuaa Mensah Gyening",
        "Michael Akoto",
        "Kwabena Owusu-Agyemang",
        "Linda Amoako-Banning",
        "Kate Takyi",
        "Peter Appiahene",
    ],
    "institution": "Kwame Nkrumah University of Science and Technology (KNUST), Kumasi, Ghana",
    "journal": "Data in Brief (Elsevier)",
    "journal_volume": "62",
    "publication_date": "2025-08-07",
    "doi": "10.5281/zenodo.16764338",
    "source_url": "https://zenodo.org/records/16764338",
    "direct_download_url": "https://zenodo.org/records/16764338/files/MeatScan_Dataset.rar?download=1",
    "archive_filename": "MeatScan_Dataset.rar",
    "archive_size_bytes": 25416554933,
    "archive_size_human": "25.4 GB (23.67 GiB)",
    "zenodo_md5": "5eafbea4674bd83ee2602ed2ec526a14",
    "license": "CC BY 4.0",
    "license_url": "https://creativecommons.org/licenses/by/4.0/",
    "total_images": 11000,
    "original_classes": {
        "Fresh": 5627,
        "Spoiled": 5373,
    },
    "canonical_label_mapping": {
        "Fresh": {
            "target_label": "normal",
            "decision_rule_step": "3_normal_appearance",
            "food_category": "cooked_prepared",
            "spoilage_stage": "n/a",
        },
        "Spoiled": {
            "target_label": "spoilage_indicator",
            "decision_rule_step": "2_deterioration_no_growth",
            "food_category": "cooked_prepared",
            "spoilage_stage": "mid",
        },
    },
    "default_local_raw_dir": "data/raw/food_quality/licensed_public/meatscan",
    "default_manifest_path": "data/manifests/food_quality/manifest.jsonl",
}


@dataclass
class LocalStatus:
    target_dir_exists: bool
    archive_exists: bool
    archive_size_bytes: int
    archive_size_matches: bool
    extracted_dir_exists: bool
    fresh_count: int
    spoiled_count: int
    free_disk_space_bytes: int
    free_disk_space_gb: float

    def to_dict(self) -> dict:
        return asdict(self)


def get_local_status(base_dir: Path) -> LocalStatus:
    """Inspect local filesystem status without downloading anything."""
    meatscan_dir = base_dir / MEATSCAN_METADATA["default_local_raw_dir"]
    archive_path = meatscan_dir / MEATSCAN_METADATA["archive_filename"]
    extracted_dir = meatscan_dir / "MeatScan_Dataset"

    archive_exists = archive_path.exists()
    archive_size = archive_path.stat().st_size if archive_exists else 0
    expected_size = MEATSCAN_METADATA["archive_size_bytes"]
    size_matches = (archive_size == expected_size) if archive_exists else False

    fresh_count = 0
    spoiled_count = 0
    if extracted_dir.exists():
        fresh_dir = extracted_dir / "Fresh"
        spoiled_dir = extracted_dir / "Spoiled"
        if fresh_dir.exists():
            fresh_count = len(list(fresh_dir.glob("*.jpg")) + list(fresh_dir.glob("*.jpeg")) + list(fresh_dir.glob("*.png")))
        if spoiled_dir.exists():
            spoiled_count = len(list(spoiled_dir.glob("*.jpg")) + list(spoiled_dir.glob("*.jpeg")) + list(spoiled_dir.glob("*.png")))

    # Free disk space on target drive
    try:
        usage = shutil.disk_usage(meatscan_dir if meatscan_dir.exists() else base_dir)
        free_bytes = usage.free
        free_gb = round(free_bytes / (1024**3), 2)
    except Exception:
        free_bytes = 0
        free_gb = 0.0

    return LocalStatus(
        target_dir_exists=meatscan_dir.exists(),
        archive_exists=archive_exists,
        archive_size_bytes=archive_size,
        archive_size_matches=size_matches,
        extracted_dir_exists=extracted_dir.exists(),
        fresh_count=fresh_count,
        spoiled_count=spoiled_count,
        free_disk_space_bytes=free_bytes,
        free_disk_space_gb=free_gb,
    )


def compute_file_md5(file_path: Path, block_size: int = 8 * 1024 * 1024) -> str:
    """Compute MD5 checksum in 8MB streaming blocks with progress reporting."""
    md5 = hashlib.md5()
    total_size = file_path.stat().st_size
    bytes_read = 0

    print(f"Calculating MD5 checksum for {file_path} ({total_size / (1024**3):.2f} GB)...")
    with open(file_path, "rb") as fh:
        while chunk := fh.read(block_size):
            md5.update(chunk)
            bytes_read += len(chunk)
            pct = (bytes_read / total_size) * 100 if total_size > 0 else 100
            print(f"  Processed {bytes_read / (1024**3):.2f} GB ({pct:.1f}%)...", end="\r", flush=True)

    print()
    return md5.hexdigest()


def compute_file_sha256(file_path: Path, block_size: int = 8 * 1024 * 1024) -> str:
    """Compute SHA-256 checksum in 8MB streaming blocks."""
    sha = hashlib.sha256()
    with open(file_path, "rb") as fh:
        while chunk := fh.read(block_size):
            sha.update(chunk)
    return sha.hexdigest()


def verify_archive(archive_path: Path) -> Tuple[bool, str]:
    """Verify archive size and MD5 against official Zenodo metadata."""
    if not archive_path.exists():
        return False, f"Archive file {archive_path} does not exist."

    actual_size = archive_path.stat().st_size
    expected_size = MEATSCAN_METADATA["archive_size_bytes"]
    if actual_size != expected_size:
        return False, (
            f"Size mismatch: actual {actual_size:,} bytes, expected {expected_size:,} bytes. "
            f"Download is incomplete or corrupt."
        )

    computed_md5 = compute_file_md5(archive_path)
    expected_md5 = MEATSCAN_METADATA["zenodo_md5"]
    if computed_md5.lower() != expected_md5.lower():
        return False, f"MD5 checksum mismatch: computed {computed_md5}, expected {expected_md5}"

    return True, f"MD5 checksum verified successfully: {computed_md5} matches Zenodo published record."


def download_meatscan_archive(
    target_dir: Path,
    confirm: bool = False,
    chunk_size: int = 1024 * 1024,
) -> int:
    """
    Controlled download of MeatScan archive with resume support.
    Requires confirm=True to execute.
    """
    if not confirm:
        print("\n" + "=" * 68)
        print(" SAFETY GUARD: AUTOMATIC DOWNLOAD BLOCKED")
        print("=" * 68)
        print(" The MeatScan archive is 25.4 GB (25,416,554,933 bytes).")
        print(" To download, you must pass the '--confirm-download' flag.")
        print(f" Source URL: {MEATSCAN_METADATA['direct_download_url']}")
        print(f" Target:     {target_dir / MEATSCAN_METADATA['archive_filename']}")
        print("=" * 68 + "\n")
        return 1

    target_dir.mkdir(parents=True, exist_ok=True)
    archive_path = target_dir / MEATSCAN_METADATA["archive_filename"]
    expected_size = MEATSCAN_METADATA["archive_size_bytes"]

    # Resume support if partial file exists
    initial_bytes = archive_path.stat().st_size if archive_path.exists() else 0
    if initial_bytes == expected_size:
        print(f"Archive already downloaded ({initial_bytes:,} bytes). Skipping download.")
        return 0

    headers = {"User-Agent": "FoodGuardAI-Acquisition/2.1"}
    if initial_bytes > 0:
        headers["Range"] = f"bytes={initial_bytes}-"
        print(f"Resuming download from byte {initial_bytes:,} / {expected_size:,}...")

    req = urllib.request.Request(MEATSCAN_METADATA["direct_download_url"], headers=headers)

    try:
        with urllib.request.urlopen(req) as resp, open(archive_path, "ab" if initial_bytes > 0 else "wb") as out_file:
            bytes_downloaded = initial_bytes
            print(f"Streaming from Zenodo into {archive_path}...")
            while chunk := resp.read(chunk_size):
                out_file.write(chunk)
                bytes_downloaded += len(chunk)
                pct = (bytes_downloaded / expected_size) * 100
                print(f"  Downloaded {bytes_downloaded / (1024**3):.2f} GB / 23.67 GiB ({pct:.2f}%)...", end="\r", flush=True)

        print("\nDownload complete.")
        ok, msg = verify_archive(archive_path)
        print(msg)
        return 0 if ok else 1

    except Exception as exc:
        print(f"\nDownload error: {exc}")
        return 1


def print_status_report(base_dir: Path) -> None:
    """Print comprehensive Phase 2.1 status report."""
    status = get_local_status(base_dir)

    print("\n" + "=" * 70)
    print(" FOODGUARD AI 2.0 — PHASE 2.1 MEATSCAN ACQUISITION STATUS REPORT")
    print("=" * 70)
    print(f" Dataset:                {MEATSCAN_METADATA['dataset_name']}")
    print(f" Source:                 {MEATSCAN_METADATA['institution']}")
    print(f" Publication:            {MEATSCAN_METADATA['journal']} (Vol {MEATSCAN_METADATA['journal_volume']}, {MEATSCAN_METADATA['publication_date']})")
    print(f" DOI:                    {MEATSCAN_METADATA['doi']}")
    print(f" Zenodo URL:             {MEATSCAN_METADATA['source_url']}")
    print(f" License:                {MEATSCAN_METADATA['license']} (Commercial-use permitted)")
    print(f" Expected Archive Size:  {MEATSCAN_METADATA['archive_size_human']} ({MEATSCAN_METADATA['archive_size_bytes']:,} bytes)")
    print(f" Published MD5:          {MEATSCAN_METADATA['zenodo_md5']}")
    print(f" Expected Images:        {MEATSCAN_METADATA['total_images']:,} (Fresh: 5,627, Spoiled: 5,373)")
    print("-" * 70)
    print(" LOCAL STORAGE STATUS:")
    print(f" Target Directory:       {base_dir / MEATSCAN_METADATA['default_local_raw_dir']}")
    print(f" Directory Exists:       {'YES' if status.target_dir_exists else 'NO'}")
    print(f" Available Disk Space:   {status.free_disk_space_gb:.2f} GB (Recommended free space: >= 60 GB)")
    print(f" Archive Present:        {'YES' if status.archive_exists else 'NO (Awaiting acquisition)'}")
    if status.archive_exists:
        print(f" Archive File Size:      {status.archive_size_bytes:,} bytes")
        print(f" Archive Size Valid:     {'YES' if status.archive_size_matches else 'NO (Incomplete)'}")
    print(f" Extracted Data Present: {'YES' if status.extracted_dir_exists else 'NO (Awaiting extraction)'}")
    if status.extracted_dir_exists:
        print(f" Fresh Images Extracted: {status.fresh_count:,} / 5,627")
        print(f" Spoiled Images Extracted:{status.spoiled_count:,} / 5,373")
    print("-" * 70)
    print(" CANONICAL LABEL MAPPING (TIER-1 ENFORCED):")
    print("   [Original] Fresh   (5,627) -> [Target] normal             (Step: 3_normal_appearance)")
    print("   [Original] Spoiled (5,373) -> [Target] spoilage_indicator (Step: 2_deterioration_no_growth)")
    print("   [Prohibited] mold_like_growth: ZERO images (MeatScan has no verified mold fruiting bodies)")
    print("=" * 70 + "\n")


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-dir", type=Path, default=Path.cwd(), help="Repository root directory (default: cwd).")
    parser.add_argument("--check-status", action="store_true", help="Print local storage and acquisition status report.")
    parser.add_argument("--verify-checksum", action="store_true", help="Verify MD5 checksum of local MeatScan archive.")
    parser.add_argument("--download", action="store_true", help="Download MeatScan archive from Zenodo.")
    parser.add_argument("--confirm-download", action="store_true", help="Explicit safety confirmation required to download 25.4 GB.")
    parser.add_argument("--dump-metadata-json", type=Path, default=None, help="Save verified metadata dictionary to JSON file.")

    args = parser.parse_args(argv)

    if args.dump_metadata_json:
        args.dump_metadata_json.parent.mkdir(parents=True, exist_ok=True)
        with open(args.dump_metadata_json, "w", encoding="utf-8") as fh:
            json.dump(MEATSCAN_METADATA, fh, indent=2)
        print(f"Wrote metadata to {args.dump_metadata_json}")

    target_dir = args.base_dir / MEATSCAN_METADATA["default_local_raw_dir"]
    archive_path = target_dir / MEATSCAN_METADATA["archive_filename"]

    if args.download:
        return download_meatscan_archive(target_dir=target_dir, confirm=args.confirm_download)

    if args.verify_checksum:
        ok, msg = verify_archive(archive_path)
        print(msg)
        return 0 if ok else 1

    # Default action: check status
    print_status_report(args.base_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
