# Food Safety Officer Workflow — Backend Design

**Status:** Planned — backend not yet implemented.  
**Frontend seam:** `frontend/src/components/complaints/OfficerWorkflowSeam.tsx`  
**Flag to enable:** `OFFICER_WORKFLOW_ENABLED = true` in the seam component.

---

## Overview

The officer workflow routes every submitted complaint to the designated
government Food Safety Officer for the restaurant's jurisdiction, following
the statutory hierarchy under the Food Safety and Standards Act, 2006 (FSSAI).

```
CUSTOMER
  ↓  (complaint submitted)
MANDAL-LEVEL FOOD SAFETY OFFICER
  ↓  (unresolved after deadline → auto-escalate)
DISTRICT-LEVEL DESIGNATED OFFICER
  ↓  (unresolved after deadline → auto-escalate)
STATE COMMISSIONER OF FOOD SAFETY
  ↓  (unresolved after deadline → escalate)
CENTRAL AUTHORITY (where applicable)
```

This is **distinct** from the existing internal `Escalation` model
(`escalation/models.py`), which handles internal reviewer-to-admin
escalation and must not be modified or replaced.

---

## Required Django App: `food_safety_officers`

### Models

#### `FoodSafetyOfficer`

```python
class FoodSafetyOfficer(models.Model):
    class AuthorityLevel(models.TextChoices):
        MANDAL   = 'MANDAL',   'Mandal Level'
        DISTRICT = 'DISTRICT', 'District Level'
        STATE    = 'STATE',    'State Level'
        CENTRAL  = 'CENTRAL',  'Central Level'

    user            = models.OneToOneField(User, on_delete=models.PROTECT,
                                           related_name='officer_profile')
    authority_level = models.CharField(max_length=10, choices=AuthorityLevel.choices)
    jurisdiction    = models.CharField(max_length=255)   # e.g. "Kukatpally Mandal"
    district        = models.CharField(max_length=100, blank=True)
    state           = models.CharField(max_length=100)
    is_active       = models.BooleanField(default=True)
    supervisor      = models.ForeignKey('self', null=True, blank=True,
                                        on_delete=models.SET_NULL,
                                        related_name='subordinates')
    # supervisor chain: Mandal → District → State → Central

    class Meta:
        indexes = [Index(fields=['authority_level']), Index(fields=['state'])]
```

#### `RestaurantOfficerMapping`

```python
class RestaurantOfficerMapping(models.Model):
    restaurant      = models.OneToOneField('restaurants.Restaurant',
                                           on_delete=models.CASCADE,
                                           related_name='officer_mapping')
    mandal_officer  = models.ForeignKey(FoodSafetyOfficer,
                                        on_delete=models.PROTECT,
                                        related_name='assigned_restaurants')
    # Automatically resolved up the chain from mandal_officer.supervisor

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### `OfficerComplaintAssignment`

```python
class OfficerComplaintAssignment(models.Model):
    class Status(models.TextChoices):
        ASSIGNED            = 'ASSIGNED',            'Assigned'
        UNDER_INVESTIGATION = 'UNDER_INVESTIGATION', 'Under Investigation'
        ACTION_TAKEN        = 'ACTION_TAKEN',        'Action Taken'
        ESCALATED           = 'ESCALATED',           'Escalated'

    complaint               = models.ForeignKey('complaints.Complaint',
                                                on_delete=models.CASCADE,
                                                related_name='officer_assignments')
    officer                 = models.ForeignKey(FoodSafetyOfficer,
                                                on_delete=models.PROTECT)
    status                  = models.CharField(max_length=25, choices=Status.choices,
                                               default=Status.ASSIGNED)
    investigation_notes     = models.TextField(blank=True, default='')
    escalation_deadline_days = models.PositiveIntegerField(default=15)
    # Configurable per deployment via Django admin or env var
    assigned_at             = models.DateTimeField(auto_now_add=True)
    deadline_at             = models.DateTimeField()  # assigned_at + deadline days
    escalated_at            = models.DateTimeField(null=True, blank=True)
    resolved_at             = models.DateTimeField(null=True, blank=True)

    class Meta:
        # Only one active assignment per complaint at a time
        constraints = [UniqueConstraint(
            fields=['complaint'],
            condition=Q(status__in=['ASSIGNED','UNDER_INVESTIGATION']),
            name='unique_active_officer_assignment'
        )]
```

---

## Service Layer: `food_safety_officers/services.py`

### `OfficerAssignmentService.assign(complaint)`
1. Look up `complaint.restaurant.officer_mapping.mandal_officer`
2. If no mapping exists → log warning, notify ADMIN, do not block complaint
3. Create `OfficerComplaintAssignment` with `deadline_at = now + deadline_days`
4. Create `Notification` for the officer user (`event_type = OFFICER_ASSIGNED`)
5. Create `Notification` for the customer (`event_type = OFFICER_ASSIGNED`)

Called from: `complaints/services.py::ComplaintService.create()` after the
complaint is saved.

### `OfficerEscalationService.check_deadlines()`
- Runs as a **management command** (`python manage.py check_officer_deadlines`)
- Called by a **Celery beat task** or **cron job** every hour
- Finds all `OfficerComplaintAssignment` where `status = ASSIGNED` or
  `UNDER_INVESTIGATION` AND `deadline_at < now()`
- For each expired assignment:
  1. Set current assignment `status = ESCALATED`, `escalated_at = now()`
  2. Resolve `officer.supervisor` (next authority level)
  3. If supervisor exists → create new `OfficerComplaintAssignment` for supervisor
  4. Notify old officer, new officer, and customer
  5. If no supervisor (Central level already) → notify ADMIN

---

## API Endpoints

Mount at `food_safety_officers/urls.py` under `/api/v1/officer-assignments/`:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/officer-assignments/<complaint_id>/` | CUSTOMER (own) / REVIEWER / ADMIN | Get current active assignment for a complaint |
| PATCH | `/api/v1/officer-assignments/<id>/` | Officer / ADMIN | Update status + investigation_notes |
| GET | `/api/v1/officer-assignments/` | REVIEWER / ADMIN | List all assignments |

---

## Admin Configuration

Register in Django admin:
- `FoodSafetyOfficer` — CRUD for officers and jurisdiction mapping
- `RestaurantOfficerMapping` — assign officer to restaurant (inline on Restaurant)
- `OfficerComplaintAssignment` — read-only view + manual escalation override

Configurable env var:
```
OFFICER_ESCALATION_DEADLINE_DAYS=15   # default; can be overridden per assignment
```

---

## Migration Plan

1. Create `food_safety_officers/` app (new, does not modify existing apps)
2. Add `INSTALLED_APPS` entry
3. `python manage.py makemigrations food_safety_officers`
4. `python manage.py migrate`
5. Add officer users via admin, map restaurants via `RestaurantOfficerMapping`
6. Wire `OfficerAssignmentService.assign()` into `complaints/services.py`
7. Add `check_officer_deadlines` management command + schedule
8. Add new notification event types: `OFFICER_ASSIGNED`, `OFFICER_ESCALATED`
   to `notifications/models.py::Notification.EventType`
9. Set `OFFICER_WORKFLOW_ENABLED = True` in `OfficerWorkflowSeam.tsx`

The existing `Escalation` model, views, serializers and tests are **not
modified** at any step. The officer hierarchy is fully independent.
