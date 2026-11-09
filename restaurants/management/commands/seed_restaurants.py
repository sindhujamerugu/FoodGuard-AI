"""
Seed sample restaurant records for local development and demonstration.

Idempotent: safe to run multiple times without creating duplicate records.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from restaurants.models import Restaurant
from users.models import User

SAMPLE_RESTAURANTS = [
    {
        "name": "Spice Garden",
        "description": "Authentic South Indian thali, biryani, and regional delicacies.",
        "address": "Plot 42, Hitech City Main Road, Madhapur",
        "city": "Hyderabad",
        "state": "Telangana",
        "pincode": "500081",
        "contact_email": "contact@spicegarden.example.com",
        "contact_phone": "+91-9876543210",
        "is_verified": True,
        "is_active": True,
    },
    {
        "name": "The Green Bowl",
        "description": "Fresh organic salads, grain bowls, and farm-to-table smoothies.",
        "address": "108 100 Feet Road, Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560038",
        "contact_email": "hello@greenbowl.example.com",
        "contact_phone": "+91-9876543211",
        "is_verified": True,
        "is_active": True,
    },
    {
        "name": "Royal Tandoor",
        "description": "North Indian curries, kebabs, and traditional tandoori flatbreads.",
        "address": "Shop 14, Linking Road, Bandra West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400050",
        "contact_email": "orders@royaltandoor.example.com",
        "contact_phone": "+91-9876543212",
        "is_verified": True,
        "is_active": True,
    },
    {
        "name": "Ocean Catch Diner",
        "description": "Coastal seafood specials, fresh fish curries, and grilled prawns.",
        "address": "23 Beach Road, Besant Nagar",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "pincode": "600090",
        "contact_email": "support@oceancatch.example.com",
        "contact_phone": "+91-9876543213",
        "is_verified": True,
        "is_active": True,
    },
    {
        "name": "Sunrise Cafe & Bakery",
        "description": "Artisan breads, specialty coffees, sandwiches, and fresh pastries.",
        "address": "55 Connaught Place, Block B",
        "city": "New Delhi",
        "state": "Delhi",
        "pincode": "110001",
        "contact_email": "info@sunrisecafe.example.com",
        "contact_phone": "+91-9876543214",
        "is_verified": True,
        "is_active": True,
    },
]


class Command(BaseCommand):
    help = "Seed sample restaurant records. Safe to run multiple times (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--owner-email",
            type=str,
            default="restaurant.partner@foodguard.ai",
            help="Email address of the RESTAURANT_USER account owning seeded restaurants.",
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        user_model = get_user_model()
        owner_email = user_model.objects.normalize_email(options["owner_email"])

        owner = user_model.objects.filter(email__iexact=owner_email).first()
        if owner is None:
            owner = user_model.objects.create_user(
                email=owner_email,
                password="RestaurantPartnerPass123!",
                first_name="Partner",
                last_name="Manager",
                role=User.Role.RESTAURANT_USER,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created restaurant owner account '{owner_email}'.")
            )
        elif owner.role != User.Role.RESTAURANT_USER:
            self.stdout.write(
                self.style.WARNING(
                    f"User '{owner_email}' already exists with role '{owner.role}'. "
                    f"Updating role to '{User.Role.RESTAURANT_USER}' for restaurant ownership."
                )
            )
            owner.role = User.Role.RESTAURANT_USER
            owner.save(update_fields=["role"])

        created_count = 0
        updated_count = 0

        for item in SAMPLE_RESTAURANTS:
            _, created = Restaurant.objects.update_or_create(
                name=item["name"],
                city=item["city"],
                defaults={
                    "description": item["description"],
                    "address": item["address"],
                    "state": item["state"],
                    "pincode": item["pincode"],
                    "contact_email": item["contact_email"],
                    "contact_phone": item["contact_phone"],
                    "owner": owner,
                    "is_verified": item["is_verified"],
                    "is_active": item["is_active"],
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded restaurants: {created_count} created, "
                f"{updated_count} updated (Total active restaurants: {Restaurant.objects.filter(is_active=True).count()})."
            )
        )
