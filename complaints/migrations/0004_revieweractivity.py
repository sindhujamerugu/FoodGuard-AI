import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("complaints", "0003_add_rejected_status_and_rejection_fields"),
        ("escalation", "0002_add_malayalam_language"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReviewerActivity",
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
                    "action_type",
                    models.CharField(
                        choices=[
                            ("COMPLAINT_STATUS_CHANGED", "Complaint status changed"),
                            ("COMPLAINT_REJECTED", "Complaint rejected"),
                            ("COMPLAINT_PRIORITY_CHANGED", "Complaint priority changed"),
                            ("COMPLAINT_RESOLVED", "Complaint resolved"),
                            ("ESCALATION_CREATED", "Escalation created"),
                            ("ESCALATION_UPDATED", "Escalation updated"),
                        ],
                        db_index=True,
                        max_length=32,
                        verbose_name="action type",
                    ),
                ),
                ("summary", models.TextField(verbose_name="summary")),
                (
                    "metadata",
                    models.JSONField(blank=True, default=dict, verbose_name="metadata"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewer_activities",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="actor",
                    ),
                ),
                (
                    "complaint",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reviewer_activities",
                        to="complaints.complaint",
                        verbose_name="complaint",
                    ),
                ),
                (
                    "escalation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewer_activities",
                        to="escalation.escalation",
                        verbose_name="escalation",
                    ),
                ),
            ],
            options={
                "verbose_name": "reviewer activity",
                "verbose_name_plural": "reviewer activities",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["complaint", "created_at"],
                        name="ra_complaint_created_idx",
                    ),
                    models.Index(
                        fields=["actor", "created_at"], name="ra_actor_created_idx"
                    ),
                    models.Index(
                        fields=["action_type", "created_at"],
                        name="ra_action_created_idx",
                    ),
                ],
            },
        ),
    ]
