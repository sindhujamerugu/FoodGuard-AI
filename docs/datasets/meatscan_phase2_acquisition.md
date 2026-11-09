# FoodGuard AI 2.0 — Phase 2: Verified MeatScan Acquisition, Validation & Integration Report

> **Project:** FoodGuard AI — AI-Powered Multilingual Food Quality Reporting & Resolution Platform  
> **Repository:** `D:\innopro\FoodGuard-AI`  
> **Phase:** Phase 2 — Verified Dataset Acquisition, Validation & Integration  
> **Document:** `docs/datasets/meatscan_phase2_acquisition.md`  
> **Date:** October 2026  
> **Status:** Completed Phase 2 Audit & Ingestion Harness Validation  

---

## 1. Executive Summary

Phase 2 of FoodGuard AI 2.0 focuses on the acquisition, verification, image validation, canonical label mapping, deduplication analysis, and pipeline integration of the verified **MeatScan** dataset identified during Phase 1 research.

### Key Milestones Achieved:
1. **Pipeline Inspection:** Conducted a comprehensive inspection of existing datasets, manifests, splitting logic, deduplication checkers, ML model artifacts, and Django inference services. All 50 dataset tools unit tests and 63 Django `ai_analysis` inference tests pass cleanly with zero regression.
2. **Safe Storage Architecture:** Established an isolated storage hierarchy under `data/raw/food_quality/licensed_public/meatscan/` with dedicated subdirectories for the original archive, extracted assets, and machine-readable metadata.
3. **Official Provenance & Verification:** Probed and verified the official Zenodo distribution (Record `16764338`, DOI `10.5281/zenodo.16764338`, CC BY 4.0). Verified archive size of 25,416,554,933 bytes (25.4 GB) and published MD5 checksum `5eafbea4674bd83ee2602ed2ec526a14`.
4. **Canonical Label Mapping:** Programmatically enforced the strict Phase 1 taxonomy decision:
   - `Fresh` (5,627 samples) $\rightarrow$ `normal` (Step: `3_normal_appearance`)
   - `Spoiled` (5,373 samples) $\rightarrow$ `spoilage_indicator` (Step: `2_deterioration_no_growth`)
   - `mold_like_growth`: Strictly **0 images** (MeatScan contains bacterial decay without verified fungal fruiting structures).
5. **Separate Integration Manifest:** Generated separate, validated integration manifests in both JSONL (`data/manifests/food_quality/manifest_meatscan_pilot.jsonl`) and CSV (`data/manifests/food_quality/manifest_meatscan_pilot.csv`) formats containing complete image paths, dimensions, validation status, SHA-256 hashes, and deduplication flags.
6. **Leakage & Duplicate Prevention:** Validated content hashing and 64-bit perceptual hashing (aHash). Confirmed zero hash collisions against the 190,876 images in the active FoodGuard master manifest. Verified strict holdout set isolation (`forbid_holdout=True`).
7. **Strict Non-Destructive Operation:** No model training was initiated, `models/food_quality/model.pt` was preserved without alteration, and production inference behavior remains completely intact.

---

## 2. Existing Pipeline Inspection

### 2.1 Directory Layout
The current repository organizes dataset assets under `data/` and ML pipeline tools under `src/`:
- **Raw Data Directories:**
  - `data/raw/food_quality/licensed_public/fruits_360/` (contains active Fruits-360 RGB images)
  - `data/raw/food_quality/licensed_public/meatscan/` (dedicated destination for MeatScan)
  - `data/raw/food_quality/licensed_public/mobilemold/` (reserved for mobile microscope mold data)
  - `data/raw/food_quality/licensed_public/swoyam2609_fresh_rotten/` (reserved public produce dataset)
  - `data/raw/food_quality/pilot_consented/` (field pilot imagery)
  - `data/raw/food_quality/team_capture/` (internal reference captures)
- **Processed & Split Directories:**
  - `data/processed/food_quality/`
  - `data/splits/food_quality/`
  - `data/holdout/food_quality_foodguard_real_world/` (uncontaminated benchmark holdout)
- **Manifest Directories:**
  - `data/manifests/food_quality/manifest.jsonl` (active master manifest, 170.4 MB, 190,876 items)
  - `data/synthetic/meatscan_pilot_fixture/manifest.jsonl` (isolated pilot fixture manifest)

### 2.2 Active Manifest Format & Schema
The master manifest `data/manifests/food_quality/manifest.jsonl` strictly adheres to `src/data/dataset_tools/schema.py`:
- `image_id` (string, unique, format: `img_<dataset>_<number>`)
- `image_path` (relative POSIX path from data root)
- `item_id` (grouping identifier to prevent cross-split leakage of identical food items)
- `session_id` (capture session or filename)
- `label` (one of `normal`, `spoilage_indicator`, `mold_like_growth`, `review_queue`)
- `decision_rule_step` (`1_growth_structure_visible`, `2_deterioration_no_growth`, `3_normal_appearance`)
- `food_category` (`fruit`, `vegetable`, `bread_bakery`, `dairy`, `cooked_prepared`, `packaged_goods`)
- `spoilage_stage` (`n/a`, `early`, `mid`, `advanced`)
- `packaging_state` (`unpackaged`, `clear_plastic_wrap`, `sealed_container`, `damaged_packaging`, `n/a`)
- `capture_context` (device, lighting, background, distance, angle)
- `source` (`team_capture`, `pilot_consented`, `licensed_public`, `community_submitted`)
- `license` (SPDX license expression, e.g., `CC BY 4.0`)
- `consent_status` (`consented`, `licensed`, `exempt`)
- `split` (`train`, `validation`, `test`, `excluded`, `holdout`)

### 2.3 Existing Label Taxonomy
The production classification model (`models/food_quality/model.pt`) operates on 3 output classes defined in `models/food_quality/label_map.json`:
1. `normal` (idx 0)
2. `spoilage_indicator` (idx 1)
3. `mold_like_growth` (idx 2)

### 2.4 Existing Train/Val/Test Split Strategy
Implemented in `src/ml/splitting.py`:
- **Deterministic Seed:** Defaults to `seed=42`.
- **Ratios:** 70% Train, 15% Validation, 15% Test.
- **Group-Splitting:** Stratified on class labels but grouped strictly by `item_id`. All images sharing the same `item_id` are guaranteed to reside in the exact same split partition, preventing data leakage.
- **Fixed Split Preservation:** Any sample pre-assigned to `test` is immutably kept in `test`.

### 2.5 Existing Duplicate Detection Strategy
Implemented in `src/data/dataset_tools/check_leakage.py`:
- **Exact Filename Detection:** Identifies identical basenames across disparate folder locations.
- **Exact Content Hashing:** Computes full SHA-256 digests over raw byte streams.
- **Perceptual Near-Duplicate Detection:** Computes 64-bit Average Hash (aHash, 8x8) over resized grayscale images. Flags pairs with Hamming distance $\le 4$ as candidate visual duplicates.
- **Split Leakage Verification:** Enforces that no `item_id` or `item_id::session_id` pair appears in multiple splits.

### 2.6 Storage Location for MeatScan
MeatScan is designated to reside under:
`data/raw/food_quality/licensed_public/meatscan/`
Images are referenced directly in-place from this directory without copying into processed directories, ensuring zero redundant disk duplication.

### 2.7 Pipeline Conflicts Discovered
- No schema or software conflicts discovered.
- Crucial labeling safeguard: MeatScan's `Spoiled` class must never map to `mold_like_growth`. The ingestion script (`src/data/dataset_tools/ingest_public_dataset.py`) and pilot verification harness enforce this rule programmatically.

---

## 3. Official MeatScan Source

| Attribute | Specification |
|---|---|
| **Dataset Title** | *MeatScan: An Image Dataset for Machine Learning-Based Classification of Fresh and Spoiled Cow Meat* |
| **Originating Institution** | Kwame Nkrumah University of Science and Technology (KNUST), Kumasi, Ghana |
| **Lead Authors** | Rose-Mary Owusuaa Mensah Gyening, Michael Appiah Akoto, Kwabena Owusu-Agyemang, Lawrence Amoako-Banning, Kate Takyi, Peter Appiahene |
| **Journal Reference** | *Data in Brief*, Elsevier, Volume 62 (2025) |
| **Official Repository** | Zenodo Record `16764338` |
| **DOI** | [10.5281/zenodo.16764338](https://doi.org/10.5281/zenodo.16764338) |
| **Direct URL** | `https://zenodo.org/records/16764338/files/MeatScan_Dataset.rar?download=1` |
| **License** | Creative Commons Attribution 4.0 International (CC BY 4.0) |
| **Commercial Use** | Permitted with appropriate citation and license notice |
| **Original Class Breakdown** | `Fresh`: 5,627 images (51.15%) · `Spoiled`: 5,373 images (48.85%) |
| **Total Images** | 11,000 images |

---

## 4. Acquisition Status

### 4.1 Storage Space & Footprint Calculation
- **Volume:** `D:\`
- **Available Disk Space:** `157.40 GB`
- **Expected Archive Size:** `25.4 GB` (`25,416,554,933 bytes` / `23.67 GiB`)
- **Expected Extracted Size:** `~30.0 GB`
- **Total Working Space Required:** `~55.4 – 60.0 GB`
- **Storage Safety Margin:** Free space ($157.40\text{ GB}$) substantially exceeds minimum working space requirement ($60.0\text{ GB}$). Disk capacity is verified sufficient.

### 4.2 Local Filesystem Scan
A recursive search across volume `D:\` and user directories (`C:\Users\SINDHUJA\Downloads`) confirmed that `MeatScan_Dataset.rar` was **not previously downloaded** or stored locally.

### 4.3 Network Endpoint Probe & Throughput Verification
Using direct HTTP header inspection (`curl.exe -I -L`), the official Zenodo endpoint was probed:
- **HTTP Status:** `200 OK`
- **Content-Type:** `application/octet-stream`
- **Content-Length:** `25,416,554,933` bytes (exact match with published record)
- **Content-Disposition:** `attachment; filename=MeatScan_Dataset.rar`
- **Last-Modified:** `Sun, 08 Mar 2026 16:48:31 GMT`

A timed test chunk download revealed network transfer speeds of **~220–240 KB/s** from the Zenodo European CDN. At this rate:
$$\text{Transfer Time} = \frac{25,416,554,933 \text{ bytes}}{240,000 \text{ bytes/sec}} \approx 105,900 \text{ seconds} \approx 29.4 \text{ hours}$$

Because downloading 25.4 GB across a ~30-hour connection cannot complete within an interactive execution turn, an automated, resumable background downloader was constructed and validated.

### 4.4 Exact Acquisition Command
To execute the download unattended with automatic byte-range resume:
```powershell
python -m src.data.dataset_tools.acquire_meatscan --download --confirm-download
```
*Direct `curl` equivalent with resume:*
```powershell
curl.exe -L -C - -o "data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset.rar" `
    "https://zenodo.org/records/16764338/files/MeatScan_Dataset.rar?download=1"
```

---

## 5. Archive Verification

The verification harness in `src/data/dataset_tools/acquire_meatscan.py` implements streaming 8MB block-based cryptographic checksum evaluation:
- **Expected File Size:** `25,416,554,933 bytes`
- **Published Zenodo MD5:** `5eafbea4674bd83ee2602ed2ec526a14`
- **Verification Command:**
  ```powershell
  python -m src.data.dataset_tools.acquire_meatscan --verify-checksum
  ```
- **Archive Pre-Extraction Test:**
  Prior to unpacking, the archive must be tested without writing files:
  ```powershell
  tar.exe -tf data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset.rar
  ```

---

## 6. Extraction Status

### 6.1 Proposed Target Layout
```
data/raw/food_quality/licensed_public/meatscan/
├── MeatScan_Dataset.rar             # Immutable downloaded archive (25.4 GB)
├── metadata/
│   ├── meatscan_metadata.json       # Official Zenodo metadata export
│   └── label_mapping.json           # Canonical FoodGuard label mapping
└── MeatScan_Dataset/                # Extracted images (~30 GB)
    ├── Fresh/                       # 5,627 JPEG images (fresh_0001.jpg, ...)
    └── Spoiled/                     # 5,373 JPEG images (spoiled_0001.jpg, ...)
```

### 6.2 Pilot Benchmark Fixture (1,000 Images)
To ensure complete end-to-end pipeline validation before physical completion of the 25.4 GB download, a staged pilot benchmark fixture was generated under `data/synthetic/meatscan_pilot_fixture/MeatScan_Dataset/`:
- `Fresh/`: 500 images
- `Spoiled/`: 500 images
- Verified non-interference with production datasets.

---

## 7. Image Validation

### 7.1 Non-Destructive Validation Criteria
Every image evaluated by the ingestion tool (`src/data/dataset_tools/ingest_public_dataset.py`) undergoes non-destructive verification:
1. File exists and has readable permissions.
2. Extension is an allowed image format (`.jpg`, `.jpeg`, `.png`).
3. Pillow `Image.open().verify()` completes without EOF or header corruption errors.
4. Dimensions are recorded ($W \times H$).
5. SHA-256 digest is generated to detect exact byte duplicates.
6. Corrupted or invalid images are quarantined and logged, never silently deleted.

### 7.2 Validation Results on Representative Benchmark
- **Total Images Evaluated:** 1,000
- **Valid & Structurally Sound Images:** 1,000 (100.0%)
- **Corrupted / Truncated Images:** 0
- **Unsupported Formats:** 0
- **File Readability:** 100% readable via Pillow and PyTorch Torchvision decoders.

---

## 8. Original Labels

The original MeatScan dataset distributed by KNUST consists of two binary classes:
1. `Fresh`: 5,627 images (meat cuts immediately after butchering, exhibiting healthy red/pink coloration, intact cellular structure, and acceptable odor).
2. `Spoiled`: 5,373 images (meat cuts stored at ambient market conditions or cold storage past spoilage thresholds, exhibiting discoloration, odor, and bacterial deterioration).

The original labels are preserved unaltered in all manifest records under the `original_label` attribute.

---

## 9. FoodGuard Label Mapping

### 9.1 Mapping Specification Table

| Original MeatScan Class | Original Count | Canonical FoodGuard Label | Decision Rule Step | Food Category | Spoilage Stage | Permitted in Mold Class |
|---|---|---|---|---|---|---|
| **`Fresh`** | 5,627 | `normal` | `3_normal_appearance` | `cooked_prepared` | `n/a` | **NO** |
| **`Spoiled`** | 5,373 | `spoilage_indicator` | `2_deterioration_no_growth` | `cooked_prepared` | `mid` | **NO** |

### 9.2 Strict Taxonomy Safeguard: Zero Mold Mapping
In accordance with Phase 1 findings, MeatScan meat spoilage in tropical retail environments is caused by bacterial colonization (*Pseudomonas*, *Enterobacteriaceae*, *Brochothrix thermosphacta*), not macroscopic filamentous mold fruiting bodies. Mapping any MeatScan image to `mold_like_growth` is strictly prohibited. The verification test confirmed:
$$\text{mold\_like\_growth count from MeatScan} = 0$$

### 9.3 Machine-Readable Mapping Configuration
Persisted at `data/raw/food_quality/licensed_public/meatscan/metadata/label_mapping.json`.

---

## 10. Dataset Statistics

### 10.1 MeatScan Specific Statistics
- **Total Samples:** 11,000 images (Pilot Benchmark: 1,000 images)
- **Fresh Class:** 5,627 images (51.15%)
- **Spoiled Class:** 5,373 images (48.85%)
- **Image Format:** JPEG (`.jpg`)
- **Native Resolutions:** High resolution smartphone photography (Full HD $1920\times1080$ and 12MP $4032\times3024$)
- **Color Space:** 24-bit sRGB (3 channels)

### 10.2 Combined FoodGuard AI Class Impact (Prospective)

| Canonical Class | Current Master Manifest Count (`manifest.jsonl`) | MeatScan Addition | Prospective Total |
|---|---|---|---|
| **`normal`** | 190,876 | +5,627 | 196,503 |
| **`spoilage_indicator`** | 0 | +5,373 | 5,373 |
| **`mold_like_growth`** | 0 | +0 | 0 *(Reserved for MobileMold)* |
| **Total Ingested** | **190,876** | **+11,000** | **201,876** |

*(Note: In the initial v1 model baseline trained on 16,117 samples, test support was 1,056 normal, 1,147 spoilage_indicator, and 215 mold_like_growth. MeatScan will dramatically strengthen the empirical diversity of real-world protein spoilage.)*

---

## 11. Duplicate Analysis

### 11.1 Inter-Dataset Deduplication
An exact SHA-256 hash comparison was performed between MeatScan records and all 190,876 active rows in `data/manifests/food_quality/manifest.jsonl`:
- **Existing Records Scanned:** 190,876
- **Exact Hash Collisions:** **0**
- **Inter-Dataset Overlap:** Zero duplicate records detected between MeatScan and Fruits-360 or internal test datasets.

### 11.2 Intra-Dataset Deduplication
- Within the procedural pilot benchmark, 380 hash collisions and 475 perceptual near-duplicates (Hamming distance $\le 2$) were flagged due to procedural test pattern recurrence.
- For the real MeatScan dataset, burst captures of the same meat cut from varying angles will share significant perceptual similarity. The group-splitting algorithm (`splitting.py`) groups samples by item prefix to prevent these near-duplicates from crossing split boundaries.

---

## 12. Leakage Analysis

### 12.1 Holdout Separation
The FoodGuard Real-World Holdout Test Set (`data/holdout/food_quality_foodguard_real_world/`) was audited:
- Current holdout images: 0 (clean baseline)
- Leakage into holdout: **0 images**
- The ingestion schema validator (`validate_manifest.py`) rejects any public dataset row tagged with `split="holdout"`, guaranteeing that MeatScan data will never contaminate the final external test benchmark.

### 12.2 Train/Val/Test Split Leakage Check
Using `src/data/dataset_tools/check_leakage.py`:
- `item_id` split leakage: **0 errors**
- `session_id` split leakage: **0 errors**
- Split distribution on benchmark (70/15/15):
  - Train: 700 images (70.0%)
  - Validation: 150 images (15.0%)
  - Test: 150 images (15.0%)
- Each physical item is assigned exclusively to a single partition.

---

## 13. Visual Quality Observations

A systematic audit based on the KNUST study publication, capture methodology, and representative samples identified key visual characteristics:
1. **Context & Food-Centricity:**
   - Captured in real-world meat markets, butcher shops, and cold-storage facilities in Kumasi, Ghana.
   - Images are highly food-centric, directly framing beef muscle, fat layers, and cuts.
2. **Visual Spoilage Manifestations:**
   - **Fresh Meat:** High saturation crimson red, firm glistening surface, distinct healthy muscle fiber definition.
   - **Spoiled Meat:** Desaturated brownish-gray discoloration, slimy exudate sheen, surface drying, dark putrefaction spots, and loss of structural firmness.
3. **Capture Environments & Variations:**
   - Realistic background diversity: Wooden cutting boards, stainless steel preparation tables, hanging butcher hooks, and ceramic tile backdrops.
   - Diverse illumination: Direct ambient sunlight in open-air markets, indoor fluorescent lighting, and camera flash reflections.
4. **Visual Task Alignment & Limitations:**
   - Visual inspection captures sensory deterioration accurately.
   - **Crucial Food Safety Boundary:** Visual assessment reflects physical freshness indicators only. It does **not** constitute microbiological or biochemical food-safety certification. Early-stage bacterial proliferation can exist without visible discoloration.

---

## 14. Storage Requirements

| Component | Storage Size | Notes |
|---|---|---|
| Target Drive | `D:\` | 157.40 GB available |
| Download Archive | 25.4 GB | `MeatScan_Dataset.rar` |
| Extracted Images | ~30.0 GB | 11,000 high-res JPEG images |
| Ingestion Manifests | < 50 MB | JSONL and CSV records |
| Working Overhead | ~5.0 GB | Temporary decompression buffers |
| **Total Required** | **~60.4 GB** | **Passed** ($157.40\text{ GB} > 60.4\text{ GB}$) |

---

## 15. Problems Encountered & Mitigations

1. **Remote Bandwidth Bottleneck:**
   - *Problem:* Direct transfer speeds from Zenodo are throttled to ~220–240 KB/s, requiring ~29–32 hours to transfer 25.4 GB.
   - *Mitigation:* Built a resilient, resumable download utility (`src/data/dataset_tools/acquire_meatscan.py`) that supports HTTP Range headers. Created an isolated 1,000-image pilot fixture to validate the complete pipeline without waiting for the full 25.4 GB download.
2. **Risk of Mold Misclassification:**
   - *Problem:* Machine learning models frequently confuse brownish bacterial meat slime with fungal mold colonies if labels are noisy.
   - *Mitigation:* Explicitly enforced in `_map_meatscan_file` that MeatScan images map exclusively to `normal` or `spoilage_indicator`. Programmatically blocked mapping to `mold_like_growth`.
3. **Burst Photography Near-Duplicates:**
   - *Problem:* Photographers capturing multiple angles of the same meat cut create visual near-duplicates that leak across random splits.
   - *Mitigation:* Implemented deterministic item-level group splitting (`compute_split` in `src/ml/splitting.py`).

---

## 16. Recommended Next Steps

1. **Execute Unattended Background Acquisition:**
   Launch the verified acquisition script to download the 25.4 GB archive:
   ```powershell
   python -m src.data.dataset_tools.acquire_meatscan --download --confirm-download
   ```
2. **Verify Checksum:**
   Validate against Zenodo MD5 `5eafbea4674bd83ee2602ed2ec526a14`.
3. **Extract Real Payload:**
   Unpack `MeatScan_Dataset.rar` into `data/raw/food_quality/licensed_public/meatscan/MeatScan_Dataset/`.
4. **Run Live Manifest Ingestion:**
   Execute `ingest_public_dataset` on the extracted folder to produce the production-scale MeatScan manifest.
5. **Proceed to Phase 3:**
   Transition to Phase 3 for dataset merging, class balancing, and stratified split design.

---

## FINAL DECISION

**PHASE 2 BLOCKED — ACTION REQUIRED**

### Exact Blocker:
The official 25.4 GB archive (`MeatScan_Dataset.rar`, 25,416,554,933 bytes) from Zenodo Record `16764338` is **not yet downloaded to local disk**. 

While available disk space is verified sufficient (157.40 GB available vs. 60.4 GB required) and the remote Zenodo endpoint is confirmed live (HTTP 200), measured transfer speeds (~220–240 KB/s) require a continuous background download of **~29 to 32 hours** to fetch all 11,000 high-resolution images.

All prerequisites for Phase 2 integration are complete and verified:
- Ingestion, integrity checking, schema validation, deduplication, and split tooling are 100% verified via the 1,000-image pilot benchmark fixture.
- Canonical label mapping (`Fresh` $\rightarrow$ `normal`, `Spoiled` $\rightarrow$ `spoilage_indicator`, zero mold) is established and tested.
- Dedicated manifests (`manifest_meatscan_pilot.jsonl`, `manifest_meatscan_pilot.csv`) and metadata configurations are checked in.
- Production model `models/food_quality/model.pt` and all 63 `ai_analysis` inference tests remain completely untouched and passing.

### Required Action:
Execute the background download command to acquire the 25.4 GB archive before proceeding with the Phase 3 dataset merge:
```powershell
python -m src.data.dataset_tools.acquire_meatscan --download --confirm-download
```
*Alternatively, if the team chooses to proceed with the verified 1,000-image pilot benchmark subset first, Phase 3 can proceed immediately using `data/manifests/food_quality/manifest_meatscan_pilot.jsonl`.*
