"""
food_safety_officers — Prototype 5-Level Escalation Workflow
=============================================================

PROTOTYPE DISCLAIMER
--------------------
This is a prototype workflow for development and testing purposes.
It is NOT an officially integrated government complaint escalation system.
No real Food Safety Officers, FSSAI officials or government accounts are
linked. All designation-based accounts are explicitly created as prototype
test accounts by administrators.

Models
------
1. EscalationLevel     — configurable hierarchy levels (Level 1–5, admin-managed)
2. PrototypeOfficer    — designation-based accounts at a given level
3. RestaurantOfficerMapping — maps each restaurant → its Level-1 officer
4. OfficerComplaintAssignment — tracks which officer holds a complaint + hold state
5. EscalationEvent     — append-only audit trail of every escalation transition
"""

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# 1. EscalationLevel
# ---------------------------------------------------------------------------

class EscalationLevel(models.Model):
    """
    Configurable escalation hierarchy level.

    Administrators can:
    - add, rename, enable/disable levels
    - reorder them (order field)
    - set a per-level response_deadline_days
    """

    name = models.CharField(
        max_length=120,
        verbose_name="level name",
        help_text="e.g. 'Designated Mandal-level Food Safety Officer'",
    )
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="code",
        help_text="Short machine-readable identifier, e.g. LEVEL_1",
    )
    order = models.PositiveSmallIntegerField(
        verbose_name="order",
        help_text="Lower = first in the chain (Level 1 = 1).",
    )
    is_enabled = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="enabled",
        help_text="Disabled levels are skipped during auto-escalation.",
    )
    response_deadline_days = models.PositiveSmallIntegerField(
        default=15,
        verbose_name="response deadline (days)",
        help_text=(
            "Number of days after assignment before auto-escalation fires. "
            "Default 15. Use small values (e.g. 1) in development for testing."
        ),
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="description",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "escalation level"
        verbose_name_plural = "escalation levels"
        ordering = ["order"]

    def __str__(self) -> str:
        status = "" if self.is_enabled else " [DISABLED]"
        return f"{self.order}. {self.name}{status}"


# ---------------------------------------------------------------------------
# 2. PrototypeOfficer
# ---------------------------------------------------------------------------

class PrototypeOfficer(models.Model):
    """
    A designation-based prototype officer account.

    Rules:
    - user must have role REVIEWER or ADMIN (enforced at service layer)
    - designation is a free-text label: "Mandal-level FSO – Kukatpally"
    - jurisdiction: state/district/mandal where applicable
    - is_active: administrators can deactivate without deleting
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="officer_profile",
        verbose_name="user account",
    )
    level = models.ForeignKey(
        EscalationLevel,
        on_delete=models.PROTECT,
        related_name="officers",
        verbose_name="escalation level",
    )
    designation = models.CharField(
        max_length=255,
        verbose_name="designation",
        help_text="Prototype designation label, e.g. 'Kukatpally Mandal — FSO (Prototype)'.",
    )
    jurisdiction = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="jurisdiction",
        help_text="Geographical scope of this officer's responsibility.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "prototype officer"
        verbose_name_plural = "prototype officers"
        ordering = ["level__order", "designation"]

    def __str__(self) -> str:
        return f"[{self.level.code}] {self.designation}"


# ---------------------------------------------------------------------------
# 3. RestaurantOfficerMapping
# ---------------------------------------------------------------------------

class RestaurantOfficerMapping(models.Model):
    """
    Maps each restaurant to its designated Level-1 prototype officer.

    - Administrators create these records via the admin interface.
    - When a complaint is filed against a restaurant that has a mapping,
      the complaint is automatically assigned to the mapped Level-1 officer.
    - If no mapping exists, the complaint is marked AWAITING_ASSIGNMENT.
    - Only one active mapping per restaurant (enforced by OneToOneField).
    """

    restaurant = models.OneToOneField(
        "restaurants.Restaurant",
        on_delete=models.CASCADE,
        related_name="officer_mapping",
        verbose_name="restaurant",
    )
    level_1_officer = models.ForeignKey(
        PrototypeOfficer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_restaurants",
        verbose_name="Level-1 officer",
        help_text=(
            "The designated Level-1 prototype officer for this restaurant's jurisdiction. "
            "Leave blank to mark as AWAITING_ASSIGNMENT."
        ),
    )
    jurisdiction_notes = models.TextField(
        blank=True, default="",
        verbose_name="jurisdiction notes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "restaurant officer mapping"
        verbose_name_plural = "restaurant officer mappings"

    def __str__(self) -> str:
        officer = self.level_1_officer.designation if self.level_1_officer else "AWAITING ASSIGNMENT"
        return f"{self.restaurant.name} → {officer}"


# ---------------------------------------------------------------------------
# 4. OfficerComplaintAssignment
# ---------------------------------------------------------------------------

class OfficerComplaintAssignment(models.Model):
    """
    Tracks which officer currently holds a complaint and
    manages the hold state.

    Exactly one ACTIVE assignment per complaint at any time.
    When a complaint is escalated, the current assignment is
    marked ESCALATED and a new one is created for the next level.

    States
    ------
    ASSIGNED          — newly routed, officer has not yet acted
    UNDER_INVESTIGATION — officer actively working
    ACTION_TAKEN       — officer has recorded an action
    ESCALATED          — exceeded deadline; superseded by next-level assignment
    RESOLVED           — complaint resolved at this level
    ON_HOLD            — administrative hold; deadline paused
    """

    class AssignmentStatus(models.TextChoices):
        ASSIGNED            = "ASSIGNED",            "Assigned"
        UNDER_INVESTIGATION = "UNDER_INVESTIGATION", "Under Investigation"
        ACTION_TAKEN        = "ACTION_TAKEN",        "Action Taken"
        ESCALATED           = "ESCALATED",           "Escalated"
        RESOLVED            = "RESOLVED",            "Resolved"
        ON_HOLD             = "ON_HOLD",             "On Hold"

    complaint = models.ForeignKey(
        "complaints.Complaint",
        on_delete=models.CASCADE,
        related_name="officer_assignments",
        verbose_name="complaint",
    )
    officer = models.ForeignKey(
        PrototypeOfficer,
        on_delete=models.PROTECT,
        related_name="complaint_assignments",
        verbose_name="officer",
    )
    level = models.ForeignKey(
        EscalationLevel,
        on_delete=models.PROTECT,
        related_name="assignments",
        verbose_name="escalation level",
    )
    status = models.CharField(
        max_length=25,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ASSIGNED,
        db_index=True,
        verbose_name="status",
    )
    investigation_notes = models.TextField(
        blank=True, default="",
        verbose_name="investigation notes",
        help_text="Visible to administrators and the officer; NOT exposed to customers.",
    )
    action_taken = models.TextField(
        blank=True, default="",
        verbose_name="action taken",
        help_text="Customer-visible summary of action taken.",
    )
    assigned_at = models.DateTimeField(auto_now_add=True, db_index=True)
    deadline_at = models.DateTimeField(
        verbose_name="response deadline",
        db_index=True,
    )
    # Hold management
    hold_started_at  = models.DateTimeField(null=True, blank=True)
    hold_reason      = models.TextField(blank=True, default="")
    # Deadline extension: total days on hold added to original deadline
    hold_duration_days = models.PositiveIntegerField(default=0)

    updated_at  = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "officer complaint assignment"
        verbose_name_plural = "officer complaint assignments"
        ordering = ["-assigned_at"]
        indexes = [
            models.Index(fields=["complaint"], name="fso_assign_complaint_idx"),
            models.Index(fields=["officer"],   name="fso_assign_officer_idx"),
            models.Index(fields=["status"],    name="fso_assign_status_idx"),
            models.Index(fields=["deadline_at"], name="fso_assign_deadline_idx"),
        ]

    def __str__(self) -> str:
        return (
            f"Assignment #{self.pk}: Complaint #{self.complaint_id} → "
            f"{self.officer.designation} [{self.status}]"
        )

    @property
    def is_active(self) -> bool:
        return self.status in (
            self.AssignmentStatus.ASSIGNED,
            self.AssignmentStatus.UNDER_INVESTIGATION,
            self.AssignmentStatus.ACTION_TAKEN,
            self.AssignmentStatus.ON_HOLD,
        )

    @property
    def effective_deadline(self):
        """Deadline adjusted for time spent on hold."""
        from datetime import timedelta
        return self.deadline_at + timedelta(days=self.hold_duration_days)

    @property
    def is_overdue(self) -> bool:
        if self.status == self.AssignmentStatus.ON_HOLD:
            return False
        if not self.is_active:
            return False
        return timezone.now() > self.effective_deadline


# ---------------------------------------------------------------------------
# 5. EscalationEvent
# ---------------------------------------------------------------------------

class EscalationEvent(models.Model):
    """
    Append-only audit trail — one row per escalation transition.

    Never overwritten. Every escalation is a new row.
    Duplicate escalation events for the same complaint + level are
    prevented at the service layer.
    """

    class TriggerType(models.TextChoices):
        AUTOMATIC      = "AUTOMATIC",      "Automatic (deadline exceeded)"
        ADMINISTRATIVE = "ADMINISTRATIVE", "Administrative (manual)"

    complaint = models.ForeignKey(
        "complaints.Complaint",
        on_delete=models.CASCADE,
        related_name="escalation_events",
        verbose_name="complaint",
    )
    from_level = models.ForeignKey(
        EscalationLevel,
        on_delete=models.PROTECT,
        null=True, blank=True,
        related_name="events_from",
        verbose_name="previous level",
        help_text="null for the initial assignment (no previous level).",
    )
    to_level = models.ForeignKey(
        EscalationLevel,
        on_delete=models.PROTECT,
        related_name="events_to",
        verbose_name="new level",
    )
    from_officer = models.ForeignKey(
        PrototypeOfficer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="events_from",
        verbose_name="previous officer",
    )
    to_officer = models.ForeignKey(
        PrototypeOfficer,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="events_to",
        verbose_name="new officer",
    )
    trigger       = models.CharField(
        max_length=20,
        choices=TriggerType.choices,
        default=TriggerType.AUTOMATIC,
        db_index=True,
    )
    reason        = models.TextField(verbose_name="reason")
    deadline_exceeded_at = models.DateTimeField(
        null=True, blank=True,
        verbose_name="deadline that was exceeded",
    )
    performed_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="performed_escalations",
        verbose_name="performed by",
        help_text="null for automatic escalations.",
    )
    # Customer-visible summary (never expose internal notes here)
    customer_message = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="customer-visible message",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "escalation event"
        verbose_name_plural = "escalation events"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["complaint"], name="fso_event_complaint_idx"),
            models.Index(fields=["trigger"],   name="fso_event_trigger_idx"),
            models.Index(fields=["created_at"], name="fso_event_created_idx"),
        ]

    def __str__(self) -> str:
        frm = self.from_level.code if self.from_level else "INITIAL"
        return (
            f"EscalationEvent #{self.pk}: Complaint #{self.complaint_id} "
            f"{frm} → {self.to_level.code} [{self.trigger}]"
        )
