import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("food_reports", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AIAnalysis",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "food_report",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_analysis",
                        to="food_reports.foodreport",
                        verbose_name="food report",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("PROCESSING", "Processing"),
                            ("COMPLETED", "Completed"),
                            ("FAILED", "Failed"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=20,
                        verbose_name="analysis status",
                    ),
                ),
                (
                    "risk",
                    models.CharField(
                        choices=[
                            ("LOW", "Low"),
                            ("MEDIUM", "Medium"),
                            ("HIGH", "High"),
                            ("HUMAN_REVIEW", "Human Review Required"),
                        ],
                        db_index=True,
                        default="LOW",
                        help_text="Preliminary visual risk indicator. Not a scientific food-safety determination.",
                        max_length=20,
                        verbose_name="risk level",
                    ),
                ),
                (
                    "confidence",
                    models.DecimalField(
                        decimal_places=3,
                        default=0.0,
                        help_text="Model confidence between 0.0 and 1.0.",
                        max_digits=4,
                        validators=[
                            django.core.validators.MinValueValidator(0.0),
                            django.core.validators.MaxValueValidator(1.0),
                        ],
                        verbose_name="confidence score",
                    ),
                ),
                (
                    "concerns",
                    models.JSONField(
                        default=list,
                        help_text="Structured list of preliminary visual concern identifiers.",
                        verbose_name="concern labels",
                    ),
                ),
                (
                    "message",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Human-readable preliminary visual assessment. Not a scientific food-safety certification.",
                        verbose_name="assessment message",
                    ),
                ),
                (
                    "analyzed_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="analyzed at",
                    ),
                ),
                (
                    "model_name",
                    models.CharField(
                        default="mock-foodguard-ai",
                        max_length=100,
                        verbose_name="model name",
                    ),
                ),
                (
                    "model_version",
                    models.CharField(
                        default="0.1.0",
                        max_length=50,
                        verbose_name="model version",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "AI analysis",
                "verbose_name_plural": "AI analyses",
                "ordering": ["-created_at"],
            },
        ),
    ]
