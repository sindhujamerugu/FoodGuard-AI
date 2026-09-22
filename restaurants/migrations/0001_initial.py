import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Restaurant",
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
                ("name", models.CharField(max_length=255, verbose_name="restaurant name")),
                (
                    "description",
                    models.TextField(blank=True, default="", verbose_name="description"),
                ),
                ("address", models.TextField(verbose_name="address")),
                (
                    "city",
                    models.CharField(db_index=True, max_length=100, verbose_name="city"),
                ),
                (
                    "state",
                    models.CharField(db_index=True, max_length=100, verbose_name="state"),
                ),
                ("pincode", models.CharField(max_length=10, verbose_name="pincode")),
                (
                    "contact_email",
                    models.EmailField(
                        blank=True, default="", max_length=254, verbose_name="contact email"
                    ),
                ),
                (
                    "contact_phone",
                    models.CharField(
                        blank=True, default="", max_length=20, verbose_name="contact phone"
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="owned_restaurants",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="owner",
                    ),
                ),
                (
                    "is_verified",
                    models.BooleanField(
                        db_index=True,
                        default=False,
                        help_text="Set by a Reviewer or Admin after platform verification.",
                        verbose_name="verified",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(db_index=True, default=True, verbose_name="active"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "restaurant",
                "verbose_name_plural": "restaurants",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="restaurant",
            index=models.Index(fields=["city"], name="restaurant_city_idx"),
        ),
        migrations.AddIndex(
            model_name="restaurant",
            index=models.Index(fields=["state"], name="restaurant_state_idx"),
        ),
        migrations.AddIndex(
            model_name="restaurant",
            index=models.Index(fields=["is_verified"], name="restaurant_verified_idx"),
        ),
        migrations.AddIndex(
            model_name="restaurant",
            index=models.Index(fields=["is_active"], name="restaurant_active_idx"),
        ),
    ]
