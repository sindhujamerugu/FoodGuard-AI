# FoodGuard AI — Dataset Sources

> This document records the verified canonical sources for each dataset.
> No dataset has been downloaded. No model has been trained.

---

## Dataset A — Food-101

### Citation

```
Bossard, L., Guillaumin, M., & Van Gool, L. (2014).
Food-101 – Mining Discriminative Components with Random Forests.
European Conference on Computer Vision (ECCV).
```

### Canonical Source

- Official ETH Zurich dataset page: https://vision.ee.ethz.ch/datasets.html
- The download link from the ETH page is the authoritative source.
- Do NOT download from third-party mirrors without verifying integrity.

### Verified Properties (from official description)

- 101 food categories
- 101,000 images total (1,000 per category)
- Images collected from foodspotting.com
- Ground truth labels were manually cleaned
- 250 test images per class (manually reviewed), 750 training images per class

### What Food-101 is NOT

- It is NOT a food-safety dataset
- It does NOT classify contamination, foreign objects, spoilage, or hygiene
- It does NOT make any food-quality safety claim
- It should NOT be used to assess whether food is safe to eat

### Access

Download is available from the official ETH Zurich page linked above.
Verify the current license terms before downloading.

### Integrity Verification

After download, validate the archive against the published checksum if provided.
The validation utility `src/data/validation/food101_validator.py` will
confirm local directory structure after extraction.

---

## Dataset B — Indian Food Image Dataset

### Source

- Public GitHub repository: https://github.com/datacluster-labs/Indian-Food-Image-Dataset
- Repository owner: DataCluster Labs

### Access Status

The public repository provides **sample images only**.
The full dataset is available by **contacting DataCluster Labs directly**.

Do NOT:
- Assume the full dataset is freely downloadable
- Download from unauthorised mirrors
- Use sample images as a representative full dataset

### Steps Required Before Use

1. Contact DataCluster Labs through the contact information on their GitHub/website
2. Obtain written permission or a data access agreement
3. Confirm license terms and any usage restrictions
4. Download only through the verified/authorised method they provide
5. Validate the downloaded dataset against the structure described at that time

### What This Dataset Provides

- Images of Indian food dishes
- Useful for domain adaptation (supplementing Food-101 for the Indian market)
- Class structure to be confirmed after access is obtained

---

## Dataset C — FoodGuard Quality Dataset

### Source

**Custom — FoodGuard AI team curation. This dataset does not yet exist.**

It must be assembled from:

1. **Properly licensed public images** — e.g., Creative Commons–licensed images of
   food quality concerns. Each image must have a verified license.

2. **Consented team/pilot images** — images captured by the FoodGuard team or
   willing pilot participants. Written consent must be obtained and documented.

3. **Appropriately governed user submissions** — in the future, real user-submitted
   food report images may enter the dataset only under:
   - Explicit informed consent from the user
   - Clear documentation of purpose and usage rights
   - Privacy-preserving handling (no personal identifiers in training data)
   - Documented consent withdrawal process

### What This Dataset Is NOT

- It is NOT currently fabricated or simulated
- It does NOT contain synthetic AI-generated images (at this stage)
- It does NOT claim scientific food-safety certification capability

---

## Dataset D — FSSAI Knowledge Base

### Source

Food Safety and Standards Authority of India (FSSAI)
Official website: https://www.fssai.gov.in/

### Document Types Available

- Food Safety and Standards Act, 2006
- Food Safety and Standards Regulations (various)
- Guidance documents
- Notifications and circulars
- Maximum Residue Limits (MRLs)
- Food product standards

### Usage in FoodGuard AI

FSSAI documents provide **regulatory context** for:
- Risk scoring guidance (what visible concerns map to which regulatory categories)
- Reviewer reference material
- Consumer-facing guidance language

### Important Restrictions

- Do NOT reproduce large sections of FSSAI legal text in source code
- Store only structured metadata, references, and short excerpts
- Always include the official URL and retrieval date
- Treat as a living reference — regulations may be updated

See `fssai_sources.md` for the structured reference schema.
