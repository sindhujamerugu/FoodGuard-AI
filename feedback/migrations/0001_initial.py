import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("complaints", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Feedback",
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
                    "complaint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedback",
                        to="complaints.complaint",
                        verbose_name="complaint",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="feedback",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="customer",
                    ),
                ),
                (
                    "rating",
                    models.PositiveSmallIntegerField(
                        help_text="Customer satisfaction rating from 1 (lowest) to 5 (highest).",
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(5),
                        ],
                        verbose_name="rating",
                    ),
                ),
                (
                    "comments",
                    models.TextField(
                        blank=True,
                        default="",
                        help_text="Customer's own comments, stored exactly as entered.",
                        verbose_name="comments",
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
                        help_text="Derived from customer.preferred_language at creation. Immutable after creation.",
                        max_length=5,
                        verbose_name="original language",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "feedback",
                "verbose_name_plural": "feedback",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="feedback",
            constraint=models.UniqueConstraint(
                fields=["complaint"],
                name="unique_feedback_per_complaint",
            ),
        ),
        migrations.AddIndex(
            model_name="feedback",
            index=models.Index(
                fields=["customer"], name="feedback_customer_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="feedback",
            index=models.Index(
                fields=["complaint"], name="feedback_complaint_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="feedback",
            index=models.Index(
                fields=["rating"], name="feedback_rating_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="feedback",
            index=models.Index(
                fields=["original_language"], name="feedback_language_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="feedback",
            index=models.Index(
                fields=["created_at"], name="feedback_created_idx"
            ),
        ),
    ]
