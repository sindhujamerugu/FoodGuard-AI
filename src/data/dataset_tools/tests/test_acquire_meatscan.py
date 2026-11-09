"""Unit tests for MeatScan acquisition utility (acquire_meatscan.py)."""

import hashlib
import tempfile
import unittest
from pathlib import Path

from src.data.dataset_tools.acquire_meatscan import (
    MEATSCAN_METADATA,
    compute_file_md5,
    download_meatscan_archive,
    get_local_status,
    verify_archive,
)


class TestMeatScanAcquisition(unittest.TestCase):

    def test_authoritative_metadata_values(self):
        """Verify Zenodo metadata constants match verified API record 16764338."""
        self.assertEqual(MEATSCAN_METADATA["doi"], "10.5281/zenodo.16764338")
        self.assertEqual(MEATSCAN_METADATA["archive_size_bytes"], 25416554933)
        self.assertEqual(MEATSCAN_METADATA["zenodo_md5"], "5eafbea4674bd83ee2602ed2ec526a14")
        self.assertEqual(MEATSCAN_METADATA["license"], "CC BY 4.0")
        self.assertEqual(MEATSCAN_METADATA["total_images"], 11000)
        self.assertEqual(MEATSCAN_METADATA["original_classes"]["Fresh"], 5627)
        self.assertEqual(MEATSCAN_METADATA["original_classes"]["Spoiled"], 5373)

    def test_canonical_label_mapping_strictly_forbids_mold(self):
        """Verify MeatScan only maps to normal and spoilage_indicator, NEVER mold."""
        mapping = MEATSCAN_METADATA["canonical_label_mapping"]
        self.assertEqual(mapping["Fresh"]["target_label"], "normal")
        self.assertEqual(mapping["Fresh"]["decision_rule_step"], "3_normal_appearance")

        self.assertEqual(mapping["Spoiled"]["target_label"], "spoilage_indicator")
        self.assertEqual(mapping["Spoiled"]["decision_rule_step"], "2_deterioration_no_growth")

        # Must not contain mold_like_growth anywhere in target labels
        target_labels = [v["target_label"] for v in mapping.values()]
        self.assertNotIn("mold_like_growth", target_labels)

    def test_download_safety_guard_blocks_unconfirmed_download(self):
        """Verify automatic download is blocked without explicit confirmation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            res = download_meatscan_archive(target_dir=Path(tmpdir), confirm=False)
            self.assertEqual(res, 1)
            # Ensure no file was created
            archive_path = Path(tmpdir) / MEATSCAN_METADATA["archive_filename"]
            self.assertFalse(archive_path.exists())

    def test_local_status_structure(self):
        """Verify local status inspection returns complete data structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            status = get_local_status(base_dir=Path(tmpdir))
            self.assertFalse(status.archive_exists)
            self.assertFalse(status.extracted_dir_exists)
            self.assertEqual(status.fresh_count, 0)
            self.assertEqual(status.spoiled_count, 0)
            self.assertGreaterEqual(status.free_disk_space_gb, 0.0)

    def test_compute_md5_utility(self):
        """Test streaming MD5 calculation against hashlib."""
        with tempfile.NamedTemporaryFile(delete=False) as tf:
            tf.write(b"FoodGuard AI 2.0 MeatScan Test Data Payload")
            test_path = Path(tf.name)

        try:
            expected_md5 = hashlib.md5(b"FoodGuard AI 2.0 MeatScan Test Data Payload").hexdigest()
            computed_md5 = compute_file_md5(test_path)
            self.assertEqual(computed_md5, expected_md5)
        finally:
            test_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
