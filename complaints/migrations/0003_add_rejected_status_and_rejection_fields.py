from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("complaints", "0002_add_malayalam_language"),
    ]

    operations = [
        migrations.AddField(
            model_name="complaint",
            name="rejection_reason",
            field=models.TextField(blank=True, default="", verbose_name="rejection reason"),
        ),
        migrations.AddField(
            model_name="complaint",
            name="rejected_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="rejected_complaints",
                to=settings.AUTH_USER_MODEL,
                verbose_name="rejected by",
            ),
        ),
        migrations.AddField(
            model_name="complaint",
            name="rejected_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="rejected at"),
        ),
        migrations.AlterField(
            model_name="complaint",
            name="status",
            field=models.CharField(
                choices=[
                    ("SUBMITTED", "Submitted"),
                    ("UNDER_REVIEW", "Under Review"),
                    ("RESOLVED", "Resolved"),
                    ("CLOSED", "Closed"),
                    ("REJECTED", "Rejected"),
                ],
                db_index=True,
                default="SUBMITTED",
                max_length=20,
                verbose_name="status",
            ),
        ),
    ]

