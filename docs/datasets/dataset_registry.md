# FoodGuard AI — Dataset Registry

> **Status:** Planning / Pre-acquisition phase.
> No datasets have been downloaded. No models have been trained.
> This registry documents intended sources, access status, and planned usage.

---

## Registry Format

Each entry records:

| Field | Description |
|---|---|
| `name` | Human-readable dataset name |
| `type` | `image_recognition` · `image_quality` · `reference_knowledge` |
| `purpose` | What this dataset is used for in FoodGuard AI |
| `source` | Organisation / project that owns or distributes it |
| `source_url` | Canonical URL |
| `access_status` | `public_download` · `contact_required` · `custom_collection` · `official_reference` |
| `license_status` | License identifier or description |
| `local_path` | Path relative to project root after download |
| `model_usage` | Which FoodGuard AI model will use this data |
| `notes` | Limitations, caveats, open questions |

---

## Dataset A — Food-101

| Field | Value |
|---|---|
| **name** | Food-101 |
| **type** | `image_recognition` |
| **purpose** | General food-category recognition baseline. Provides a broad visual vocabulary of 101 food categories including several Indian dishes. Used for transfer learning / feature extraction in the food recognition pipeline. |
| **source** | ETH Zurich Computer Vision Lab (Bossard et al., 2014) |
| **source_url** | https://vision.ee.ethz.ch/datasets.html |
| **access_status** | `public_download` — available from the ETH Zurich dataset page. |
| **license_status** | Non-commercial research use. Verify current terms at source URL before use. |
| **local_path** | `data/raw/food_recognition/food101/` |
| **model_usage** | Food recognition pre-training / transfer learning backbone only |
| **notes** | Food-101 is a **food-recognition dataset only**. It is NOT a food-safety or food-quality dataset. It cannot be used to classify contamination, foreign objects, spoilage, or hygiene concerns. Presence of a food category in Food-101 does not imply any safety claim. 101 categories, ~101,000 images. |

---

## Dataset B — Indian Food Image Dataset

| Field | Value |
|---|---|
| **name** | Indian Food Image Dataset |
| **type** | `image_recognition` |
| **purpose** | Indian food domain adaptation. Supplements Food-101 with Indian-specific dishes to improve recognition accuracy for the Indian market. |
| **source** | DataCluster Labs |
| **source_url** | https://github.com/datacluster-labs/Indian-Food-Image-Dataset |
| **access_status** | `contact_required` — the public GitHub repository provides sample content and states that the full dataset is available by contacting the provider. The full dataset is NOT freely downloadable from the repository. |
| **license_status** | To be confirmed with DataCluster Labs. Do not use without explicit written permission. |
| **local_path** | `data/raw/food_recognition/indian_food/` |
| **model_usage** | Food recognition domain adaptation for Indian cuisine |
| **notes** | Only samples are available publicly. Full access requires contacting DataCluster Labs. Do not infer class counts or structure until access is obtained and dataset is validated locally. |

---

## Dataset C — FoodGuard Quality Dataset

| Field | Value |
|---|---|
| **name** | FoodGuard Quality Dataset |
| **type** | `image_quality` |
| **purpose** | Core FoodGuard visual-quality model training. Classifies images into food safety concern categories: foreign_object, pest_insect, mold_like_growth, spoilage_indicator, undercooked_appearance, burnt_overcooked, packaging_issue, hygiene_indicator, normal, uncertain. |
| **source** | Custom — FoodGuard AI team curation |
| **source_url** | N/A (internal) |
| **access_status** | `custom_collection` — this dataset does not exist yet. It must be assembled through: (a) properly licensed public images, (b) consented team/pilot images, (c) appropriately governed user submissions under future consent and privacy controls. |
| **license_status** | Internal — all images must have documented acquisition rights. User-submitted images require explicit consent before inclusion. |
| **local_path** | `data/raw/food_quality/` |
| **model_usage** | FoodGuard visual quality classifier (primary safety signal model) |
| **notes** | This dataset is NOT fabricated, simulated, or currently existing. It must be built with careful data governance. Labels must be reviewable. Uncertain cases must be preserved. A single image cannot constitute scientific food-safety certification. See `quality_dataset_plan.md`. |

---

## Dataset D — FSSAI Knowledge Base

| Field | Value |
|---|---|
| **name** | FSSAI Knowledge Base |
| **type** | `reference_knowledge` |
| **purpose** | Regulatory reference layer. Provides official Indian food safety standards, maximum residue limits, food additive regulations, and labelling requirements. Used to inform risk scoring context and reviewer guidance — NOT as image-training data. |
| **source** | Food Safety and Standards Authority of India (FSSAI) |
| **source_url** | https://www.fssai.gov.in/ |
| **access_status** | `official_reference` — regulatory documents are publicly available on the FSSAI website. Only official publications should be referenced. Do not scrape unofficial blogs or secondary sources. |
| **license_status** | Official government documents. Short structured excerpts and metadata may be stored as references. Do not reproduce large copyrighted legal texts in source code. |
| **local_path** | `data/raw/fssai/` |
| **model_usage** | Regulatory context layer — risk scoring guidance, reviewer reference material |
| **notes** | FSSAI is a knowledge reference, not a training dataset. See `fssai_sources.md`. |
