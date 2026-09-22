import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("restaurants", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FoodReport",
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
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="food_reports",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="customer",
                    ),
                ),
                (
                    "restaurant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="food_reports",
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
                    "image",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="food_reports/",
                        verbose_name="image",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("DRAFT", "Draft"),
                            ("SUBMITTED", "Submitted"),
                            ("UNDER_REVIEW", "Under Review"),
                            ("RESOLVED", "Resolved"),
                            ("CLOSED", "Closed"),
                        ],
                        db_index=True,
                        default="DRAFT",
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
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
            ],
            options={
                "verbose_name": "food report",
                "verbose_name_plural": "food reports",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="foodreport",
            index=models.Index(
                fields=["customer"], name="report_customer_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="foodreport",
            index=models.Index(
                fields=["restaurant"], name="report_restaurant_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="foodreport",
            index=models.Index(
                fields=["status"], name="report_status_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="foodreport",
            index=models.Index(
                fields=["priority"], name="report_priority_idx"
            ),
        ),
    ]
