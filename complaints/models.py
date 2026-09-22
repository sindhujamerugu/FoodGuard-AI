from django.conf import settings
from django.db import models


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

    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)
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
