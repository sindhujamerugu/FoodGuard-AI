# FoodGuard AI — MeatScan Dataset Acquisition (Phase 2.1)

> **Purpose:** Food quality intelligence — visual meat spoilage and freshness assessment.  
> **Status:** Phase 2.1 Acquisition Plan & Specification.  
> **Source:** Kwame Nkrumah University of Science and Technology (KNUST), Kumasi, Ghana.  
> **Publication:** Elsevier *Data in Brief* (2025).  
> **Archive Size:** 25.4 GB (`MeatScan_Dataset.rar`).  
> **License:** Creative Commons Attribution 4.0 International (CC BY 4.0).  

---

## 1. Dataset Overview

| Property | Value |
|---|---|
| **Name** | MeatScan: An image dataset for machine learning-based classification of fresh and spoiled cow meat |
| **Originating Institution** | Kwame Nkrumah University of Science and Technology (KNUST), Kumasi, Ghana |
| **Authors** | Rose-Mary Owusuaa Mensah Gyening, Michael Appiah Akoto, Kwabena Owusu-Agyemang, Lawrence Amoako-Banning, et al. |
| **Journal Reference** | *Data in Brief*, Elsevier (2025) |
| **Repository URL** | https://zenodo.org/records/16764338 |
| **DOI** | [10.5281/zenodo.16764338](https://doi.org/10.5281/zenodo.16764338) |
| **License** | Creative Commons Attribution 4.0 International (CC BY 4.0) — verified commercial-use permissible |
| **Total Images** | 11,000 high-resolution RGB images |
| **Original Classes** | `Fresh`: 5,627 images (51.15%) · `Spoiled`: 5,373 images (48.85%) |
| **Archive File** | `MeatScan_Dataset.rar` |
| **Download Size** | 25.4 GB (requires ~30 GB storage after extraction) |
| **Image Format** | JPEG / JPG |
| **Capture Environments** | Open-air meat markets, butcher shops, and cold-storage facilities in Ghana |

### Citation
```bibtex
@article{gyening2025meatscan,
  title={MeatScan: An image dataset for machine learning-based classification of fresh and spoiled cow meat},
  author={Gyening, Rose-Mary Owusuaa Mensah and Akoto, Michael Appiah and Owusu-Agyemang, Kwabena and Amoako-Banning, Lawrence and others},
  journal={Data in Brief},
  publisher={Elsevier},
  year={2025},
  doi={10.5281/zenodo.16764338}
}
```

---

## 2. FoodGuard AI Canonical Label Mapping

The MeatScan dataset is a **binary fresh-vs-spoiled** cow meat dataset. In strict compliance with FoodGuard AI Phase 1 research findings:

> [!IMPORTANT]
> **CRITICAL LABELING RULE:**  
> MeatScan contains **zero confirmed mold fruiting bodies**. Under NO circumstance should any MeatScan image be mapped to `mold_like_growth`.  
> Labeling any MeatScan fresh or spoiled image as mold is an erroneous categorization that would introduce severe label noise and false positives into the mold detection head.

### Mapping Specification:

| Original MeatScan Class | Sample Count | Canonical FoodGuard Label | Decision Rule Step | Food Category | Spoilage Stage |
|---|---|---|---|---|---|
| **Fresh** | 5,627 | `normal` | `3_normal_appearance` | `meat` | `n/a` |
| **Spoiled** | 5,373 | `spoilage_indicator` | `2_deterioration_no_growth` | `meat` | `mid` |

---

## 3. Directory Layout

The raw images will reside under the licensed public directory hierarchy without modifying application code:

```
data/raw/food_quality/licensed_public/meatscan/
├── MeatScan_Dataset.rar             ← Downloaded archive (~25.4 GB, Git-ignored)
└── MeatScan_Dataset/                ← Extracted raw dataset (Git-ignored)
    ├── Fresh/                       ← 5,627 images (fresh_0001.jpg, ...)
    └── Spoiled/                     ← 5,373 images (spoiled_0001.jpg, ...)
```

---

## 4. Acquisition & Ingestion Protocol (Reusing Existing Tools)

The FoodGuard AI project already possesses dedicated dataset ingestion, validation, and leakage-checking tools. We reuse this infrastructure instead of creating ad-hoc scripts.

### Step 1: Storage Verification & Controlled Download
Ensure at least **60 GB of free disk space** is available on the volume holding `data/`:
- Archive download: 25.4 GB
- Extracted images: ~30 GB

Do NOT download automatically via automated test scripts. When ready for physical acquisition:
```bash
# Target directory
mkdir -p data/raw/food_quality/licensed_public/meatscan

# Download archive with resume support from Zenodo
curl -L -C - -o data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset.rar \
    "https://zenodo.org/records/16764338/files/MeatScan_Dataset.rar?download=1"
```

### Step 2: Extract Archive
```bash
# Extract MeatScan_Dataset.rar into the meatscan directory
unrar x data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset.rar \
    data/raw/food_quality/licensed_public/meatscan/
```

### Step 3: Run Leakage, Deduplication, and Checksum Checks
Reuse `src/data/dataset_tools/check_leakage.py` to detect duplicate files or perceptual hash near-duplicates:
```bash
python -m src.data.dataset_tools.check_leakage data/manifests/food_quality/manifest.jsonl \
    --data-root data --phash-threshold 4
```

### Step 4: Dry-Run Ingestion Inspection
Before modifying `manifest.jsonl`, run the ingestion tool in `--dry-run` mode to inspect class mapping, item counts, and sample JSONL rows:
```bash
python -m src.data.dataset_tools.ingest_public_dataset \
    --dataset-type meatscan \
    --input-dir data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset \
    --license "CC BY 4.0" \
    --dry-run
```

### Step 5: Live Ingestion (Zero Image Duplication)
Run the ingestion tool to append validated records directly to `data/manifests/food_quality/manifest.jsonl`:
```bash
python -m src.data.dataset_tools.ingest_public_dataset \
    --dataset-type meatscan \
    --input-dir data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset \
    --license "CC BY 4.0"
```
*Note: `ingest_public_dataset` uses in-place relative paths. No duplicate image copies are created on disk.*

### Step 6: Validate Manifest Schema
Confirm all appended rows satisfy the canonical FoodGuard schema:
```bash
python -m src.data.dataset_tools.validate_manifest data/manifests/food_quality/manifest.jsonl
```

---

## 5. Verified Subsets Strategy

Because the full dataset is 25.4 GB (11,000 images), Phase 2.1 supports staged acquisition and validation using **verified representative subsets**:

1. **Pilot Benchmark Subset (1,000 images):**
   - 500 Fresh + 500 Spoiled images selected deterministically across capture batches.
   - Purpose: Verifies end-to-end model ingestion, gradient descent stability, and inference latency on MobileNetV3-Small before training on the full 11,000 images.
2. **Full Production Dataset (11,000 images):**
   - 5,627 Fresh + 5,373 Spoiled images.
   - Stratified, group-split 70/15/15 assignment by batch/item ID via `src/ml/splitting.py`.

---

## 6. Pre-Splitting and Holdout Protection

In accordance with `DATASET_SPEC.md` section 9 and `ACQUISITION_PLAN.md` section 6:
- MeatScan data will be partitioned into `train`, `validation`, and `test` splits using `src/ml/splitting.py`.
- **The FoodGuard Real-World Holdout Test Set** (`data/holdout/`) remains strictly separate and will NEVER contain any MeatScan training or validation data.
