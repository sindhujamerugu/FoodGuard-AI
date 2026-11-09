"""
Tests for `python manage.py seed_restaurants`
(restaurants/management/commands/seed_restaurants.py).

Covers:
- First-time seeding (creates owner user and 5 restaurants)
- Idempotency (running multiple times creates no duplicates)
- API verification (authenticated customer can list seeded active restaurants)
"""

from __future__ import annotations

import io

from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from restaurants.models import Restaurant
from users.models import User


class TestSeedRestaurantsCommand(APITestCase):

    def test_first_run_creates_five_restaurants_and_owner(self):
        out = io.StringIO()
        call_command("seed_restaurants", stdout=out)

        self.assertEqual(Restaurant.objects.count(), 5)
        owner = User.objects.get(email="restaurant.partner@foodguard.ai")
        self.assertEqual(owner.role, User.Role.RESTAURANT_USER)

        for r in Restaurant.objects.all():
            self.assertEqual(r.owner, owner)
            self.assertTrue(r.is_active)
            self.assertTrue(r.is_verified)
            self.assertTrue(len(r.name) > 0)
            self.assertTrue(len(r.city) > 0)
            self.assertTrue(len(r.state) > 0)

    def test_command_is_idempotent(self):
        call_command("seed_restaurants", stdout=io.StringIO())
        self.assertEqual(Restaurant.objects.count(), 5)

        # Re-run must not create duplicate restaurants
        out = io.StringIO()
        call_command("seed_restaurants", stdout=out)
        self.assertEqual(Restaurant.objects.count(), 5)
        self.assertIn("0 created, 5 updated", out.getvalue())

    def test_seeded_restaurants_returned_by_api_for_customer(self):
        call_command("seed_restaurants", stdout=io.StringIO())

        customer = User.objects.create_user(
            email="test.customer@example.com",
            password="StrongPass99!",
            first_name="Customer",
            last_name="User",
            role=User.Role.CUSTOMER,
        )
        token = str(RefreshToken.for_user(customer).access_token)

        response = self.client.get(
            "/api/v1/restaurants/",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 5)

        names = {item["name"] for item in data}
        self.assertIn("Spice Garden", names)
        self.assertIn("The Green Bowl", names)
        self.assertIn("Royal Tandoor", names)
        self.assertIn("Ocean Catch Diner", names)
        self.assertIn("Sunrise Cafe & Bakery", names)

        for item in data:
            self.assertIn("id", item)
            self.assertIn("name", item)
            self.assertIn("city", item)
            self.assertIn("state", item)
            self.assertTrue(item["is_active"])
