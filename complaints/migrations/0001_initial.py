import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("food_reports", "0001_initial"),
        ("restaurants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Complaint",
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
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="complaints",
                        to="food_reports.foodreport",
                        verbose_name="food report",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="complaints",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="customer",
                    ),
                ),
                (
                    "restaurant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="complaints",
                        to="restaurants.restaurant",
                        verbose_name="restaurant",
                    ),
                ),
                (
                    "title",
                    models.CharField(max_length=255, verbose_name="title"),
                ),
                (
                    "description",
                    models.TextField(verbose_name="description"),
                ),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("FOOD_QUALITY", "Food Quality"),
                            ("SPOILAGE", "Spoilage"),
                            ("FOREIGN_OBJECT", "Foreign Object"),
                            ("HYGIENE", "Hygiene"),
                            ("TASTE_OR_ODOR", "Taste or Odor"),
                            ("OTHER", "Other"),
                        ],
                        db_index=True,
                        max_length=20,
                        verbose_name="category",
                    ),
                ),
                (
                    "original_language",
                    models.CharField(
                        choices=[
                            ("en", "English"),
                            ("te", "Telugu"),
                            ("hi", "Hindi"),
                            ("ta", "Tamil"),
                            ("kn", "Kannada"),
                            ("mr", "Marathi"),
                        ],
                        db_index=True,
                        default="en",
                        help_text=(
                            "Derived from the customer's preferred_language at "
                            "the time of submission. Immutable after creation. "
                            "A future TranslationService will translate content "
                            "without overwriting the original text."
                        ),
                        max_length=5,
                        verbose_name="original language",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("SUBMITTED", "Submitted"),
                            ("UNDER_REVIEW", "Under Review"),
                            ("RESOLVED", "Resolved"),
                            ("CLOSED", "Closed"),
                        ],
                        db_index=True,
                        default="SUBMITTED",
                        max_length=20,
                        verbose_name="status",
                    ),
                ),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("LOW", "Low"),
                            ("MEDIUM", "Medium"),
                            ("HIGH", "High"),
                            ("CRITICAL", "Critical"),
                        ],
                        db_index=True,
                        default="LOW",
                        max_length=10,
                        verbose_name="priority",
                    ),
                ),
                (
                    "resolution_notes",
                    models.TextField(
                        blank=True,
                        default="",
                        verbose_name="resolution notes",
                    ),
                ),
                (
                    "submitted_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        db_index=True,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "resolved_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="resolved at",
                    ),
                ),
            ],
            options={
                "verbose_name": "complaint",
                "verbose_name_plural": "complaints",
                "ordering": ["-submitted_at"],
            },
        ),
        # One complaint per FoodReport (unique constraint)
        migrations.AddConstraint(
            model_name="complaint",
            constraint=models.UniqueConstraint(
                fields=["food_report"],
                name="unique_complaint_per_food_report",
            ),
        ),
        # Indexes
        migrations.AddIndex(
            model_name="complaint",
            index=models.Index(
                fields=["customer"], name="complaint_customer_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="complaint",
            index=models.Index(
                fields=["restaurant"], name="complaint_restaurant_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="complaint",
            index=models.Index(
                fields=["status"], name="complaint_status_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="complaint",
            index=models.Index(
                fields=["priority"], name="complaint_priority_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="complaint",
            index=models.Index(
                fields=["submitted_at"], name="complaint_submitted_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="complaint",
            index=models.Index(
                fields=["original_language"], name="complaint_language_idx"
            ),
        ),
    ]
