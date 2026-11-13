from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("complaints", "0004_revieweractivity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="revieweractivity",
            name="action_type",
            field=models.CharField(
                choices=[
                    ("COMPLAINT_STATUS_CHANGED", "Complaint status changed"),
                    ("COMPLAINT_REJECTED", "Complaint rejected"),
                    ("COMPLAINT_PRIORITY_CHANGED", "Complaint priority changed"),
                    ("COMPLAINT_RESOLVED", "Complaint resolved"),
                    ("ESCALATION_CREATED", "Escalation created"),
                    ("ESCALATION_UPDATED", "Escalation updated"),
                    ("INVESTIGATION_STARTED", "Investigation started"),
                    ("INVESTIGATION_UPDATED", "Investigation updated"),
                    ("INVESTIGATION_COMPLETED", "Investigation completed"),
                    ("INVESTIGATION_AWAITING_INFORMATION", "Investigation awaiting information"),
                ],
                db_index=True,
                max_length=64,
                verbose_name="action type",
            ),
        ),
        migrations.CreateModel(
            name="ComplaintInvestigation",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("NOT_STARTED", "Not Started"),
                            ("IN_PROGRESS", "In Progress"),
                            ("AWAITING_INFORMATION", "Awaiting Information"),
                            ("COMPLETED", "Completed"),
                        ],
                        db_index=True,
                        default="NOT_STARTED",
                        max_length=24,
                        verbose_name="status",
                    ),
                ),
                ("summary", models.TextField(blank=True, default="", verbose_name="investigation summary")),
                ("findings", models.TextField(blank=True, default="", verbose_name="findings")),
                ("observations", models.TextField(blank=True, default="", verbose_name="observations")),
                ("evidence_review_notes", models.TextField(blank=True, default="", verbose_name="evidence review notes")),
                ("actions_taken", models.TextField(blank=True, default="", verbose_name="actions taken")),
                (
                    "recommendation",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("RESOLVE_COMPLAINT", "Resolve complaint"),
                            ("REJECT_COMPLAINT", "Reject complaint"),
                            ("ESCALATE_COMPLAINT", "Escalate complaint"),
                            ("REQUEST_MORE_INFORMATION", "Request more information"),
                        ],
                        default="",
                        max_length=32,
                        verbose_name="recommendation",
                    ),
                ),
                ("remarks", models.TextField(blank=True, default="", verbose_name="remarks")),
                ("started_at", models.DateTimeField(blank=True, null=True, verbose_name="started at")),
                ("completed_at", models.DateTimeField(blank=True, null=True, verbose_name="completed at")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                (
                    "assigned_reviewer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_complaint_investigations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="assigned reviewer",
                    ),
                ),
                (
                    "complaint",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="investigation",
                        to="complaints.complaint",
                        verbose_name="complaint",
                    ),
                ),
                (
                    "investigator",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="complaint_investigations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="investigator",
                    ),
                ),
            ],
            options={
                "verbose_name": "complaint investigation",
                "verbose_name_plural": "complaint investigations",
                "ordering": ["-updated_at"],
            },
        ),
    ]
