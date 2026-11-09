# 🛡️ FoodGuard AI

**AI-powered food safety reporting and complaint management platform.**

FoodGuard AI enables customers to report food quality concerns at restaurants, receive preliminary AI visual assessments of food images, and track formal complaints through a structured review process — all in six Indian languages.

> ⚠️ **AI results are preliminary visual assessments only — not scientific food-safety certifications, proof of contamination, or evidence of restaurant wrongdoing.**

---

## ✨ Features

### For Customers
- 📝 **Report food issues** — create reports with image uploads, track status from draft to resolution
- 🤖 **AI visual assessment** — get a preliminary analysis of uploaded food images (spoilage, mold, normal)
- 📋 **File complaints** — escalate submitted reports into formal complaints
- ⭐ **Leave feedback** — rate and comment on resolved complaints
- 🌐 **Multilingual UI** — use the app in English, Telugu, Hindi, Tamil, Kannada, or Marathi

### For Reviewers & Admins
- 📊 **Dashboard analytics** — real-time KPI cards with report/complaint/AI statistics
- 🔍 **Case management** — review reports, manage complaints, verify restaurants
- ⬆️ **Escalation workflow** — 3-tier internal escalation system for complex cases
- 🔔 **Notifications** — in-app alerts for new submissions, status changes, and escalations

### For Restaurant Users
- 🏪 **Restaurant profile management** — register and manage restaurant details
- ✅ **Verification system** — reviewer/admin-controlled restaurant verification with claim workflow

---

## 🏗️ Tech Stack

### Backend

| Component | Version |
|---|---|
| Python | 3.12+ |
| Django | 5.2.17 (LTS) |
| Django REST Framework | 3.17.1 |
| SimpleJWT | 5.5.1 |
| PostgreSQL | 16 |
| Pillow | 11.3.0 |
| PyTorch (optional) | CPU inference |
| drf-spectacular | 0.28.0 |

### Frontend

| Component | Version |
|---|---|
| React | 19.2.8 |
| TypeScript | 6.0.2 |
| Tailwind CSS | 4.3.3 |
| Vite | 8.3.0 |
| TanStack React Query | 5.103.2 |
| React Hook Form + Zod | 7.88.0 / 4.6.5 |
| React Router | 7.18.4 |
| Vitest + React Testing Library | 5.0.2 |

### Infrastructure

| Component | Purpose |
|---|---|
| Docker Compose | PostgreSQL dev instance (port 5434) |
| Render | Backend deployment (Blueprint ready) |
| Vercel | Frontend deployment (config ready) |
| WhiteNoise | Static file serving |
| Gunicorn | Production WSGI server |

---

## 📁 Project Structure

```
FoodGuard-AI/
├── manage.py                      # Django management
├── requirements.txt               # Backend dependencies
├── requirements-render.txt        # Production deps (includes PyTorch)
├── docker-compose.yml             # PostgreSQL dev instance
├── Dockerfile                     # Backend container image
├── render.yaml                    # Render deployment Blueprint
├── .env.example                   # Environment variable template
│
├── config/                        # Django project configuration
│   ├── settings.py                # Settings with env-based config
│   ├── urls.py                    # Root URL routing (9 API namespaces)
│   ├── views.py                   # Health check endpoint
│   ├── wsgi.py / asgi.py
│
├── users/                         # Custom User model + JWT auth
│   ├── models.py                  # Email auth, 4 roles, 6 languages
│   ├── managers.py                # Custom UserManager
│   ├── views.py                   # Register, Login, Logout, Profile
│   ├── serializers.py / urls.py / permissions.py / tests.py
│   └── management/commands/       # bootstrap_admin, create_dev_users
│
├── restaurants/                   # Restaurant management
│   ├── models.py                  # Name, address, owner, verification, claim status
│   ├── views.py                   # CRUD + ownership/verification rules
│   ├── serializers.py / urls.py / permissions.py / tests.py
│   └── management/commands/       # seed_restaurants
│
├── food_reports/                  # Food safety reports
│   ├── models.py                  # DRAFT → SUBMITTED → UNDER_REVIEW → RESOLVED/CLOSED
│   ├── services.py                # Submission service + image validation
│   ├── views.py                   # CRUD + submit endpoint
│   ├── serializers.py / urls.py / permissions.py / tests.py
│
├── ai_analysis/                   # AI visual assessment
│   ├── models.py                  # AIAnalysis: OneToOne with FoodReport
│   ├── inference.py               # MobileNetV3-Small real-model inference
│   ├── services.py                # Service abstraction (real model or mock)
│   ├── views.py                   # Analyze + get analysis result
│   ├── serializers.py / urls.py / permissions.py / tests.py
│
├── complaints/                    # Formal complaints
│   ├── models.py                  # Category, status lifecycle, language preservation
│   ├── services.py                # Create, update, status transitions
│   ├── views.py / serializers.py / urls.py / permissions.py / tests.py
│
├── escalation/                    # 3-tier internal escalation
│   ├── models.py                  # LEVEL_1/2/3, PENDING → IN_REVIEW → RESOLVED → CLOSED
│   ├── services.py                # Escalation lifecycle management
│   ├── views.py / serializers.py / urls.py / permissions.py / tests.py
│
├── feedback/                      # Customer satisfaction ratings
│   ├── models.py                  # Rating 1–5, unique per complaint
│   ├── services.py                # Ownership + status guards
│   ├── views.py / serializers.py / urls.py / permissions.py / tests.py
│
├── notifications/                 # In-app notification system
│   ├── models.py                  # 7 event types, read/unread tracking
│   ├── services.py                # Event recording + recipient routing
│   ├── views.py / serializers.py / urls.py / permissions.py / tests.py
│
├── analytics/                     # Platform-wide analytics
│   ├── views.py                   # Summary endpoint (DB aggregations)
│   ├── serializers.py / urls.py / permissions.py / tests.py
│
├── translation/                   # Multilingual backend support
│   ├── strings.py                 # Static string catalog (en/te/hi)
│   ├── services.py                # TranslationService abstraction
│   ├── tests.py / test_strings.py / test_translation.py
│
├── src/                           # ML pipeline (standalone)
│   ├── data/
│   │   ├── synthetic/             # Synthetic dataset generator
│   │   └── dataset_tools/         # Manifest validation, leakage detection
│   └── ml/
│       ├── train.py               # Full training pipeline
│       ├── model.py               # MobileNetV3-Small architecture
│       ├── evaluate.py            # Metrics + evaluation
│       ├── config.py / labels.py / transforms.py / splitting.py
│       ├── checkpointing.py / artifacts.py / metrics.py
│       └── tests/                 # 72 ML pipeline tests
│
├── frontend/                      # React SPA
│   ├── package.json
│   ├── vite.config.ts / tsconfig.json / vitest.config.ts
│   └── src/
│       ├── App.tsx                # Route definitions (30+ routes)
│       ├── main.tsx               # App entry point
│       ├── index.css              # Tailwind + custom styles
│       ├── api/                   # 7 API clients (auth, reports, complaints, etc.)
│       ├── components/            # 60+ reusable components
│       │   ├── ai/                # AIAnalysisCard, AIDisclaimer, ConfidenceBar, etc.
│       │   ├── auth/              # ProtectedRoute, GuestRoute, RoleGuard
│       │   ├── badges/            # StatusBadge, PriorityBadge, RoleBadge
│       │   ├── complaints/        # ComplaintCard, ComplaintOverview, ComplaintTimeline
│       │   ├── dashboard/         # StatCard
│       │   ├── layout/            # AppShell, Sidebar, Topbar, MobileNav
│       │   ├── reports/           # ReportCard, ReportOverview, ReportTable
│       │   ├── restaurants/       # RestaurantCard, RestaurantSearchSelect
│       │   ├── reviewer/          # CaseHeader, CaseTimeline, EscalateCaseModal
│       │   ├── states/            # EmptyState, ErrorState, LoadingSkeleton
│       │   ├── ui/                # Button, Input, Modal, Select, etc.
│       │   └── upload/            # ImageUploader
│       ├── context/               # AuthContext (JWT state management)
│       ├── hooks/                 # useReports, useComplaints, useRestaurants, etc.
│       ├── i18n/                  # 6 language dictionaries (288 keys each)
│       ├── lib/                   # HTTP client, schemas, format utils, etc.
│       ├── pages/                 # All page components
│       │   ├── customer/          # Dashboard, Reports, Complaints
│       │   ├── reviewer/          # ReviewerDashboard, Reports, Complaints
│       │   ├── restaurant/        # RestaurantDashboard, Create, Edit
│       │   ├── admin/             # AdminDashboard
│       │   ├── Landing / Login / Register / Profile / NotFound
│       └── types/                 # TypeScript type definitions
│
└── docs/                          # Project documentation
    ├── datasets/                  # Dataset specs, acquisition plans
    ├── ml/                        # Training pipeline docs
    └── deployment/                # Deployment guide (Render + Vercel)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+ (with npm)
- Docker (for PostgreSQL)

### 1. Clone the repository

```bash
git clone https://github.com/sindhujamerugu/FoodGuard-AI.git
cd FoodGuard-AI
```

### 2. Start PostgreSQL

```bash
docker compose up -d
docker compose ps   # verify foodguard_db_new is healthy on port 5434
```

### 3. Set up the backend

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# (Optional) Create development users
python manage.py create_dev_users

# Start Django server
python manage.py runserver
```

Backend available at **http://127.0.0.1:8000**

### 4. Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend available at **http://localhost:3000**

### 5. Explore the API

- **Swagger UI:** http://127.0.0.1:8000/api/docs/
- **ReDoc:** http://127.0.0.1:8000/api/redoc/
- **OpenAPI Schema:** http://127.0.0.1:8000/api/schema/
- **Django Admin:** http://127.0.0.1:8000/admin/

---

## 🔐 Authentication

### JWT Configuration

| Setting | Value |
|---|---|
| Access token lifetime | 30 minutes |
| Refresh token lifetime | 7 days |
| Rotation | Enabled |
| Blacklist after rotation | Enabled |
| Header | `Authorization: Bearer <token>` |

### User Roles

| Role | Description | Public Registration |
|---|---|---|
| `CUSTOMER` | Files food reports and complaints | ✅ Auto-assigned |
| `RESTAURANT_USER` | Manages restaurant profile | ❌ Admin-assigned |
| `REVIEWER` | Reviews reports and complaints | ❌ Admin-assigned |
| `ADMIN` | Full platform management | ❌ Admin-assigned |

### Auth Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/` | Public | Create CUSTOMER account |
| `POST` | `/api/v1/auth/login/` | Public | Obtain JWT tokens |
| `POST` | `/api/v1/auth/token/refresh/` | Public | Rotate refresh token |
| `GET` | `/api/v1/auth/profile/` | JWT | Current user profile |
| `PATCH` | `/api/v1/auth/profile/` | JWT | Update preferred language |
| `POST` | `/api/v1/auth/logout/` | JWT | Blacklist refresh token |

---

## 📡 API Reference

### Food Reports

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/reports/` | CUSTOMER | Create DRAFT report |
| `GET` | `/api/v1/reports/` | JWT | List reports (scoped by role) |
| `GET` | `/api/v1/reports/<id>/` | Owner / REVIEWER / ADMIN | Report detail |
| `PATCH` | `/api/v1/reports/<id>/` | Owner (DRAFT only) | Update DRAFT report |
| `DELETE` | `/api/v1/reports/<id>/` | Owner (DRAFT only) | Delete DRAFT report |
| `POST` | `/api/v1/reports/<id>/submit/` | Owner (DRAFT only) | Submit for review |

**Report Lifecycle:**

```
DRAFT → SUBMITTED → UNDER_REVIEW → RESOLVED / CLOSED
```

- Created as `DRAFT`; customer may edit/delete while in DRAFT
- `POST /submit/` requires an image, title, description, and restaurant
- Once submitted, the customer cannot edit, delete, or re-submit
- `customer` is always derived from `request.user` — never from client payload

**Image Upload Rules:**

| Rule | Detail |
|---|---|
| Allowed formats | JPEG, JPG, PNG |
| Maximum size | 5 MB |
| Validation | Extension + content-type + Pillow readability |
| Required for submit | Yes |

### AI Analysis

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/reports/<id>/analyze/` | Owner / REVIEWER / ADMIN | Run AI analysis |
| `GET` | `/api/v1/reports/<id>/analysis/` | Owner / REVIEWER / ADMIN | Get analysis result |

> ⚠️ **Preliminary visual assessment only.** Results are NOT scientific food-safety certifications.

**AI Architecture:**

```
AIAnalysisService
        │
        ▼
_run_real_analysis()  ──▶  ai_analysis.inference.run_inference()  ──▶  model.pt
        │
        ▼ (when model.pt / label_map.json are absent)
   deterministic mock result
```

| Setting | Env Var | Default | Meaning |
|---|---|---|---|
| Model directory | `FOOD_QUALITY_MODEL_DIR` | `models/food_quality/` | Location of `model.pt`, `label_map.json`, `train_config.json` |
| Confidence threshold | `AI_CONFIDENCE_THRESHOLD` | `0.70` | Below this → forced `HUMAN_REVIEW` |

**Model Classes:** `normal` · `spoilage_indicator` · `mold_like_growth` (3-class MobileNetV3-Small)

> ⚠️ The current model is trained on **synthetic geometric patterns** for pipeline verification only. It does not contain real food images and must not be cited as real-world accuracy. See `docs/ml/TRAINING_PIPELINE.md`.

### Complaints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/complaints/` | CUSTOMER | File complaint against a submitted report |
| `GET` | `/api/v1/complaints/` | JWT | List (scoped by role) |
| `GET` | `/api/v1/complaints/<id>/` | Owner / REVIEWER / ADMIN | Complaint detail |
| `PATCH` | `/api/v1/complaints/<id>/` | REVIEWER / ADMIN | Update status/priority/notes |

**Complaint Lifecycle:**

```
SUBMITTED → UNDER_REVIEW → RESOLVED → CLOSED
               ↑ (revert allowed)
           UNDER_REVIEW → SUBMITTED
```

**Categories:** `FOOD_QUALITY` · `SPOILAGE` · `FOREIGN_OBJECT` · `HYGIENE` · `TASTE_OR_ODOR` · `OTHER`

**Business Rules:**
- One complaint per FoodReport (unique DB constraint + service guard)
- `customer` and `restaurant` derived server-side — never from client payload
- Can only be filed against a `SUBMITTED` FoodReport (not DRAFT)

### Escalation

> ⚠️ **Application-level workflow only.** Escalation levels are internal platform tiers — NOT mapped to any government authority or regulatory body.

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/escalations/` | REVIEWER / ADMIN | Create escalation |
| `GET` | `/api/v1/escalations/` | REVIEWER / ADMIN | List all |
| `GET` | `/api/v1/escalations/<id>/` | REVIEWER / ADMIN | Detail |
| `PATCH` | `/api/v1/escalations/<id>/` | REVIEWER / ADMIN | Update workflow |

**Levels:** `LEVEL_1` (first review) → `LEVEL_2` (senior) → `LEVEL_3` (highest)  
**Lifecycle:** `PENDING → IN_REVIEW → RESOLVED → CLOSED`

### Restaurants

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/restaurants/` | JWT | List active restaurants |
| `POST` | `/api/v1/restaurants/` | RESTAURANT_USER / ADMIN | Create restaurant |
| `GET` | `/api/v1/restaurants/<id>/` | JWT | Restaurant detail |
| `PATCH` | `/api/v1/restaurants/<id>/` | Owner / REVIEWER / ADMIN | Update |
| `DELETE` | `/api/v1/restaurants/<id>/` | Owner / ADMIN | Delete |

### Feedback

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/feedback/` | CUSTOMER | Rate a resolved/closed complaint (1–5) |
| `GET` | `/api/v1/feedback/` | JWT | List (scoped by role) |
| `GET` | `/api/v1/feedback/<id>/` | Owner / REVIEWER / ADMIN | Detail |

### Notifications

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications/` | JWT | Own notifications (newest first) |
| `PATCH` | `/api/v1/notifications/<id>/` | Owner | Toggle `is_read` |

**Events:** Report submitted, AI analysis completed, complaint submitted/status changed, escalation created/updated.

### Analytics

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/analytics/summary/` | REVIEWER / ADMIN | Platform-wide statistics |

---

## 🌐 Multilingual Support

### Supported Languages

| Code | Language |
|---|---|
| `en` | English (default) |
| `te` | Telugu |
| `hi` | Hindi |
| `ta` | Tamil |
| `kn` | Kannada |
| `mr` | Marathi |

### Implementation Status

**Frontend:** 288 translation keys per language across 6 dictionaries — covers navigation, auth pages, dashboard, badges, states, and customer portal. Language persisted to `localStorage` and synced to backend.

**Backend:** `User.preferred_language` stored per user. AI analysis messages and 3/7 notification event types translated via static string catalog (`translation/strings.py`). `TranslationService` abstraction exists for future real-time translation of user-generated content (provider currently set to `"none"`).

**User-entered content** (report titles, complaint descriptions, restaurant names) is always **preserved exactly as entered** — never auto-translated or overwritten.

---

## ⚙️ Environment Variables

| Variable | Default (dev) | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev key | Django secret key (**must change in production**) |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DATABASE_NAME` | `foodguard_db` | PostgreSQL database |
| `DATABASE_USER` | `foodguard_user` | PostgreSQL user |
| `DATABASE_PASSWORD` | `foodguard_password` | PostgreSQL password |
| `DATABASE_HOST` | `127.0.0.1` | PostgreSQL host |
| `DATABASE_PORT` | `5434` | PostgreSQL port |
| `DATABASE_URL` | — | Full connection string (overrides individual DB vars) |
| `CORS_ALLOWED_ORIGINS` | localhost:3000–3003 | Frontend origins |
| `FOOD_QUALITY_MODEL_DIR` | `models/food_quality/` | AI model artifacts directory |
| `AI_CONFIDENCE_THRESHOLD` | `0.70` | Minimum confidence for non-HUMAN_REVIEW result |
| `TRANSLATION_PROVIDER` | `none` | Translation provider (`none` = no real translation) |
| `SERVE_MEDIA_VIA_DJANGO` | `True` | Serve uploaded images via Django (disable when CDN is set up) |

---

## 🧪 Running Tests

### Frontend (161 tests)

```bash
cd frontend

# Run all tests
npm test

# Run tests with verbose output
npx vitest run --reporter=verbose

# TypeScript type check
npx tsc --noEmit

# Lint
npm run lint

# Production build
npm run build
```

**Test coverage includes:** auth/login flow, role-based routing, customer dashboard (20 tests), report CRUD, complaint flows, form validation, language switching (6-language parity), restaurant localization, format utilities, and schema validation.

### Backend (~230+ tests)

Requires a running PostgreSQL instance (`docker compose up -d`).

```bash
# Full backend suite
python manage.py test --verbosity 1

# Individual apps
python manage.py test users --verbosity 2           # 24 tests
python manage.py test restaurants --verbosity 2      # 22 tests
python manage.py test food_reports --verbosity 2     # 39 tests
python manage.py test ai_analysis --verbosity 2      # AI mock + real model tests
python manage.py test complaints --verbosity 2       # 38 tests
python manage.py test escalation --verbosity 2       # 38 tests
python manage.py test feedback --verbosity 2         # 30 tests
python manage.py test notifications --verbosity 2    # 13 tests
python manage.py test analytics --verbosity 2        # 8 tests
python manage.py test translation --verbosity 2      # 6 tests
```

### ML Pipeline (72 tests — no database needed)

```bash
# Dataset manifest/leakage tooling (40 tests)
python -m unittest src.data.dataset_tools.tests.test_schema \
  src.data.dataset_tools.tests.test_validate_manifest \
  src.data.dataset_tools.tests.test_check_leakage

# ML pipeline (72 tests)
python -m unittest src.ml.tests.test_labels src.ml.tests.test_config \
  src.ml.tests.test_metrics src.ml.tests.test_splitting \
  src.ml.tests.test_manifest_dataset src.ml.tests.test_transforms \
  src.ml.tests.test_model src.ml.tests.test_checkpointing \
  src.ml.tests.test_artifacts src.ml.tests.test_train_integration
```

### Translation (45 tests — no database needed)

```bash
python -m unittest translation.test_strings            # 18 tests
python -m unittest ai_analysis.test_translation         # 16 tests
python -m unittest notifications.test_translation       # 11 tests
```

---

## 🚢 Deployment

**Full guide:** `docs/deployment/DEPLOYMENT.md`

### Backend → Render

- `render.yaml` — Render Blueprint (native Python runtime + managed PostgreSQL)
- `requirements-render.txt` — includes PyTorch for real inference
- Build step regenerates the synthetic development model on each deploy
- `GET /healthz/` health check endpoint
- WhiteNoise serves static files; Django serves media

### Frontend → Vercel

- `frontend/vercel.json` — SPA rewrite for client-side routing
- Connect to the Render backend via `VITE_API_URL` environment variable

### Docker (alternative)

```bash
docker compose up -d                          # PostgreSQL + backend
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py bootstrap_admin
```

> **Note:** The Docker path has not been tested end-to-end in this project's development. Use the Render + Vercel path for a verified deployment.

---

## 🔒 Security

- **JWT with rotation + blacklisting** — access tokens expire in 30 minutes
- **Production hardening** — HSTS, SSL redirect, secure cookies when `DEBUG=False`
- **Insecure secret key blocked** — server refuses to start with dev key in production
- **Rate limiting** — 10/min on auth endpoints
- **Image validation** — extension + content-type + Pillow readability check
- **Server-side ownership** — `customer`, `restaurant`, `original_language` always derived from `request.user`
- **Randomized filenames** — UUID-based image paths prevent URL guessing
- **Upload size limits** — 6 MB at Django level, 5 MB at application level
- **CORS** — explicit allowed origins, not wildcard

---

## 📝 Frontend Routes

| Path | Role | Page |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Guest only | Login |
| `/register` | Guest only | Register |
| `/profile` | Authenticated | User profile |
| `/dashboard` | CUSTOMER | Customer dashboard |
| `/reports` | CUSTOMER | Reports list |
| `/reports/new` | CUSTOMER | Create report |
| `/reports/:id` | CUSTOMER | Report detail |
| `/reports/:id/edit` | CUSTOMER | Edit DRAFT report |
| `/reports/:id/ai-analysis` | CUSTOMER | AI analysis result |
| `/complaints` | CUSTOMER | Complaints list |
| `/complaints/new` | CUSTOMER | File complaint |
| `/complaints/:id` | CUSTOMER | Complaint detail |
| `/restaurant` | RESTAURANT_USER | Restaurant dashboard |
| `/restaurant/new` | RESTAURANT_USER | Create restaurant |
| `/restaurant/:id/edit` | RESTAURANT_USER | Edit restaurant |
| `/reviewer` | REVIEWER / ADMIN | Reviewer dashboard |
| `/reviewer/reports` | REVIEWER / ADMIN | All reports |
| `/reviewer/reports/:id` | REVIEWER / ADMIN | Report review |
| `/reviewer/complaints` | REVIEWER / ADMIN | All complaints |
| `/reviewer/complaints/:id` | REVIEWER / ADMIN | Complaint management |
| `/reviewer/restaurants` | REVIEWER / ADMIN | Restaurant management |
| `/admin` | ADMIN | Admin dashboard |

---

## 🤖 ML Pipeline

### Architecture

```
src/data/synthetic/     → generates labeled synthetic images
src/data/dataset_tools/ → manifest validation + leakage detection
src/ml/train.py         → full training pipeline (MobileNetV3-Small)
src/ml/evaluate.py      → per-class metrics + confusion matrix
ai_analysis/inference.py → thread-safe singleton model inference
```

### Current Status

| Component | Status |
|---|---|
| Training pipeline | ✅ Complete and tested (72 tests) |
| Inference engine | ✅ Complete (thread-safe, CPU-only) |
| Synthetic dev model | ✅ Exists (for pipeline verification) |
| Real food dataset | ❌ Not collected (see `docs/datasets/`) |
| Real-world evaluation | ❌ Not performed |
| Production model | ❌ Requires real dataset |

### Training a Model

```bash
# Generate synthetic dataset (for pipeline testing)
python -m src.data.synthetic.generate_dataset

# Train
python -m src.ml.train \
  --manifest data/synthetic/food_quality/manifest.jsonl \
  --data-root data \
  --output-dir models/food_quality \
  --img-size 128 \
  --epochs 12 \
  --batch-size 16 \
  --seed 20260927 \
  --device cpu
```

See `docs/ml/TRAINING_PIPELINE.md` for full documentation.

---

## 📚 Documentation

| Document | Location |
|---|---|
| Deployment Guide | `docs/deployment/DEPLOYMENT.md` |
| ML Training Pipeline | `docs/ml/TRAINING_PIPELINE.md` |
| Dataset Acquisition Plan | `docs/datasets/ACQUISITION_PLAN.md` |
| Dataset Quality Plan | `docs/datasets/quality_dataset_plan.md` |
| Dataset Registry | `docs/datasets/dataset_registry.md` |
| API Docs (interactive) | `http://127.0.0.1:8000/api/docs/` |

---

## 🚧 Known Limitations

- **No real food-trained model** — the synthetic development model verifies the pipeline works but provides no real-world accuracy
- **No production deployment** — Render and Vercel configs are prepared but nothing is live
- **Ephemeral media on Render** — uploaded images don't survive redeployment without a persistent disk
- **Partial i18n** — dashboard, auth, and navigation are translated; many form bodies and table content remain English-only
- **No E2E tests** — unit/integration tests exist but no Playwright/Cypress flows
- **Translation quality** — Telugu/Hindi translations are MVP-quality, not professionally reviewed
- **No real-time notifications** — polling-based; no WebSocket/SSE infrastructure
- **Confidence scores** — raw softmax, not calibrated probabilities

---

## 👩‍💻 Authors

- **Sindhuja Merugu** — [@sindhujamerugu](https://github.com/sindhujamerugu)

---

## 📄 License

This project is proprietary. All rights reserved.
