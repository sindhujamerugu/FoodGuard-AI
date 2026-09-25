from django.conf import settings
from django.db import models


class Escalation(models.Model):
    """
    An application-level escalation of a Complaint to a higher review tier.

    Escalation levels
    -----------------
    These are internal workflow levels ONLY.
    They do NOT map automatically to any government authority,
    external regulatory body, or real-world enforcement agency.

    LEVEL_1 — First higher-level review within the platform
    LEVEL_2 — Further escalation to senior reviewer/admin
    LEVEL_3 — Highest application-level review available

    Creation rules
    --------------
    - Only REVIEWER or ADMIN may create an escalation.
    - created_by is always derived from request.user (never spoofable).
    - assigned_to must be a REVIEWER or ADMIN if provided.
    - Only one active escalation (PENDING/IN_REVIEW) per Complaint at a time.
      Historical RESOLVED/CLOSED escalations are allowed.
    - The associated Complaint should be in UNDER_REVIEW status.

    Multilingual
    ------------
    - original_language is derived from request.user.preferred_language
      at creation and is immutable thereafter.
    - reason is stored exactly as entered.
    - A future TranslationService can translate reviewer-facing content
      without overwriting the original.
    """

    # ------------------------------------------------------------------
    # Level choices
    # ------------------------------------------------------------------

    class Level(models.TextChoices):
        LEVEL_1 = "LEVEL_1", "Level 1 — First Higher Review"
        LEVEL_2 = "LEVEL_2", "Level 2 — Further Escalation"
        LEVEL_3 = "LEVEL_3", "Level 3 — Highest Application Review"

    # ------------------------------------------------------------------
    # Status choices
    # ------------------------------------------------------------------

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_REVIEW = "IN_REVIEW", "In Review"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

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

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    complaint = models.ForeignKey(
        "complaints.Complaint",
        on_delete=models.PROTECT,
        related_name="escalations",
        verbose_name="complaint",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_escalations",
        verbose_name="created by",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_escalations",
        verbose_name="assigned to",
    )

    escalation_level = models.CharField(
        max_length=10,
        choices=Level.choices,
        default=Level.LEVEL_1,
        db_index=True,
        verbose_name="escalation level",
    )

    reason = models.TextField(verbose_name="reason")

    original_language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.ENGLISH,
        db_index=True,
        verbose_name="original language",
        help_text=(
            "Derived from created_by.preferred_language at creation. "
            "Immutable after creation."
        ),
    )

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="status",
    )

    resolution_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="resolution notes",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="resolved at",
    )

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "escalation"
        verbose_name_plural = "escalations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["complaint"], name="escalation_complaint_idx"),
            models.Index(fields=["status"], name="escalation_status_idx"),
            models.Index(
                fields=["escalation_level"], name="escalation_level_idx"
            ),
            models.Index(
                fields=["assigned_to"], name="escalation_assigned_idx"
            ),
            models.Index(fields=["created_at"], name="escalation_created_idx"),
            models.Index(
                fields=["original_language"], name="escalation_language_idx"
            ),
        ]

    def __str__(self) -> str:
        return (
            f"Escalation [{self.status}] {self.escalation_level} "
            f"complaint_id={self.complaint_id}"
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @property
    def is_active(self) -> bool:
        """True while an escalation is still open (PENDING or IN_REVIEW)."""
        return self.status in (self.Status.PENDING, self.Status.IN_REVIEW)

    @property
    def is_resolved(self) -> bool:
        return self.status in (self.Status.RESOLVED, self.Status.CLOSED)
