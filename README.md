# FoodGuard AI — Backend

AI-powered food safety reporting and complaint management system.

---

## Current State

Steps 1 – 9 complete:
- Django backend foundation
- PostgreSQL database (isolated Docker instance on port 5434)
- Custom User model with roles and multilingual preference
- JWT authentication
- Restaurant management
- Food report creation and image upload with submission workflow
- AI Analysis Service abstraction with mock implementation (real ML NOT integrated)
- Complaint management system with multilingual language preservation
- Complaint escalation management (application-level workflow only)
- Customer feedback for resolved/closed complaints
- Dataset acquisition plan, directory structure, and validation foundation (no data downloaded)

---

## Tech Stack

| Component | Version |
|---|---|
| Python | 3.12.10 |
| Django | 5.2.17 (LTS) |
| Django REST Framework | 3.17.1 |
| djangorestframework-simplejwt | 5.5.1 |
| django-cors-headers | 4.9.0 |
| django-environ | 0.14.0 |
| psycopg2-binary | 2.9.10 |
| Pillow | 11.3.0 |
| PostgreSQL | 16 |
| Docker | 29.6.1 |

---

## Project Structure

```
D:\foodai\
├── manage.py
├── requirements.txt
├── docker-compose.yml
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── users/
│   ├── models.py          # Custom User: roles, preferred_language
│   ├── managers.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   ├── permissions.py
│   ├── tests.py
│   └── migrations/
├── restaurants/
│   ├── models.py          # Restaurant: owner, is_verified, is_active
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── admin.py
│   ├── permissions.py
│   ├── tests.py
│   └── migrations/
└── feedback/
    ├── models.py          # Feedback: rating 1–5, unique per complaint, original_language
    ├── services.py        # FeedbackService: ownership, status, duplicate guards
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    ├── permissions.py
    ├── tests.py
    └── migrations/
    ├── models.py          # Escalation: LEVEL_1/2/3, PENDING→IN_REVIEW→RESOLVED→CLOSED
    ├── services.py        # EscalationService: create, update, status transitions
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    ├── permissions.py
    ├── tests.py
    └── migrations/
    ├── models.py          # Complaint: category/status/priority lifecycle, original_language
    ├── services.py        # ComplaintService: create, update, status transitions
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    ├── permissions.py
    ├── tests.py
    └── migrations/
    ├── models.py          # AIAnalysis: OneToOne with FoodReport
    ├── services.py        # AIAnalysisService abstraction + mock impl
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    ├── permissions.py
    ├── tests.py
    └── migrations/
    ├── models.py          # FoodReport: status lifecycle, image upload
    ├── serializers.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    ├── permissions.py
    ├── services.py        # FoodReportSubmissionService, image validation
    ├── tests.py
    └── migrations/
```

---

## Environment Variables

| Variable | Default (dev) | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | insecure dev key | Django secret key |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DATABASE_NAME` | `foodguard_db` | PostgreSQL database name |
| `DATABASE_USER` | `foodguard_user` | PostgreSQL user |
| `DATABASE_PASSWORD` | `foodguard_password` | PostgreSQL password |
| `DATABASE_HOST` | `127.0.0.1` | PostgreSQL host |
| `DATABASE_PORT` | `5434` | PostgreSQL port |

---

## Setup

### 1. Start PostgreSQL

```bash
docker compose up -d
docker compose ps   # verify foodguard_db_new is healthy on port 5434
```

### 2. Create virtual environment

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 3. Run migrations

```bash
python manage.py migrate
```

### 4. Start Django

```bash
python manage.py runserver
```

Django available at `http://127.0.0.1:8000`.

---

## User Roles

| Role | Description | Public registration |
|---|---|---|
| `CUSTOMER` | Default — files food reports | Auto-assigned |
| `RESTAURANT_USER` | Manages restaurant profile | Not assignable |
| `REVIEWER` | Reviews submitted reports | Not assignable |
| `ADMIN` | Full management | Not assignable |

---

## Supported Languages

`en` English · `te` Telugu · `hi` Hindi · `ta` Tamil · `kn` Kannada · `mr` Marathi

Stored as `preferred_language` on each User. Used by future notifications,
AI explanations, and complaint responses. Original user-entered content
(report titles, descriptions, restaurant names) is always preserved as-entered.

---

## Auth Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register/` | Public | Create CUSTOMER account |
| `POST` | `/api/v1/auth/login/` | Public | Obtain JWT tokens |
| `POST` | `/api/v1/auth/token/refresh/` | Public | Rotate refresh token |
| `GET` | `/api/v1/auth/profile/` | JWT | Current user profile |
| `POST` | `/api/v1/auth/logout/` | JWT | Blacklist refresh token |

---

## Restaurant Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/restaurants/` | JWT | List active restaurants |
| `POST` | `/api/v1/restaurants/` | RESTAURANT_USER / ADMIN | Create restaurant |
| `GET` | `/api/v1/restaurants/<id>/` | JWT | Restaurant detail |
| `PATCH` | `/api/v1/restaurants/<id>/` | Owner / REVIEWER / ADMIN | Update restaurant |
| `DELETE` | `/api/v1/restaurants/<id>/` | Owner / ADMIN | Delete restaurant |

### Restaurant Ownership Rules

- Owner is always the authenticated user who created the restaurant. Clients cannot specify another owner.
- `is_verified` may only be set by REVIEWER or ADMIN — never by the owning RESTAURANT_USER.
- A RESTAURANT_USER may only update their own restaurant, not others'.

---

## Food Report Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/reports/` | CUSTOMER | Create DRAFT report |
| `GET` | `/api/v1/reports/` | JWT | List (customer sees own; reviewer/admin sees all) |
| `GET` | `/api/v1/reports/<id>/` | Owner / REVIEWER / ADMIN | Report detail |
| `PATCH` | `/api/v1/reports/<id>/` | Owner (DRAFT only) | Update DRAFT report |
| `DELETE` | `/api/v1/reports/<id>/` | Owner (DRAFT only) | Delete DRAFT report |
| `POST` | `/api/v1/reports/<id>/submit/` | Owner (DRAFT only) | Submit report for review |

### Report Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → RESOLVED / CLOSED
```

- Created as `DRAFT` automatically.
- Customer may edit and delete while `DRAFT`.
- `POST /submit/` transitions `DRAFT → SUBMITTED` (requires image, title, description, restaurant).
- Once submitted, the customer cannot edit, delete, or re-submit.
- Priority is `LOW` by default. Future AI-based prioritisation will assign MEDIUM / HIGH / CRITICAL.

### Image Upload Rules

| Rule | Detail |
|---|---|
| Allowed formats | JPEG, JPG, PNG |
| Maximum size | 5 MB |
| Validation | Extension + content-type + Pillow readability check |
| Required for submit | Yes — report cannot be submitted without an image |
| Storage | `media/food_reports/` (local dev); production object storage TBD |
| URL | Absolute URL returned in API response (`/media/food_reports/<filename>`) |

### Report Ownership Rules

- `customer` is always set from `request.user` — clients cannot assign another user.
- Customer can only view, update, delete, or submit their own reports.
- `status` and `priority` cannot be changed directly by the customer; only the submit endpoint may change status.
- REVIEWER and ADMIN have read-only access to all reports.

---

## JWT Configuration

| Setting | Value |
|---|---|
| Access token lifetime | 30 minutes |
| Refresh token lifetime | 7 days |
| Rotation | Enabled |
| Blacklist after rotation | Enabled |
| Header | `Authorization: Bearer <token>` |

---

## Customer Feedback

### Purpose
Customers may submit a satisfaction rating and optional comments after a complaint has been resolved or closed. This provides a quality signal to reviewers and admins without requiring additional staff interaction.

### Rules

| Rule | Detail |
|---|---|
| Rating range | Integer 1–5 (inclusive). 0, 6, negatives, non-integers rejected. |
| Complaint status required | `RESOLVED` or `CLOSED` only. `SUBMITTED` and `UNDER_REVIEW` rejected. |
| Ownership | Only the customer who owns the complaint may submit feedback. |
| One per complaint | Unique DB constraint + service guard. Duplicates are rejected with a clear error. |
| Immutability | `complaint` and `customer` cannot change after creation. No PATCH or DELETE endpoints. |
| `customer` derivation | Always set from `request.user` — client cannot supply or override it. |
| `original_language` | Derived from `request.user.preferred_language` — client cannot override it. |
| Comments | Stored exactly as entered. Never auto-translated or overwritten. |

### Feedback Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/feedback/` | CUSTOMER | Submit feedback for a resolved/closed complaint |
| `GET` | `/api/v1/feedback/` | JWT | List (customer: own; reviewer/admin: all) |
| `GET` | `/api/v1/feedback/<id>/` | Owner / REVIEWER / ADMIN | Feedback detail |

### Feedback Permissions

| Role | Create | Read |
|---|---|---|
| CUSTOMER (own complaint) | ✅ | ✅ own only |
| CUSTOMER (other's complaint) | ❌ 400 | ❌ 403 |
| REVIEWER | ❌ | ✅ all |
| ADMIN | ❌ | ✅ all |
| RESTAURANT_USER | ❌ | ❌ 403 |
| Unauthenticated | ❌ 401 | ❌ 401 |

### Multilingual

- `original_language` stores the customer's language code (`en`, `te`, `hi`, `ta`, `kn`, `mr`) at submission time.
- `comments` are preserved verbatim.
- Future `TranslationService` can translate for reviewers without modifying the stored original.

---

> ⚠️ **APPLICATION-LEVEL WORKFLOW ONLY**
> Escalation levels are internal platform tiers.
> They are **NOT automatically mapped** to any government authority,
> external regulatory body, or real-world enforcement agency.

### Purpose
Reviewers and Admins may escalate a Complaint to a higher internal review tier when:
- A complaint remains unresolved after the review period
- A serious visible concern requires senior oversight
- The assigned reviewer requires higher-level input
- Resolution is deemed insufficient

### Escalation Levels

| Level | Meaning |
|---|---|
| `LEVEL_1` | First higher-level review within the platform |
| `LEVEL_2` | Further escalation to senior reviewer/admin |
| `LEVEL_3` | Highest application-level review available |

### Escalation Lifecycle

```
PENDING → IN_REVIEW → RESOLVED → CLOSED
```

- `CLOSED` is terminal — no further transitions.
- `resolved_at` is set when status becomes `RESOLVED` or `CLOSED`.
- Only one active escalation (PENDING or IN_REVIEW) per Complaint at a time.
- Historical RESOLVED/CLOSED escalations allow a new active escalation to be created.

### Escalation Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/escalations/` | REVIEWER / ADMIN | Create escalation |
| `GET` | `/api/v1/escalations/` | REVIEWER / ADMIN | List all escalations |
| `GET` | `/api/v1/escalations/<id>/` | REVIEWER / ADMIN | Escalation detail |
| `PATCH` | `/api/v1/escalations/<id>/` | REVIEWER / ADMIN | Update workflow fields |

### Escalation Permission Boundaries

| Role | Access |
|---|---|
| REVIEWER | Full create / read / update |
| ADMIN | Full create / read / update |
| CUSTOMER | ❌ 403 |
| RESTAURANT_USER | ❌ 403 |
| Unauthenticated | ❌ 401 |

### Escalation Multilingual Preservation

- `original_language` is derived from `created_by.preferred_language` at creation — immutable.
- `reason` and `resolution_notes` are stored exactly as entered.
- No auto-translation. Future `TranslationService` will localize without overwriting originals.

---

### Purpose
Customers file a formal complaint against a submitted FoodReport.
Reviewers and Admins manage the complaint lifecycle.

### Complaint Lifecycle

```
SUBMITTED → UNDER_REVIEW → RESOLVED → CLOSED
               ↑ (revert allowed)
           UNDER_REVIEW → SUBMITTED
```

- Created as `SUBMITTED` automatically.
- Customer has read-only access after creation.
- `UNDER_REVIEW → SUBMITTED` revert is allowed (e.g. request for more info).
- `CLOSED` is a terminal state — no further transitions.
- `resolved_at` is set when status becomes `RESOLVED` or `CLOSED`, cleared on revert.

### Business Rules

- One complaint per FoodReport (unique DB constraint + service guard).
- `customer` and `restaurant` are always derived server-side — never from client payload.
- `original_language` is derived from `request.user.preferred_language` at creation — immutable.
- Can only be filed against a **SUBMITTED** FoodReport (not DRAFT).
- Customer must own the FoodReport they are complaining about.

### Complaint Categories

`FOOD_QUALITY` · `SPOILAGE` · `FOREIGN_OBJECT` · `HYGIENE` · `TASTE_OR_ODOR` · `OTHER`

### Complaint Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/complaints/` | CUSTOMER | File a complaint |
| `GET` | `/api/v1/complaints/` | JWT | List (customer: own; reviewer/admin: all) |
| `GET` | `/api/v1/complaints/<id>/` | Owner / REVIEWER / ADMIN | Complaint detail |
| `PATCH` | `/api/v1/complaints/<id>/` | REVIEWER / ADMIN | Update status, priority, resolution notes |

### Complaint Permission Boundaries

| Role | Create | Read | Update workflow |
|---|---|---|---|
| CUSTOMER | Own report only | Own only | ❌ (read-only after creation) |
| REVIEWER | ❌ | All | ✅ status / priority / notes |
| ADMIN | ❌ | All | ✅ full |
| RESTAURANT_USER | ❌ | ❌ | ❌ |
| Unauthenticated | ❌ 401 | ❌ 401 | ❌ 401 |

### Multilingual Language Preservation

- `original_language` is stored once at creation from `user.preferred_language`.
- `title` and `description` are never overwritten or auto-translated.
- A future `TranslationService` will convert content to reviewer's language without changing stored originals.

---

> ⚠️ **PRELIMINARY VISUAL ASSESSMENT ONLY**
> Results from this service are NOT scientific food-safety certifications,
> proof of contamination, or evidence of restaurant wrongdoing.
> They indicate possible visible concerns that require human review.

### Current Implementation: Mock Mode

The AI Analysis Service is a clean abstraction layer.
The **current implementation is a deterministic mock** — it returns a
fixed structured result that clearly identifies itself as mock mode.

- **No real ML model is integrated.**
- **No datasets are downloaded or trained.**
- **No external AI APIs are called.**
- Replacing the mock with a real visual model requires only changing
  `_run_analysis()` in `ai_analysis/services.py` — no view or serializer
  changes needed.

### Mock Result (current)

```json
{
    "food": "unknown",
    "risk": "HUMAN_REVIEW",
    "confidence": 0.0,
    "concerns": ["uncertain"],
    "message": "AI analysis is currently running in mock mode. A real visual model will be integrated in a future release. This result is NOT a scientific food-safety determination.",
    "model_name": "mock-foodguard-ai",
    "model_version": "0.1.0"
}
```

### AI Analysis Endpoints

| Method | URL | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/reports/<id>/analyze/` | Owner / REVIEWER / ADMIN | Run AI analysis |
| `GET` | `/api/v1/reports/<id>/analysis/` | Owner / REVIEWER / ADMIN | Get analysis result |

### Permission Boundaries

| Role | Access |
|---|---|
| CUSTOMER | Own reports only |
| REVIEWER | Any report (read) |
| ADMIN | Any report |
| RESTAURANT_USER | **Explicitly denied** — restaurant ownership does not grant AI analysis access |

### Language Independence

AI results are stored as structured data (`risk`, `concerns`, `confidence`, `message`).
A future `TranslationService` will convert `message` into the user's `preferred_language`
without overwriting the stored originals.

---

## Run Tests

```bash
# Feedback tests (30 tests)
python manage.py test feedback --verbosity 2

# Complaint tests (38 tests)
python manage.py test complaints --verbosity 2

# AI analysis tests (25 tests)
python manage.py test ai_analysis --verbosity 2

# All food report tests (39 tests)
python manage.py test food_reports --verbosity 2

# All user auth tests (24 tests)
python manage.py test users --verbosity 2

# Restaurant tests (22 tests)
python manage.py test restaurants --verbosity 2
```

---

## Django Admin

Available at `/admin/`. Superuser required.

Registered models: User, Restaurant, FoodReport — each with search, filters, and readonly timestamps.

---

## Not Yet Implemented

- Real ML visual food-recognition model (mock in place; real integration in Step 10+)
- Dataset download (plan and validation foundation ready; no data downloaded)
- Evidence
- Notifications
- Analytics
- TranslationService (language plumbing is in place; translation calls are not)
- Frontend
