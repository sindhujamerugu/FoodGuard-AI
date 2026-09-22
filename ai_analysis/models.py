from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class AIAnalysis(models.Model):
    """
    Stores the result of a preliminary AI visual assessment for a FoodReport.

    Design principles
    -----------------
    1. Language-independent storage — all fields are structured data.
       A future TranslationService reads `message` and `concerns` and
       converts them into the user's preferred_language without overwriting
       the originals stored here.

    2. Terminology — this is a PRELIMINARY VISUAL ASSESSMENT only.
       Results must never be presented as scientific food-safety
       certification, contamination proof, or restaurant guilt findings.

    3. One-to-one with FoodReport — at most one latest analysis record per
       report.  The service layer updates the existing record on re-analysis
       rather than inserting duplicates.

    4. Model metadata (model_name / model_version) is stored so that future
       upgrades to real ML models are traceable in the database.
    """

    # ------------------------------------------------------------------
    # Analysis status choices
    # ------------------------------------------------------------------

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    # ------------------------------------------------------------------
    # Risk level choices
    # IMPORTANT: these represent possible visual indicators only.
    # They do NOT constitute a scientific food-safety determination.
    # ------------------------------------------------------------------

    class Risk(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        HUMAN_REVIEW = "HUMAN_REVIEW", "Human Review Required"

    # ------------------------------------------------------------------
    # Fields
    # ------------------------------------------------------------------

    food_report = models.OneToOneField(
        "food_reports.FoodReport",
        on_delete=models.CASCADE,
        related_name="ai_analysis",
        verbose_name="food report",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="analysis status",
    )

    risk = models.CharField(
        max_length=20,
        choices=Risk.choices,
        default=Risk.LOW,
        db_index=True,
        verbose_name="risk level",
        help_text=(
            "Preliminary visual risk indicator. "
            "Not a scientific food-safety determination."
        ),
    )

    confidence = models.DecimalField(
        max_digits=4,
        decimal_places=3,
        default=0.0,
        validators=[
            MinValueValidator(0.0),
            MaxValueValidator(1.0),
        ],
        verbose_name="confidence score",
        help_text="Model confidence between 0.0 and 1.0.",
    )

    # Structured concern labels from the AI model.
    # JSONField stores a list of strings, e.g. ["uncertain"] or
    # ["foreign_object", "hygiene_indicator"].
    # Supported future labels:
    #   foreign_object, pest_insect, mold_like_growth,
    #   spoilage_indicator, undercooked_appearance, burnt_overcooked,
    #   packaging_issue, hygiene_indicator, normal, uncertain
    concerns = models.JSONField(
        default=list,
        verbose_name="concern labels",
        help_text="Structured list of preliminary visual concern identifiers.",
    )

    message = models.TextField(
        blank=True,
        default="",
        verbose_name="assessment message",
        help_text=(
            "Human-readable preliminary visual assessment. "
            "Not a scientific food-safety certification."
        ),
    )

    analyzed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="analyzed at",
    )

    # Model metadata — allows tracking which version produced the result.
    model_name = models.CharField(
        max_length=100,
        default="mock-foodguard-ai",
        verbose_name="model name",
    )

    model_version = models.CharField(
        max_length=50,
        default="0.1.0",
        verbose_name="model version",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------

    class Meta:
        verbose_name = "AI analysis"
        verbose_name_plural = "AI analyses"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return (
            f"AIAnalysis [{self.status}] risk={self.risk} "
            f"report_id={self.food_report_id}"
        )
