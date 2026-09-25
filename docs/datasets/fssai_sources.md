# FoodGuard AI — FSSAI Knowledge Base Sources

> FSSAI documents are used as a **regulatory reference layer** only.
> They are NOT image-training data.
> Short structured excerpts and metadata may be stored.
> Do NOT reproduce large sections of legal text in source code.

---

## About FSSAI

The Food Safety and Standards Authority of India (FSSAI) is the apex body
for food safety regulation in India. It operates under the Ministry of Health
and Family Welfare, Government of India.

Official website: https://www.fssai.gov.in/

FSSAI establishes food safety standards, regulations, and guidelines under
the Food Safety and Standards Act, 2006 (FSS Act).

---

## Role in FoodGuard AI

FSSAI references inform:

1. **Risk scoring context** — mapping visual concern labels to regulatory categories
2. **Reviewer guidance** — helping reviewers understand what regulatory standards apply
3. **Consumer-facing messaging** — ensuring FoodGuard language is consistent with official guidance
4. **Escalation context** — understanding what types of concerns may have regulatory significance

FSSAI references do NOT:
- Train the visual image classifier
- Replace laboratory analysis
- Constitute legal advice

---

## Reference Record Schema

Each FSSAI reference record follows this schema:

```json
{
    "source_title": "Full official title of the regulation or document",
    "source_date": "Year or date of the regulation",
    "source_version": "Version or amendment status (e.g. 'as amended 2022')",
    "official_url": "Direct URL on fssai.gov.in",
    "section": "Relevant section or schedule reference",
    "content": "Short structured excerpt (max ~200 words)",
    "retrieved_at": "ISO 8601 date when this was retrieved from the official source",
    "notes": "Optional notes about applicability or limitations"
}
```

---

## Priority Reference Documents

The following FSSAI publications are planned for inclusion as references
once the knowledge base collection phase begins:

| Document | Relevance |
|---|---|
| Food Safety and Standards Act, 2006 | Foundational legislation |
| FSS (Contaminants, Toxins and Residues) Regulations, 2011 | Contaminant limits |
| FSS (Food Products Standards and Food Additives) Regulations, 2011 | Product standards |
| FSS (Packaging and Labelling) Regulations, 2011 | Packaging requirements |
| FSS (Prohibition and Restrictions on Sales) Regulations, 2011 | Prohibited substances |
| FSSAI Guidance Notes on Food Safety Management Systems | FSMS guidance |
| FSSAI Swachh Bharat / food hygiene circulars | Hygiene standards |

---

## Collection Rules

1. Only retrieve from `fssai.gov.in` or official government portals
2. Record `retrieved_at` date for every entry
3. Do not reproduce the full text of any regulation — store structured excerpts
4. Note the version/amendment status since regulations are updated periodically
5. Do not use unofficial interpretations, blogs, or secondary sources

---

## Storage Location

Reference records will be stored in:
```
data/raw/fssai/
```

In JSON Lines format (`.jsonl`) — one record per line.
These files will be excluded from Git (see `.gitignore`).
Only the schema documentation (this file) is committed.

---

## Important Legal Note

FSSAI regulatory documents are official government publications.
Short excerpts stored for technical reference purposes are used under the
principle of fair dealing for research/public interest.
This does not constitute legal advice and FoodGuard AI is not a
regulatory compliance tool.
