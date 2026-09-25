from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Feedback(models.Model):
    """
    Customer satisfaction feedback for a RESOLVED or CLOSED complaint.

    Business rules (enforced at service/serializer layer)
    ----------------------------------------------------
    - Only the customer who owns the complaint may submit feedback.
    - Feedback is only accepted when complaint.status is RESOLVED or CLOSED.
    - Only one Feedback per Complaint (unique DB constraint + service guard).
    - After creation, complaint and customer are immutable.
    - customer is always set from request.user — never from client payload.

    Multilingual
    ------------
    - original_language is derived from request.user.preferred_language.
    - comments are stored exactly as entered.
    - A future TranslationService may translate reviewer-facing output
      without overwriting the original text.
    """

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
        on_delete=models.CASCADE,
        related_name="feedback",
        verbose_name="complaint",
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="feedback",
        verbose_name="customer",
    )

    rating = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
        verbose_name="rating",
        help_text="Customer satisfaction rating from 1 (lowest) to 5 (highest).",
    )

    comments = models.TextField(
        blank=True,
        default="",
        verbose_name="comments",
        help_text="Customer's own comments, stored exactly as entered.",
    )

    original_language = models.CharField(
        max_length=5,
        choices=Language.choices,
        default=Language.ENGLISH,
        db_index=True,
        verbose_name="original language",
        help_text=(
            "Derived from customer.preferred_language at creation. "
            "Immutable after creation."
        ),
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "feedback"
        verbose_name_plural = "feedback"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["complaint"],
                name="unique_feedback_per_complaint",
            )
        ]
        indexes = [
            models.Index(fields=["customer"], name="feedback_customer_idx"),
            models.Index(fields=["complaint"], name="feedback_complaint_idx"),
            models.Index(fields=["rating"], name="feedback_rating_idx"),
            models.Index(
                fields=["original_language"], name="feedback_language_idx"
            ),
            models.Index(fields=["created_at"], name="feedback_created_idx"),
        ]

    def __str__(self) -> str:
        return (
            f"Feedback rating={self.rating} "
            f"complaint_id={self.complaint_id} "
            f"customer={self.customer_id}"
        )
