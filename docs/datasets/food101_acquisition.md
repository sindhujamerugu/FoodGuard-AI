# FoodGuard AI — Food-101 Dataset Acquisition (Step 10)

> **Purpose:** Food category recognition only.
> Food-101 is NOT a food-safety or food-quality dataset.
> It does NOT classify contamination, spoilage, foreign objects, or hygiene concerns.

---

## Dataset Overview

| Property | Value |
|---|---|
| Name | Food-101 |
| Source | ETH Zurich Computer Vision Lab |
| Authors | Bossard, Guillaumin, Van Gool (ECCV 2014) |
| Download URL | `http://data.vision.ee.ethz.ch/cvl/food-101.tar.gz` |
| Archive size | ~5 GB (compressed) |
| Extracted size | ~4.6 GB |
| Categories | 101 food categories |
| Total images | 101,000 (1,000 per category) |
| Train split | 750 images per category (75,750 total) |
| Test split | 250 images per category (25,250 total) |
| Image format | JPEG |
| License | Non-commercial research use — verify at https://vision.ee.ethz.ch/datasets.html |

---

## Extracted Directory Structure

```
data/raw/food_recognition/food101/
├── food-101.tar.gz          ← downloaded archive (Git-ignored)
└── food-101/                ← extracted dataset (Git-ignored)
    ├── images/
    │   ├── apple_pie/       (750 train + 250 test = 1,000 images)
    │   ├── baby_back_ribs/
    │   ├── samosa/          ← Indian dish present in Food-101
    │   ├── chicken_curry/   ← Indian dish present in Food-101
    │   │   ...              (101 categories total)
    │   └── waffles/
    ├── meta/
    │   ├── classes.txt      (101 class names, one per line)
    │   ├── labels.txt       (same as classes.txt)
    │   ├── train.txt        (class/image entries, 75,750 lines)
    │   └── test.txt         (class/image entries, 25,250 lines)
    └── license_agreement.txt
```

---

## Acquisition Scripts

All scripts live under `src/data/food101/`. They use only Python standard library
and Pillow (already a project dependency). No additional packages required.

### Full pipeline (recommended)

```bash
# Download (first time only — ~5 GB):
python src/data/food101/pipeline.py

# If archive already downloaded:
python src/data/food101/pipeline.py --skip-download

# If dataset already extracted (e.g. after reboot):
python src/data/food101/pipeline.py --validate-only

# Save JSON reports to data/raw/food_recognition/food101/:
python src/data/food101/pipeline.py --validate-only --save-reports
```

### Individual steps

```bash
# 1. Download archive
python src/data/food101/download.py --skip-if-exists

# 2. Extract archive
python src/data/food101/extract.py --skip-if-exists

# 3. Inspect structure + meta files
python src/data/food101/inspect.py

# 4. Generate statistics (with dimension sampling)
python src/data/food101/stats.py --sample 20

# 5. Full validation report
python src/data/validation/food101_validator.py
```

---

## Validation Checks

The validator (`src/data/validation/food101_validator.py`) checks:

| Check | Expected |
|---|---|
| `food-101/` root directory exists | Present |
| `images/` subdirectory | Present |
| `meta/` subdirectory | Present |
| `meta/classes.txt` | 101 entries |
| `meta/train.txt` | 75,750 entries |
| `meta/test.txt` | 25,250 entries |
| Class directory count | 101 |
| Per-class image count | 1,000 each |
| Total images | 101,000 |
| Image format | JPEG only |
| Duplicate filenames | 0 expected |
| Corrupt images (optional) | 0 expected |

If the dataset is absent, all checks return `WARNING / AWAITING DATA` — not errors.

---

## Indian Food Classes in Food-101

Food-101 contains only **two strongly Indian dishes**:

| Class | Description |
|---|---|
| `samosa` | Deep-fried pastry snack |
| `chicken_curry` | Chicken in curry sauce |

This is a significant limitation for FoodGuard AI's Indian-market focus.
The **Indian Food Image Dataset** (Dataset B) will supplement Food-101 with
additional Indian dishes for domain adaptation once access is obtained.

---

## What Food-101 Will Be Used For

| Use | Allowed |
|---|---|
| Food category recognition (e.g. "this appears to be biryani") | ✅ |
| Transfer learning backbone for visual features | ✅ |
| Fine-tuning for Indian food recognition | ✅ (with Indian Food Dataset) |
| Food safety / contamination classification | ❌ Never |
| Spoilage detection | ❌ Never |
| Foreign object detection | ❌ Never |
| Hygiene assessment | ❌ Never |

---

## Git Safety

The following are excluded from Git (`.gitignore`):

```
data/raw/food_recognition/food101/food-101.tar.gz
data/raw/food_recognition/food101/food-101/
data/raw/food_recognition/food101/stats.json
data/raw/food_recognition/food101/inspection.json
data/raw/food_recognition/food101/validation_report.json
```

The scripts under `src/data/food101/` **are** committed.
The documentation under `docs/datasets/` **is** committed.

---

## Next Dataset Phase

After Food-101 is successfully validated:

1. **Indian Food Image Dataset** — contact DataCluster Labs for access,
   then run `src/data/validation/indian_food_validator.py` after download.

2. **FoodGuard Quality Dataset** — begin curation under the governance
   rules documented in `docs/datasets/quality_dataset_plan.md`.
