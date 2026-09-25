# FoodGuard AI — Dataset Download Plan

> **Current status: AWAITING DATA**
> No datasets have been downloaded.
> This document describes the intended download and verification procedure.

---

## Dataset A — Food-101

### When to Download

Download Food-101 when:
- The food recognition model training pipeline is ready (Step 10+)
- A machine with adequate storage is available (dataset is ~5 GB extracted)
- The ETH Zurich license terms have been reviewed and accepted

### Download Steps

```bash
# Step 1 — Verify the official source URL
# https://vision.ee.ethz.ch/datasets.html

# Step 2 — Download the archive
# wget <official_url>/food-101.tar.gz -P data/raw/food_recognition/food101/

# Step 3 — Verify checksum (if published by ETH Zurich)
# sha256sum data/raw/food_recognition/food101/food-101.tar.gz

# Step 4 — Extract
# tar -xzf data/raw/food_recognition/food101/food-101.tar.gz \
#     -C data/raw/food_recognition/food101/

# Step 5 — Validate using local utility
# python src/data/validation/food101_validator.py
```

### Expected Post-Extraction Structure

```
data/raw/food_recognition/food101/food-101/
├── images/
│   ├── apple_pie/          (1000 images)
│   ├── baby_back_ribs/
│   ├── baklava/
│   │   ...
│   └── waffles/            (101 categories total)
├── meta/
│   ├── classes.txt
│   ├── labels.txt
│   ├── test.txt
│   └── train.txt
└── license_agreement.txt
```

### Validation Checks After Download

| Check | Expected |
|---|---|
| Top-level directory exists | `food-101/` |
| `images/` subdirectory | Present |
| `meta/` subdirectory | Present |
| Category count | 101 |
| Image extensions | `.jpg` only |
| Total images | ~101,000 |

---

## Dataset B — Indian Food Image Dataset

### When to Download

Download only after:
- Written permission or data access agreement is obtained from DataCluster Labs
- Contact: https://github.com/datacluster-labs/Indian-Food-Image-Dataset
- License terms are confirmed in writing

### Download Steps

To be determined based on the access method provided by DataCluster Labs.

### Validation Checks After Download

Validation structure to be confirmed after obtaining actual data.
The validator `src/data/validation/indian_food_validator.py` will be
updated with actual expected class names after dataset access is obtained.

---

## Dataset C — FoodGuard Quality Dataset

### When to Build

Build the FoodGuard Quality Dataset when:
- A data curation team is in place
- Consent and data governance policies are established
- A labelling tool and annotation pipeline are set up
- At least a minimum viable set of labeled images per class is available

### Minimum Viable Dataset (per class)

For initial model development, a minimum of:
- 100–200 images per class (subject to revision)
- Balanced or documented imbalance
- At least 20% held out for validation

### Classes Required

```
foreign_object
pest_insect
mold_like_growth
spoilage_indicator
undercooked_appearance
burnt_overcooked
packaging_issue
hygiene_indicator
normal
uncertain
```

### Schema

See `quality_dataset_plan.md` for the full record schema.

---

## Dataset D — FSSAI Knowledge Base

### When to Collect

FSSAI references may be collected incrementally as the risk-scoring
and reviewer-guidance systems are built.

### Collection Method

1. Identify relevant regulations from https://www.fssai.gov.in/
2. Record metadata (title, date, URL, section) in a structured format
3. Store short structured excerpts — do not reproduce full legal texts
4. Retrieve date must be recorded with each entry

### Storage Format

```json
{
    "source_title": "Food Safety and Standards (Contaminants, Toxins and Residues) Regulations, 2011",
    "source_date": "2011",
    "source_version": "as amended",
    "official_url": "https://www.fssai.gov.in/...",
    "section": "Schedule 1 — Maximum Limits for Contaminants",
    "content": "<short structured excerpt>",
    "retrieved_at": "YYYY-MM-DD"
}
```

---

## Git Safety Reminder

The `.gitignore` file is configured to exclude:
- All image files under `data/`
- All archive formats (`.tar.gz`, `.zip`, etc.)
- All ML model binary files (`.pt`, `.h5`, `.onnx`, etc.)
- All large data files (`.csv`, `.jsonl`, `.parquet`, etc.) under `data/`

`.gitkeep` files mark empty directories and ARE committed.
Documentation under `docs/` IS committed.
Source code under `src/` IS committed.
