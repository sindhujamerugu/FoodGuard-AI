# 🛡️ FoodGuard AI

**AI-powered food safety reporting and complaint management platform for the Indian market.**

Customers photograph food quality issues at restaurants, receive a preliminary AI visual assessment, and escalate through a structured formal complaint workflow — all served in 6 Indian languages.

> ⚠️ **AI Disclaimer:** All AI results are a *preliminary visual assessment only*. They do **not** constitute scientific food-safety certification, proof of contamination, evidence of any regulatory violation, or medical/health advice.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Features Completed](#features-completed)
5. [Django Apps](#django-apps)
6. [API Reference](#api-reference)
7. [AI / ML Pipeline](#ai--ml-pipeline)
8. [Frontend](#frontend)
9. [Data Pipeline](#data-pipeline)
10. [Getting Started (Local Dev)](#getting-started-local-dev)
11. [Environment Variables](#environment-variables)
12. [Deployment](#deployment)
13. [Testing](#testing)
14. [Project Structure](#project-structure)
15. [Known Limitations & Roadmap](#known-limitations--roadmap)

---

## Project Overview

FoodGuard AI is a full-stack platform that enables:

- **Customers** to submit food quality reports with photo evidence, receive an AI visual assessment (normal / spoilage indicator / mold-like growth), file formal complaints, and track resolution.
- **Restaurant owners** to view and respond to complaints against their establishment.
- **Reviewers / Admins** to manage the full complaint lifecycle, escalate cases, and view aggregated analytics.

The platform is designed for the Indian market with support for **English, Telugu, Hindi, Tamil, Kannada, and Marathi**.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Django 5.2.17 + Django REST Framework 3.17.1 |
| Auth | SimpleJWT 5.5.1 (30-min access / 7-day refresh, rotation + blacklist) |
| Database | PostgreSQL 16 |
| Static files | WhiteNoise 6.11.0 |
| WSGI | Gunicorn 23.0.0 |
| API Docs | drf-spectacular 0.28.0 (OpenAPI / Swagger / ReDoc) |
| Image processing | Pillow 11.3.0 |
| CORS | django-cors-headers 4.9.0 |

### AI / ML
| Layer | Technology |
|---|---|
| Model architecture | MobileNetV3-Small (torchvision) |
| Framework | PyTorch 2.14.0 (CPU) |
| Classes | `normal`, `spoilage_indicator`, `mold_like_growth` |
| Confidence threshold | 0.70 (configurable via env) |
| Fallback | `HUMAN_REVIEW` result when model absent or confidence low |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6.0 |
| Build | Vite 8.3 |
| Styling | Tailwind CSS 4.3 |
| State / data | TanStack React Query 5 |
| Forms | React Hook Form + Zod |
| Routing | React Router 7 |
| HTTP | Axios |
| Testing | Vitest 5 + React Testing Library |
| i18n | 6 language dictionaries, 288 keys each |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React SPA)                │
│   Vite · React 19 · TypeScript · Tailwind · 6 languages │
│                  Deployed on Vercel                      │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JWT)
┌──────────────────────▼──────────────────────────────────┐
│               Django REST Framework Backend              │
│  9 Django apps · OpenAPI docs · WhiteNoise static files  │
│                  Deployed on Render                      │
└───────┬───────────────────────────────┬─────────────────┘
        │                               │
┌───────▼───────┐          ┌────────────▼────────────┐
│ PostgreSQL 16 │          │  AI Inference Engine     │
│  (Render DB)  │          │  MobileNetV3-Small       │
│               │          │  models/food_quality/    │
└───────────────┘          └──────────────────────────┘
```

### Service-Layer Pattern
Every Django app with business logic uses a dedicated `services.py`. Views are thin wrappers that call services — they contain zero business logic. Key patterns:
- **Server-side ownership derivation**: `customer`, `restaurant`, `original_language` are always derived from `request.user` — never accepted from client payload (prevents horizontal privilege escalation).
- **Immutable fields**: `original_language` on Complaint/Escalation is set at creation and never overwritten.
- **Mock fallback**: AI service automatically falls back to a mock result (`HUMAN_REVIEW`) when `model.pt` is absent — the entire API works without PyTorch installed.

---

## Features Completed

### ✅ Authentication & User Management
- Custom `User` model with email-based login (no username field)
- 4 roles: `CUSTOMER`, `RESTAURANT_USER`, `REVIEWER`, `ADMIN`
- JWT with access/refresh rotation and blacklisting
- Rate-limited auth endpoints (10 req/min for anon)
- Profile update (first/last name, phone, preferred language)
- Bootstrap admin management command for zero-touch deploy

### ✅ Restaurant Management
- Full CRUD for restaurant listings
- Claim workflow: `UNCLAIMED → PENDING → CLAIMED`
- Verification by REVIEWER/ADMIN (`is_verified`)
- Seeded dev data via management command

### ✅ Food Safety Reports (Core Workflow)
- Report creation with image upload (JPEG/PNG, ≤5 MB)
- 4-stage image validation: extension → MIME type → size → Pillow `verify()` (corruption/spoofing guard)
- State machine: `DRAFT → SUBMITTED → UNDER_REVIEW → RESOLVED / CLOSED`
- UUID-based image filenames for unguessable URLs
- Priority system: `LOW / MEDIUM / HIGH / CRITICAL`

### ✅ AI Visual Assessment
- MobileNetV3-Small trained on 3-class food quality dataset
- Thread-safe singleton model loader (double-checked locking)
- Lazy PyTorch import — Django starts without torch installed
- Confidence threshold (default 0.70) → forced `HUMAN_REVIEW` below it
- Risk mapping: `normal → LOW`, `spoilage_indicator → HIGH`, `mold_like_growth → HIGH`
- All errors caught internally — always returns a safe result to callers
- Complete mock fallback when model artifacts absent

### ✅ Formal Complaints
- One complaint per food report (DB-enforced unique constraint)
- Can only be filed against a `SUBMITTED` report
- Categories: Food Quality, Spoilage, Foreign Object, Hygiene, Taste/Odor, Other
- Immutable `original_language` (derived from user's preferred language at submission)
- Role-based workflow: CUSTOMER creates; REVIEWER/ADMIN manages status/priority/resolution

### ✅ Escalation System
- 3-tier internal escalation (Level 1/2/3)
- One active escalation per complaint at a time
- REVIEWER/ADMIN only — not tied to any external regulatory body
- Full lifecycle: `PENDING → IN_REVIEW → RESOLVED → CLOSED`

### ✅ Feedback System
- Customer satisfaction ratings (1–5 stars)
- One feedback per complaint (DB-enforced unique)
- Only on `RESOLVED` or `CLOSED` complaints

### ✅ In-App Notifications
- 7 event types: report submitted/status changed, AI analysis completed, complaint submitted/status changed, escalation created/updated
- Automatic notification to all REVIEWER/ADMIN users on report submission
- Polling-based (no WebSocket/SSE required)
- Composite DB index on `(recipient, is_read)` for efficient unread queries

### ✅ Analytics Dashboard
- REVIEWER/ADMIN only
- Direct DB `COUNT` aggregations — no Python-side loading, no fabricated numbers
- Reports by status/priority, complaints by status/priority, AI results by risk/status, restaurants pending verification

### ✅ Translation Infrastructure
- 6-language support: English, Telugu, Hindi, Tamil, Kannada, Marathi
- `TranslationService` facade with pluggable provider pattern
- Current provider: `NullTranslationProvider` (returns `"unavailable"`) — seam ready for Google/Azure/LibreTranslate
- User content always stored as-entered (never auto-overwritten)
- Static string catalog for AI/notification messages in en/te/hi

### ✅ Frontend SPA
- 30+ routes with role-based access guards
- 60+ components organized by domain
- AI analysis result cards with confidence bar and mandatory disclaimer
- Image uploader with client-side preview
- 6 complete language dictionaries (288 keys each), language preference persisted to localStorage and synced to backend profile
- Full pages: Customer dashboard, Reviewer dashboard, Restaurant management, Admin dashboard, Landing, Auth

### ✅ ML Training Pipeline
- Full training CLI: `python -m src.ml.train --manifest ... --data-root ... --output-dir ...`
- Grouped stratified split (by `item_id` — prevents item-level data leakage between train/val/test)
- Early stopping with configurable patience
- Optional freeze-then-fine-tune schedule (first N epochs freeze backbone)
- Per-epoch checkpointing, full evaluation with per-class precision/recall/F1
- Artifacts written: `model.pt`, `label_map.json`, `train_config.json`
- 72 ML pipeline unit tests (no DB required)

### ✅ Infrastructure & DevOps
- Docker Compose for local dev (PostgreSQL 16, Django backend)
- Dockerfile (Python 3.12-slim, non-root user, health check via `/healthz/`)
- Render Blueprint (`render.yaml`) for one-click backend deploy
- Vercel config (`frontend/vercel.json`) for SPA routing
- OpenAPI schema auto-generated at `/api/schema/` with Swagger UI + ReDoc
- Health check endpoint `/healthz/`
- Security hardening in production: SSL redirect, HSTS, secure cookies, content-type nosniff
- WhiteNoise for static files (no separate static server needed)

---

## Django Apps

| App | Purpose |
|---|---|
| `users` | Custom User model, JWT auth (register/login/logout/profile/token-refresh) |
| `restaurants` | Restaurant CRUD, claim workflow, verification |
| `food_reports` | Core report model, image validation, DRAFT→SUBMITTED state machine |
| `ai_analysis` | MobileNetV3-Small inference, AIAnalysis model, mock fallback |
| `complaints` | Formal complaint workflow, role-based status lifecycle |
| `escalation` | 3-tier internal escalation |
| `feedback` | Customer satisfaction ratings on resolved complaints |
| `notifications` | In-app notifications for 7 event types |
| `analytics` | Read-only DB aggregation dashboard for REVIEWER/ADMIN |
| `translation` | Pluggable translation facade (currently NullProvider) |
| `config` | Django project settings, root URL routing, health check |

---

## API Reference

All endpoints are under `/api/v1/`. Authentication is JWT Bearer token unless marked public.

Interactive docs available at:
- **Swagger UI**: `GET /api/docs/`
- **ReDoc**: `GET /api/redoc/`
- **OpenAPI schema**: `GET /api/schema/`

### Auth — `/api/v1/auth/`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register/` | Public | Register new CUSTOMER account |
| POST | `/api/v1/auth/login/` | Public | Login, returns access + refresh tokens |
| POST | `/api/v1/auth/token/refresh/` | Public | Refresh access token |
| GET / PATCH | `/api/v1/auth/profile/` | JWT | View or update own profile |
| POST | `/api/v1/auth/logout/` | JWT | Blacklist refresh token |

### Restaurants — `/api/v1/restaurants/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/restaurants/` | JWT | List restaurants |
| POST | `/api/v1/restaurants/` | RESTAURANT_USER/ADMIN | Create restaurant |
| GET | `/api/v1/restaurants/<id>/` | JWT | Get restaurant detail |
| PATCH | `/api/v1/restaurants/<id>/` | Owner/ADMIN | Update restaurant |
| DELETE | `/api/v1/restaurants/<id>/` | Owner/ADMIN | Delete restaurant |

### Food Reports — `/api/v1/reports/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/reports/` | JWT | List reports (scoped by role) |
| POST | `/api/v1/reports/` | CUSTOMER | Create new report (DRAFT) |
| GET | `/api/v1/reports/<id>/` | Owner/REVIEWER/ADMIN | Get report detail |
| PATCH | `/api/v1/reports/<id>/` | Owner (DRAFT only) | Update report |
| DELETE | `/api/v1/reports/<id>/` | Owner (DRAFT only) | Delete report |
| POST | `/api/v1/reports/<id>/submit/` | Owner | Submit report (DRAFT → SUBMITTED) |

### AI Analysis — `/api/v1/reports/<id>/`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/reports/<id>/analyze/` | Owner/REVIEWER/ADMIN | Trigger AI visual assessment |
| GET | `/api/v1/reports/<id>/analysis/` | Owner/REVIEWER/ADMIN | Get AI analysis result |

### Complaints — `/api/v1/complaints/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/complaints/` | JWT | List complaints (scoped by role) |
| POST | `/api/v1/complaints/` | CUSTOMER | File complaint against SUBMITTED report |
| GET | `/api/v1/complaints/<id>/` | Owner/REVIEWER/ADMIN | Get complaint detail |
| PATCH | `/api/v1/complaints/<id>/` | REVIEWER/ADMIN | Update status/priority/resolution |

### Reviewer Activity — `/api/v1/complaints/activity/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/complaints/activity/` | REVIEWER/ADMIN | Read immutable reviewer audit trail with search and pagination |

### Escalations — `/api/v1/escalations/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/escalations/` | REVIEWER/ADMIN | List escalations |
| POST | `/api/v1/escalations/` | REVIEWER/ADMIN | Create escalation |
| GET | `/api/v1/escalations/<id>/` | REVIEWER/ADMIN | Get escalation detail |
| PATCH | `/api/v1/escalations/<id>/` | REVIEWER/ADMIN | Update escalation |

### Feedback — `/api/v1/feedback/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/feedback/` | JWT | List own feedback |
| POST | `/api/v1/feedback/` | CUSTOMER | Submit feedback (resolved complaint only) |
| GET | `/api/v1/feedback/<id>/` | Owner/REVIEWER/ADMIN | Get feedback detail |

### Notifications — `/api/v1/notifications/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/notifications/` | JWT | List own notifications |
| PATCH | `/api/v1/notifications/<id>/` | Owner | Mark as read |

### Analytics — `/api/v1/analytics/`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/analytics/summary/` | REVIEWER/ADMIN | Aggregated platform overview |

### Utility
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/healthz/` | Public | Container health check |
| GET | `/api/docs/` | Public | Swagger UI |
| GET | `/api/redoc/` | Public | ReDoc |

---

## AI / ML Pipeline

### Model
- **Architecture**: MobileNetV3-Small with replaced classifier head (`in_features → 3 classes`)
- **Model name / version**: `foodguard-quality-v1 / 1.0.0`
- **Labels**: `normal`, `spoilage_indicator`, `mold_like_growth`
- **Risk mapping**: `normal → LOW`, `spoilage_indicator / mold_like_growth → HIGH`
- **Confidence threshold**: 0.70 (below → forced `HUMAN_REVIEW`)

### Training Configuration (defaults)
```
img_size:              224
epochs:                20
batch_size:            32
learning_rate:         3e-4
optimizer:             AdamW
weight_decay:          1e-4
train / val / test:    70% / 15% / 15%
freeze_backbone_epochs: 3
early_stopping_patience: 5
pretrained_backbone:   True (ImageNet)
seed:                  42
```

### Training CLI
```bash
python -m src.ml.train \
  --manifest data/manifests/food_quality/manifest.jsonl \
  --data-root data \
  --output-dir models/food_quality \
  --img-size 224 \
  --epochs 20 \
  --batch-size 32 \
  --seed 42 \
  --device cpu
```

Artifacts written to `--output-dir`:
- `model.pt` — model weights + state_dict
- `label_map.json` — label ↔ index mapping
- `train_config.json` — all hyperparameters + metadata

### Current Status
> ⚠️ A **synthetic development model** exists (trained on geometric shapes) to verify the pipeline end-to-end. It does **not** classify real food images accurately. Real model training is blocked on completing the food quality dataset — see `docs/datasets/ACQUISITION_PLAN.md`.

The Render deploy blueprint auto-regenerates this synthetic model on every deploy so `model.pt` always exists and the service stays in real (not mock) mode.

### Inference Engine
The inference engine (`ai_analysis/inference.py`) is a **thread-safe singleton**:
1. Loads artifacts once via double-checked locking
2. Lazily imports PyTorch (Django starts without it)
3. Runs eval-mode forward pass → softmax → confidence check
4. Returns structured result dict — **never raises** (all exceptions → HUMAN_REVIEW fallback)

---

## Frontend

React 19 SPA deployed to Vercel. Connect to backend via `VITE_API_URL` env var.

### Pages by Role
| Role | Pages |
|---|---|
| Public | Landing, Login, Register |
| All authenticated | Profile |
| CUSTOMER | Dashboard, My Reports, Submit Report, Report Detail, My Complaints, File Complaint |
| RESTAURANT_USER | Restaurant Dashboard, Create/Edit Restaurant |
| REVIEWER | Reviewer Dashboard, All Reports, All Complaints, Escalations |
| ADMIN | Admin Dashboard, full access |

### Key Components
- `AIAnalysisCard` — displays AI result with confidence bar and mandatory disclaimer
- `ImageUploader` — drag-and-drop image upload with preview
- `ProtectedRoute / GuestRoute / RoleGuard` — JWT-based route protection
- `StatusBadge / PriorityBadge / RoleBadge` — visual status indicators
- `AppShell / Sidebar / Topbar` — main layout scaffold

### i18n
6 complete language dictionaries with 288 keys each:
- English (`en`), Telugu (`te`), Hindi (`hi`), Tamil (`ta`), Kannada (`kn`), Marathi (`mr`)

Language preference is persisted to `localStorage` and synced to the user's backend profile on change.

### Local Dev
```bash
cd frontend
npm install
npm run dev          # Vite dev server on http://localhost:3000
```

Set `VITE_API_URL=http://localhost:8001` in `frontend/.env.local`.

---

## Data Pipeline

### Manifest Format (JSONL)
Each line in a manifest file is a JSON object:
```json
{
  "image_path": "raw/food_quality/licensed_public/fruits_360/fresh_apple_001.jpg",
  "label": "normal",
  "item_id": "fruits360_apple_001",
  "split": "train",
  "source": "fruits_360"
}
```

### Data Directory Structure
```
data/
├── raw/food_quality/
│   ├── licensed_public/       # Public datasets (fruits_360, meatscan, mobilemold, swoyam2609)
│   ├── pilot_consented/       # Future pilot captures with consent
│   └── team_capture/          # Team-captured images
├── manifests/food_quality/    # JSONL manifest files
├── processed/food_quality/    # Preprocessed outputs
├── splits/food_quality/       # Split assignment files
├── holdout/                   # Real-world eval images (never used in training)
└── synthetic/                 # Synthetic geometric images for pipeline testing
```

### Leakage Prevention
`splitting.py` uses grouped stratified splitting by `item_id` — images of the same physical item always end up in the same split. `assert_no_item_leakage()` verifies this at runtime.

---

## Getting Started (Local Dev)

### Prerequisites
- Python 3.12+
- Docker Desktop (for PostgreSQL)
- Node.js 20+ (for frontend)
- Git

### 1. Clone & Set Up Python Environment
```bash
git clone <repo-url>
cd FoodGuard-AI

python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

### 2. Start PostgreSQL via Docker
```bash
docker-compose up -d foodguard_db_new
```
This starts PostgreSQL 16 on port **5434** with `foodguard_db / foodguard_user / foodguard_password`.

### 3. Configure Environment
```bash
copy .env.example .env
# Edit .env if needed — defaults work for local dev
```

### 4. Run Migrations & Bootstrap
```bash
python manage.py migrate
python manage.py bootstrap_admin    # creates admin account from .env vars
python manage.py create_dev_users   # optional: seeded test accounts
python manage.py seed_restaurants   # optional: sample restaurant data
```

### 5. Start the Dev Server
```bash
python manage.py runserver 8001
```

API available at `http://localhost:8001/api/v1/`  
Swagger UI at `http://localhost:8001/api/docs/`

### 6. (Optional) Install PyTorch for Real Inference
```bash
# See pip_torch_install.txt for exact commands
pip install torch==2.14.0 torchvision==0.29.0 --index-url https://download.pytorch.org/whl/cpu

# Train a synthetic model to verify the pipeline
python -m src.data.synthetic.generate_dataset
python -m src.ml.train \
  --manifest data/synthetic/food_quality/manifest.jsonl \
  --data-root data \
  --output-dir models/food_quality \
  --img-size 128 \
  --epochs 12 \
  --batch-size 16 \
  --seed 42 \
  --device cpu
```

### 7. Start the Frontend
```bash
cd frontend
npm install

# Create frontend/.env.local
echo VITE_API_URL=http://localhost:8001 > .env.local

npm run dev
```

Frontend at `http://localhost:3000`

---

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | *(required in prod)* | Django secret key — generate with `secrets.token_urlsafe(50)` |
| `DJANGO_DEBUG` | `True` | Set `False` in production |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` | Comma-separated allowed hosts |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | *(empty)* | Comma-separated origins (required in prod) |
| `DATABASE_URL` | *(empty)* | Full Postgres URL — overrides individual DB vars when set |
| `DATABASE_NAME` | `foodguard_db` | PostgreSQL database name |
| `DATABASE_USER` | `foodguard_user` | PostgreSQL username |
| `DATABASE_PASSWORD` | `foodguard_password` | PostgreSQL password |
| `DATABASE_HOST` | `127.0.0.1` | PostgreSQL host |
| `DATABASE_PORT` | `5434` | PostgreSQL port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated frontend origins |
| `FOOD_QUALITY_MODEL_DIR` | `models/food_quality/` | Path to trained model artifacts |
| `AI_CONFIDENCE_THRESHOLD` | `0.70` | Minimum confidence for non-HUMAN_REVIEW result |
| `TRANSLATION_PROVIDER` | `none` | Translation provider (currently only `none`) |
| `SERVE_MEDIA_VIA_DJANGO` | `True` | Whether Django serves `/media/` directly |
| `DJANGO_ADMIN_EMAIL` | *(env var)* | Bootstrap admin email |
| `DJANGO_ADMIN_PASSWORD` | *(env var)* | Bootstrap admin password |

---

## Deployment

### Backend → Render

Deploy with the included `render.yaml` Blueprint:
1. Push repo to GitHub/GitLab
2. In Render dashboard: **New + → Blueprint** → point at this repo
3. Set the following env vars in the Render dashboard:
   - `DJANGO_ALLOWED_HOSTS` — your `.onrender.com` hostname
   - `DJANGO_CSRF_TRUSTED_ORIGINS` — `https://<your-backend>.onrender.com,https://<your-frontend>.vercel.app`
   - `CORS_ALLOWED_ORIGINS` — `https://<your-frontend>.vercel.app`
   - `DJANGO_ADMIN_EMAIL`, `DJANGO_ADMIN_PASSWORD`

The blueprint automatically:
- Creates a managed PostgreSQL instance
- Installs PyTorch (CPU) from `requirements-render.txt`
- Trains a synthetic development model
- Runs `collectstatic`, `migrate`, `bootstrap_admin`
- Starts gunicorn with 3 workers

Full walkthrough in `docs/deployment/DEPLOYMENT.md`.

### Frontend → Vercel

```bash
cd frontend
# Set VITE_API_URL=https://<your-backend>.onrender.com in Vercel project settings
vercel --prod
```

`frontend/vercel.json` contains the SPA rewrite rule for client-side routing.

---

## Testing

### Backend Tests
```bash
# All tests
python manage.py test

# Specific app
python manage.py test ai_analysis
python manage.py test complaints
```

Approx **230 backend tests** across 10 apps.

### ML Pipeline Tests (no DB required)
```bash
python -m pytest src/ml/tests/ -v
```
**72 ML pipeline unit tests** covering training config, model architecture, splitting, manifest loading, artifacts, evaluation metrics.

### Dataset Tooling Tests
```bash
python -m pytest src/data/dataset_tools/tests/ -v
```
**40 dataset tooling tests**.

### Translation Tests
```bash
python manage.py test translation
```
**45 translation tests**.

### Frontend Tests
```bash
cd frontend
npm run test         # watch mode (Vitest)
npm run test -- --run # single run
```
**161 frontend tests** with React Testing Library.

---

## Project Structure

```
FoodGuard-AI/
│
├── config/                   # Django project config (settings, urls, wsgi, asgi)
├── users/                    # Custom User model, JWT auth views
├── restaurants/              # Restaurant CRUD + claim workflow
├── food_reports/             # Core food report model + image validation
├── ai_analysis/              # AI inference engine + AIAnalysis model
├── complaints/               # Formal complaint workflow
├── escalation/               # 3-tier internal escalation
├── feedback/                 # Customer satisfaction ratings
├── notifications/            # In-app notification system
├── analytics/                # Read-only analytics aggregation
├── translation/              # Pluggable translation facade
│
├── src/
│   ├── ml/                   # ML training pipeline
│   │   ├── model.py          #   MobileNetV3-Small architecture
│   │   ├── config.py         #   TrainingConfig dataclass
│   │   ├── train.py          #   Training loop CLI
│   │   ├── splitting.py      #   Grouped stratified split
│   │   ├── manifest_dataset.py #  PyTorch Dataset from JSONL manifest
│   │   ├── artifacts.py      #   Save model.pt / label_map / train_config
│   │   ├── evaluate.py       #   Evaluation + metrics
│   │   └── tests/            #   72 unit tests
│   └── data/
│       ├── synthetic/        #   Synthetic dataset generator (pipeline testing)
│       └── dataset_tools/    #   Manifest validation + leakage detection
│
├── data/
│   ├── raw/food_quality/     # Source images (licensed_public, pilot_consented, team_capture)
│   ├── manifests/            # JSONL manifest files
│   ├── processed/            # Preprocessed outputs
│   ├── splits/               # Split assignment files
│   ├── holdout/              # Real-world eval images
│   └── synthetic/            # Synthetic pilot fixtures
│
├── models/food_quality/      # Trained model artifacts (model.pt, label_map.json, train_config.json)
│
├── frontend/                 # React 19 SPA
│   ├── src/
│   │   ├── api/              #   Axios API clients (7 modules)
│   │   ├── components/       #   60+ components (ai, auth, complaints, layout, reports, ui...)
│   │   ├── context/          #   AuthContext, LanguageContext
│   │   ├── hooks/            #   Domain-specific data hooks
│   │   ├── i18n/             #   6 language dictionaries (288 keys × 6 languages)
│   │   ├── pages/            #   Pages by role (customer, reviewer, restaurant, admin, public)
│   │   ├── lib/              #   HTTP client, Zod schemas, formatters
│   │   └── types/            #   TypeScript type definitions
│   └── vercel.json           # Vercel SPA rewrite config
│
├── docs/
│   ├── datasets/             # Dataset acquisition, annotation, and spec docs
│   ├── deployment/           # Render + Vercel deployment guide
│   └── ml/                   # ML training pipeline docs
│
├── docker-compose.yml        # Local dev: PostgreSQL 16 + Django backend
├── Dockerfile                # Production container image
├── render.yaml               # Render Blueprint (one-click backend deploy)
├── requirements.txt          # Backend dependencies (no PyTorch)
├── requirements-render.txt   # Backend + PyTorch (CPU) for Render
├── .env.example              # Environment variable reference
└── manage.py                 # Django management entry point
```

---

## Known Limitations & Roadmap

### ⚠️ Current Limitations

| Area | Status |
|---|---|
| **Real food model** | ❌ Synthetic model only — real food dataset collection in progress |
| **Production media** | ⚠️ Django serves `/media/` directly — no CDN/object storage yet (ephemeral on Render) |
| **Real-time notifications** | ⚠️ Polling only — no WebSocket or SSE |
| **Translation** | ⚠️ `NullProvider` only — no live translation; user content returned as-entered |
| **Confidence calibration** | ⚠️ Raw softmax scores (uncalibrated) |
| **E2E tests** | ❌ No end-to-end tests |
| **Partial i18n** | ⚠️ Auth/nav translated; many form body strings English-only |

### 🗺️ Roadmap

1. **Real food quality dataset** — complete acquisition from licensed_public sources + pilot captures → train real `foodguard-quality-v1` model
2. **Object storage** — S3/R2/GCS for persistent media (replaces ephemeral Render disk)
3. **Real translation provider** — wire Google Translate / Azure Cognitive Services / LibreTranslate into `translation/services.py`
4. **WebSocket notifications** — Django Channels for real-time notification delivery
5. **Confidence calibration** — temperature scaling post-training
6. **E2E tests** — Playwright test suite for critical user flows
7. **Complete i18n** — translate remaining form strings in all 6 languages
8. **Nginx / CDN** — replace Django media serving with nginx reverse proxy

---

## Documentation

| Document | Path |
|---|---|
| Deployment guide (Render + Vercel) | `docs/deployment/DEPLOYMENT.md` |
| ML training pipeline | `docs/ml/TRAINING_PIPELINE.md` |
| Dataset acquisition plan | `docs/datasets/ACQUISITION_PLAN.md` |
| Dataset spec (JSONL schema) | `docs/datasets/DATASET_SPEC.md` |
| Annotation guide | `docs/datasets/ANNOTATION_GUIDE.md` |
| Dataset registry | `docs/datasets/dataset_registry.md` |
| Dataset sources | `docs/datasets/dataset_sources.md` |
| FSSAI data sources | `docs/datasets/fssai_sources.md` |
| MeatScan acquisition | `docs/datasets/meatscan_acquisition.md` |
| Research report | `docs/datasets/FOODGUARD_AI_2_RESEARCH_REPORT.md` |
| Capture metadata template | `docs/datasets/CAPTURE_METADATA_TEMPLATE.md` |
| Collection README | `docs/datasets/COLLECTION_README.md` |

---

## License

See repository license file.

---


