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
            name="Escalation",
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
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="escalations",
                        to="complaints.complaint",
                        verbose_name="complaint",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="created_escalations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="created by",
                    ),
                ),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_escalations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="assigned to",
                    ),
                ),
                (
                    "escalation_level",
                    models.CharField(
                        choices=[
                            ("LEVEL_1", "Level 1 — First Higher Review"),
                            ("LEVEL_2", "Level 2 — Further Escalation"),
                            ("LEVEL_3", "Level 3 — Highest Application Review"),
                        ],
                        db_index=True,
                        default="LEVEL_1",
                        max_length=10,
                        verbose_name="escalation level",
                    ),
                ),
                (
                    "reason",
                    models.TextField(verbose_name="reason"),
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
                        help_text="Derived from created_by.preferred_language at creation. Immutable after creation.",
                        max_length=5,
                        verbose_name="original language",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("IN_REVIEW", "In Review"),
                            ("RESOLVED", "Resolved"),
                            ("CLOSED", "Closed"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=10,
                        verbose_name="status",
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
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
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
                "verbose_name": "escalation",
                "verbose_name_plural": "escalations",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="escalation",
            index=models.Index(
                fields=["complaint"], name="escalation_complaint_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="escalation",
            index=models.Index(
                fields=["status"], name="escalation_status_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="escalation",
            index=models.Index(
                fields=["escalation_level"], name="escalation_level_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="escalation",
            index=models.Index(
                fields=["assigned_to"], name="escalation_assigned_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="escalation",
            index=models.Index(
                fields=["created_at"], name="escalation_created_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="escalation",
            index=models.Index(
                fields=["original_language"], name="escalation_language_idx"
            ),
        ),
    ]
