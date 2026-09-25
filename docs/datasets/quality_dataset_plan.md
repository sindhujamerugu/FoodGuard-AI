# FoodGuard AI — Quality Dataset Plan

> **Status: PLANNED — Dataset does not yet exist.**
> This document defines the specification, schema, governance rules,
> and label taxonomy for the FoodGuard Quality Dataset.

---

## Purpose

The FoodGuard Quality Dataset is the primary training source for the
FoodGuard visual-quality classifier — the model that produces preliminary
visual assessments of food safety concerns from customer-submitted images.

**Important disclaimer:**
A visual classification model operating on a single image cannot constitute
scientific food-safety certification, proof of contamination, or evidence of
any regulatory violation. Results are preliminary visual indicators that
require human review.

---

## Label Taxonomy

All images must be assigned exactly one of the following labels:

| Label | Description |
|---|---|
| `foreign_object` | Visible non-food item embedded in or on food (hair, plastic, metal, insect parts, etc.) |
| `pest_insect` | Visible insect or insect-related material in or near food |
| `mold_like_growth` | Visible growth that may be mold, fungus, or similar discolouration |
| `spoilage_indicator` | Visible signs of spoilage: unusual colour, texture, liquefaction, or odour indicators visible in image |
| `undercooked_appearance` | Food that visually appears insufficiently cooked |
| `burnt_overcooked` | Food that visually appears burnt, charred, or severely overcooked |
| `packaging_issue` | Damaged, open, contaminated, or incorrectly labelled packaging |
| `hygiene_indicator` | Visible environmental hygiene concern (surface, utensil, environment) |
| `normal` | No visible food-quality concern detected |
| `uncertain` | Image is ambiguous, poor quality, or the visible concern is unclear |

### Label Rules

- Each image gets exactly one primary label
- Annotators may add notes for borderline cases
- `uncertain` must be used honestly — do not force a false classification
- Labels must be reviewed by at least one additional annotator where possible
- Annotation disagreements must be recorded, not silently resolved

---

## Record Schema

Each row in the dataset manifest (JSON Lines format recommended):

| Field | Type | Required | Description |
|---|---|---|---|
| `image_path` | string | ✅ | Relative path from `data/raw/food_quality/` |
| `label` | string | ✅ | One of the 10 defined labels above |
| `source` | string | ✅ | `team_capture` · `licensed_public` · `user_submission` · `pilot` |
| `consent_status` | string | ✅ | `consented` · `licensed` · `public_domain` · `pending` |
| `license` | string | ✅ | License identifier (e.g. `CC BY 4.0`, `internal_consent`, `unknown`) |
| `collection_date` | string (ISO 8601) | ✅ | Date image was collected (YYYY-MM-DD) |
| `annotator_id` | string | ✅ | Anonymised annotator identifier (e.g. `ann_001`) |
| `annotation_notes` | string | — | Free-text notes from annotator (optional) |
| `split` | string | ✅ | `train` · `validation` · `test` |

### Example record (for illustration — NOT real data)

```json
{
    "image_path": "team_captures/sample_001.jpg",
    "label": "foreign_object",
    "source": "team_capture",
    "consent_status": "consented",
    "license": "internal_consent",
    "collection_date": "2026-01-15",
    "annotator_id": "ann_001",
    "annotation_notes": "Clear plastic shard visible in curry.",
    "split": "train"
}
```

---

## Data Governance

### Acquisition Rules

1. **Licensed public images** — source URL, license, and retrieval date must be documented
2. **Team/pilot images** — written consent form must be signed and stored securely (not in Git)
3. **User submissions** — only images submitted through FoodGuard with explicit consent for dataset use may enter training data; consent UI must be implemented before any user image is used
4. **No fabricated images** — synthetic or AI-generated images must not be used without explicit documentation and a separate governance review

### Privacy Rules

- No personal identifiers (faces, names, contact details) in training images
- Location data must be stripped from image EXIF metadata before storage
- Original FoodReport images are NOT automatically included in the training dataset
- A separate consent mechanism must exist for training-data inclusion

### Label Quality Rules

- All labels must be human-reviewed
- Borderline cases should be `uncertain`, not forced into another class
- Disagreements between annotators must be documented
- Labels must be re-reviewable — original images must be preserved

### Reproducibility Rules

- Train/validation/test splits must be fixed and documented
- The random seed used for splitting must be recorded
- Split assignment must be per-image, not per-class-proportion only

---

## Minimum Viable Dataset

For initial model development, plan for:

| Class | Minimum images (train) | Notes |
|---|---|---|
| `foreign_object` | 100+ | High priority |
| `pest_insect` | 100+ | High priority |
| `mold_like_growth` | 100+ | |
| `spoilage_indicator` | 100+ | |
| `undercooked_appearance` | 100+ | |
| `burnt_overcooked` | 100+ | |
| `packaging_issue` | 100+ | |
| `hygiene_indicator` | 100+ | |
| `normal` | 200+ | Needs overrepresentation |
| `uncertain` | 50+ | Expected to be small |

These are minimums subject to revision based on actual data availability.

---

## What This Dataset Will NOT Do

- It will NOT constitute scientific food-safety certification
- It will NOT replace laboratory testing or regulatory inspection
- It will NOT prove or disprove that a specific restaurant is guilty of any violation
- It will NOT claim to detect contamination at a microbiological level from a photograph
