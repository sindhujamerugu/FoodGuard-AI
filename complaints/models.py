from django.conf import settings
from django.db import models


class ReviewerActivity(models.Model):
    """
    Immutable audit trail for reviewer/admin actions.

    This model is deliberately backend-owned and append-only: reviewers do not
    submit these records from the client. The service layer writes the record
    after a trusted workflow transition is validated, ensuring the audit trail
    reflects the actual action taken by the authenticated reviewer/admin.
    """

    class ActionType(models.TextChoices):
        COMPLAINT_STATUS_CHANGED = "COMPLAINT_STATUS_CHANGED", "Complaint status changed"
        COMPLAINT_REJECTED = "COMPLAINT_REJECTED", "Complaint rejected"
        COMPLAINT_PRIORITY_CHANGED = "COMPLAINT_PRIORITY_CHANGED", "Complaint priority changed"
        COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED", "Complaint resolved"
        ESCALATION_CREATED = "ESCALATION_CREATED", "Escalation created"
        ESCALATION_UPDATED = "ESCALATION_UPDATED", "Escalation updated"
        INVESTIGATION_STARTED = "INVESTIGATION_STARTED", "Investigation started"
        INVESTIGATION_UPDATED = "INVESTIGATION_UPDATED", "Investigation updated"
        INVESTIGATION_COMPLETED = "INVESTIGATION_COMPLETED", "Investigation completed"
        INVESTIGATION_AWAITING_INFORMATION = "INVESTIGATION_AWAITING_INFORMATION", "Investigation awaiting information"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewer_activities",
        verbose_name="actor",
    )
    complaint = models.ForeignKey(
        "Complaint",
        on_delete=models.CASCADE,
        related_name="reviewer_activities",
        verbose_name="complaint",
        blank=True,
        null=True,
    )
    escalation = models.ForeignKey(
        "escalation.Escalation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewer_activities",
        verbose_name="escalation",
    )
    action_type = models.CharField(
        max_length=64,
        choices=ActionType.choices,
        db_index=True,
        verbose_name="action type",
    )
    summary = models.TextField(verbose_name="summary")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="metadata")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "reviewer activity"
        verbose_name_plural = "reviewer activities"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["complaint", "created_at"], name="ra_complaint_created_idx"),
            models.Index(fields=["actor", "created_at"], name="ra_actor_created_idx"),
            models.Index(fields=["action_type", "created_at"], name="ra_action_created_idx"),
        ]

    def __str__(self) -> str:
        actor = self.actor.full_name if self.actor else "system"
        return f"{actor} — {self.action_type} ({self.created_at:%Y-%m-%d %H:%M})"


class ComplaintInvestigation(models.Model):
    """Structured review investigation tied to a complaint."""

    class Status(models.TextChoices):
        NOT_STARTED = "NOT_STARTED", "Not Started"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        AWAITING_INFORMATION = "AWAITING_INFORMATION", "Awaiting Information"
        COMPLETED = "COMPLETED", "Completed"

    class Recommendation(models.TextChoices):
        RESOLVE_COMPLAINT = "RESOLVE_COMPLAINT", "Resolve complaint"
        REJECT_COMPLAINT = "REJECT_COMPLAINT", "Reject complaint"
        ESCALATE_COMPLAINT = "ESCALATE_COMPLAINT", "Escalate complaint"
        REQUEST_MORE_INFORMATION = "REQUEST_MORE_INFORMATION", "Request more information"

    complaint = models.OneToOneField(
        "Complaint",
        on_delete=models.CASCADE,
        related_name="investigation",
        verbose_name="complaint",
    )
    investigator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaint_investigations",
        verbose_name="investigator",
    )
    assigned_reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_complaint_investigations",
        verbose_name="assigned reviewer",
    )
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.NOT_STARTED,
        db_index=True,
        verbose_name="status",
    )
    summary = models.TextField(blank=True, default="", verbose_name="investigation summary")
    findings = models.TextField(blank=True, default="", verbose_name="findings")
    observations = models.TextField(blank=True, default="", verbose_name="observations")
    evidence_review_notes = models.TextField(blank=True, default="", verbose_name="evidence review notes")
    actions_taken = models.TextField(blank=True, default="", verbose_name="actions taken")
    recommendation = models.CharField(
        max_length=32,
        choices=Recommendation.choices,
        blank=True,
        default="",
        verbose_name="recommendation",
    )
    remarks = models.TextField(blank=True, default="", verbose_name="remarks")
    started_at = models.DateTimeField(null=True, blank=True, verbose_name="started at")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="completed at")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "complaint investigation"
        verbose_name_plural = "complaint investigations"

    def __str__(self) -> str:
        return f"Complaint #{self.complaint_id} investigation ({self.status})"


class Complaint(models.Model):
    """
    A formal customer complaint linked to a submitted FoodReport.

    Business rules (enforced at service/serializer layer)
    ----------------------------------------------------
    - Only one active Complaint per FoodReport (unique constraint + service guard).
    - Complaint can only be created against a SUBMITTED FoodReport.
    - customer and restaurant are derived server-side — never accepted from
      the client payload.
    - Customers cannot change workflow fields (status, priority,
      resolution_notes) after creation.
    - Reviewer / Admin controls the lifecycle.

    Multilingual
    ------------
    - original_language is derived from request.user.preferred_language at
      creation and is immutable thereafter.
    - title and description are stored exactly as entered.
    - A future TranslationService will produce localised output without
      overwriting these originals.
    """

    # ------------------------------------------------------------------
    # Category choices
    # ------------------------------------------------------------------

    class Category(models.TextChoices):
        FOOD_QUALITY = "FOOD_QUALITY", "Food Quality"
        SPOILAGE = "SPOILAGE", "Spoilage"
        FOREIGN_OBJECT = "FOREIGN_OBJECT", "Foreign Object"
        HYGIENE = "HYGIENE", "Hygiene"
        TASTE_OR_ODOR = "TASTE_OR_ODOR", "Taste or Odor"
        OTHER = "OTHER", "Other"

    # ------------------------------------------------------------------
    # Status choices
    # ------------------------------------------------------------------

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"
        REJECTED = "REJECTED", "Rejected"

    # ------------------------------------------------------------------
    # Priority choices
    # ------------------------------------------------------------------

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    # ------------------------------------------------------------------
    # Language choices (mirrors users.User.Language)
    # ------------------------------------------------------------------

    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        TELUGU = "te", "Telugu"
        HINDI = "hi", "Hindi"
        TAMIL = "ta", "Tamil"
        KANNADA = "kn", "Kannada"
        MARATHI = "mr", "Marathi"
        MALAYALAM = "ml", "Malayalam"

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    food_report = models.ForeignKey(
        "food_reports.FoodReport",
        on_delete=models.PROTECT,
        related_name="complaints",
        verbose_name="food report",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
        verbose_name="customer",
    )

    restaurant = models.ForeignKey(
        "restaurants.Restaurant",
        on_delete=models.PROTECT,
        related_name="complaints",
        verbose_name="restaurant",
    )

    title = models.CharField(max_length=255, verbose_name="title")

    description = models.TextField(verbose_name="description")

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        db_index=True,
        verbose_name="category",
    )

    original_language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.ENGLISH,
        db_index=True,
        verbose_name="original language",
        help_text=(
            "Derived from the customer's preferred_language at the time of "
            "submission. Immutable after creation. "
            "A future TranslationService will translate content without "
            "overwriting the original text."
        ),
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUBMITTED,
        db_index=True,
        verbose_name="status",
    )

    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.LOW,
        db_index=True,
        verbose_name="priority",
    )

    resolution_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="resolution notes",
    )

    rejection_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="rejection reason",
    )

    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_complaints",
        verbose_name="rejected by",
    )

    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="resolved at",
    )

    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="rejected at",
    )

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "complaint"
        verbose_name_plural = "complaints"
        ordering = ["-submitted_at"]
        # One active complaint per FoodReport (MVP rule)
        constraints = [
            models.UniqueConstraint(
                fields=["food_report"],
                name="unique_complaint_per_food_report",
            )
        ]
        indexes = [
            models.Index(fields=["customer"], name="complaint_customer_idx"),
            models.Index(fields=["restaurant"], name="complaint_restaurant_idx"),
            models.Index(fields=["status"], name="complaint_status_idx"),
            models.Index(fields=["priority"], name="complaint_priority_idx"),
            models.Index(fields=["submitted_at"], name="complaint_submitted_idx"),
            models.Index(
                fields=["original_language"], name="complaint_language_idx"
            ),
        ]

    def __str__(self) -> str:
        return f"[{self.status}] {self.title} (report #{self.food_report_id})"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def is_resolved(self) -> bool:
        return self.status in (self.Status.RESOLVED, self.Status.CLOSED)

    @property
    def is_rejected(self) -> bool:
        return self.status == self.Status.REJECTED

    @property
    def is_terminal(self) -> bool:
        return self.status in (self.Status.CLOSED, self.Status.REJECTED)
