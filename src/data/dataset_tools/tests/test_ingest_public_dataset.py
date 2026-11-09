"""Unit tests for public dataset ingestion tool (ingest_public_dataset.py)."""

import json
import pathlib
import tempfile
import unittest
from PIL import Image

from src.data.dataset_tools.ingest_public_dataset import (
    _map_fruits_360_file,
    _map_meatscan_file,
    build_manifest_entry,
    ingest_dataset,
    resolve_food_category,
)
from src.data.dataset_tools.validate_manifest import validate_manifest, ValidationReport


class TestIngestPublicDataset(unittest.TestCase):

    def test_nut_category_mapping(self):
        """Test explicit nut category mapping to 'fruit'."""
        self.assertEqual(resolve_food_category("Almonds 1"), "fruit")
        self.assertEqual(resolve_food_category("Walnuts"), "fruit")
        self.assertEqual(resolve_food_category("Chestnut"), "fruit")
        self.assertEqual(resolve_food_category("Hazelnut 2"), "fruit")
        self.assertEqual(resolve_food_category("Pecan"), "fruit")

    def test_produce_and_meat_category_mapping(self):
        """Test fruit, vegetable, and meat category resolution."""
        self.assertEqual(resolve_food_category("Apple Braeburn"), "fruit")
        self.assertEqual(resolve_food_category("Banana 1"), "fruit")
        self.assertEqual(resolve_food_category("Carrot"), "vegetable")
        self.assertEqual(resolve_food_category("Potato"), "vegetable")
        self.assertEqual(resolve_food_category("Beef Cut"), "cooked_prepared")
        self.assertEqual(resolve_food_category("Cow Meat"), "cooked_prepared")

    def test_fruits_360_mapping_and_splits(self):
        """Test Fruits-360 item_id generation and train/test split preservation."""
        train_path = pathlib.PurePosixPath("Training/Apple 10/r0_0_100.jpg")
        test_path = pathlib.PurePosixPath("Test/Apple 10/0_100.jpg")

        mapped_train = _map_fruits_360_file(train_path)
        self.assertIsNotNone(mapped_train)
        label, step, food_cat, item_id, session_id, split = mapped_train

        self.assertEqual(label, "normal")
        self.assertEqual(step, "3_normal_appearance")
        self.assertEqual(food_cat, "fruit")
        self.assertEqual(item_id, "Apple 10")
        self.assertEqual(session_id, "r0_0_100.jpg")
        self.assertEqual(split, "train")

        mapped_test = _map_fruits_360_file(test_path)
        self.assertIsNotNone(mapped_test)
        _, _, _, _, _, test_split = mapped_test
        self.assertEqual(test_split, "test")

    def test_meatscan_mapping_preserves_binary_labels(self):
        """Test MeatScan maps Fresh -> normal and Spoiled -> spoilage_indicator without mold."""
        fresh_path = pathlib.PurePosixPath("MeatScan_Dataset/Fresh/fresh_001.jpg")
        spoiled_path = pathlib.PurePosixPath("MeatScan_Dataset/Spoiled/spoiled_001.jpg")

        mapped_fresh = _map_meatscan_file(fresh_path)
        self.assertIsNotNone(mapped_fresh)
        f_label, f_step, f_cat, f_item, f_sess, f_split = mapped_fresh
        self.assertEqual(f_label, "normal")
        self.assertEqual(f_step, "3_normal_appearance")
        self.assertEqual(f_cat, "cooked_prepared")
        self.assertEqual(f_item, "Fresh_fresh_001")
        self.assertEqual(f_sess, "fresh_001.jpg")
        self.assertEqual(f_split, "train")

        mapped_spoiled = _map_meatscan_file(spoiled_path)
        self.assertIsNotNone(mapped_spoiled)
        s_label, s_step, s_cat, s_item, s_sess, s_split = mapped_spoiled
        self.assertEqual(s_label, "spoilage_indicator")
        self.assertEqual(s_step, "2_deterioration_no_growth")
        self.assertEqual(s_cat, "cooked_prepared")
        self.assertEqual(s_item, "Spoiled_spoiled_001")
        self.assertEqual(s_sess, "spoiled_001.jpg")

        # Explicit safety check: MeatScan NEVER maps to mold_like_growth
        self.assertNotEqual(f_label, "mold_like_growth")
        self.assertNotEqual(s_label, "mold_like_growth")

    def test_no_duplicate_copy_behavior(self):
        """Test live ingestion creates JSONL manifest without copying/duplicating images."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = pathlib.Path(tmpdir)
            data_root = tmp_path / "data"
            raw_dir = data_root / "raw" / "food_quality" / "licensed_public" / "fruits_360"
            train_apple = raw_dir / "Training" / "Apple 10"
            train_apple.mkdir(parents=True, exist_ok=True)

            img_file = train_apple / "r0_0_100.jpg"
            img = Image.new("RGB", (50, 50), color="blue")
            img.save(img_file, format="JPEG")

            manifest_file = data_root / "manifests" / "food_quality" / "manifest.jsonl"

            # Ingest with dry_run=False
            res = ingest_dataset(
                dataset_type="fruits_360",
                input_dir=raw_dir,
                output_manifest=manifest_file,
                license_str="CC BY-SA 4.0",
                data_root=data_root,
                dry_run=False,
            )
            self.assertEqual(res, 0)
            self.assertTrue(manifest_file.exists())

            # Confirm no extra files created in raw_dir (only original file remains)
            all_raw_files = list(raw_dir.rglob("*.jpg"))
            self.assertEqual(len(all_raw_files), 1)
            self.assertEqual(all_raw_files[0], img_file)

            # Read manifest record
            with open(manifest_file, "r", encoding="utf-8") as fh:
                row = json.loads(fh.readline())

            self.assertEqual(row["image_path"], "raw/food_quality/licensed_public/fruits_360/Training/Apple 10/r0_0_100.jpg")
            self.assertEqual(row["item_id"], "Apple 10")
            self.assertEqual(row["session_id"], "r0_0_100.jpg")
            self.assertEqual(row["split"], "train")
            self.assertTrue(row["exif_stripped"])

            # Validate manifest with validate_manifest validator
            report = ValidationReport()
            validate_manifest(manifest_file, report, data_root=data_root, check_files=True, forbid_holdout=False)
            self.assertEqual(len(report.errors), 0, f"Validation errors: {report.errors}")


if __name__ == "__main__":
    unittest.main()
