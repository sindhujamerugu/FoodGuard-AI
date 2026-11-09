"""
Create or ensure test REVIEWER and ADMIN accounts for local development testing.

Idempotent: safe to run multiple times without creating duplicates.
"""

from __future__ import annotations

import os
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from users.models import User

DEFAULT_REVIEWER_EMAIL = "reviewer@foodguard.ai"
DEFAULT_REVIEWER_PASSWORD = os.getenv("DEV_REVIEWER_PASSWORD", "FoodGuard@Reviewer2026!")

DEFAULT_ADMIN_EMAIL = "admin@foodguard.ai"
DEFAULT_ADMIN_PASSWORD = os.getenv("DEV_ADMIN_PASSWORD", "FoodGuard@Admin2026!")


class Command(BaseCommand):
    help = (
        "Create or update local development REVIEWER and ADMIN accounts. "
        "Idempotent: safe to run repeatedly."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reviewer-email",
            default=DEFAULT_REVIEWER_EMAIL,
            help=f"Email for reviewer user (default: {DEFAULT_REVIEWER_EMAIL})",
        )
        parser.add_argument(
            "--reviewer-password",
            default=DEFAULT_REVIEWER_PASSWORD,
            help="Password for reviewer user",
        )
        parser.add_argument(
            "--admin-email",
            default=DEFAULT_ADMIN_EMAIL,
            help=f"Email for admin user (default: {DEFAULT_ADMIN_EMAIL})",
        )
        parser.add_argument(
            "--admin-password",
            default=DEFAULT_ADMIN_PASSWORD,
            help="Password for admin user",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow running even if DEBUG is False",
        )

    def handle(self, *args, **options) -> None:
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "create_dev_users is intended for development environments. "
                "Set DJANGO_DEBUG=True or pass --force to proceed."
            )

        reviewer_email = User.objects.normalize_email(options["reviewer_email"].strip().lower())
        reviewer_password = options["reviewer_password"]
        admin_email = User.objects.normalize_email(options["admin_email"].strip().lower())
        admin_password = options["admin_password"]

        with transaction.atomic():
            # 1. REVIEWER account
            reviewer, created_rev = User.objects.get_or_create(
                email=reviewer_email,
                defaults={
                    "first_name": "Reviewer",
                    "last_name": "User",
                    "role": User.Role.REVIEWER,
                    "is_active": True,
                    "is_staff": False,
                    "is_superuser": False,
                    "preferred_language": User.Language.ENGLISH,
                },
            )
            if not created_rev:
                reviewer.role = User.Role.REVIEWER
                reviewer.is_active = True
                reviewer.set_password(reviewer_password)
                reviewer.save(update_fields=["role", "is_active", "password"])
                self.stdout.write(
                    self.style.SUCCESS(f"Updated existing reviewer account '{reviewer_email}'.")
                )
            else:
                reviewer.set_password(reviewer_password)
                reviewer.save(update_fields=["password"])
                self.stdout.write(
                    self.style.SUCCESS(f"Created reviewer account '{reviewer_email}'.")
                )

            # 2. ADMIN account
            admin, created_adm = User.objects.get_or_create(
                email=admin_email,
                defaults={
                    "first_name": "Admin",
                    "last_name": "User",
                    "role": User.Role.ADMIN,
                    "is_active": True,
                    "is_staff": True,
                    "is_superuser": True,
                    "preferred_language": User.Language.ENGLISH,
                },
            )
            if not created_adm:
                admin.role = User.Role.ADMIN
                admin.is_active = True
                admin.is_staff = True
                admin.is_superuser = True
                admin.set_password(admin_password)
                admin.save(update_fields=["role", "is_active", "is_staff", "is_superuser", "password"])
                self.stdout.write(
                    self.style.SUCCESS(f"Updated existing admin account '{admin_email}'.")
                )
            else:
                admin.set_password(admin_password)
                admin.save(update_fields=["password"])
                self.stdout.write(
                    self.style.SUCCESS(f"Created admin account '{admin_email}'.")
                )
