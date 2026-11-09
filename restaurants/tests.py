"""
FoodGuard AI — restaurants app test suite (Step 3).
22 tests covering model, permissions, and API behaviour.
"""

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from restaurants.models import Restaurant
from users.models import User

BASE_URL = "/api/v1/restaurants/"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(email, role=User.Role.CUSTOMER, **kw) -> User:
    return User.objects.create_user(
        email=email,
        password="StrongPass99!",
        first_name="Test",
        last_name="User",
        role=role,
        **kw,
    )


def auth_header(user) -> dict:
    token = str(RefreshToken.for_user(user).access_token)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


RESTAURANT_PAYLOAD = {
    "name": "Spice Garden",
    "description": "South Indian cuisine",
    "address": "12 MG Road",
    "city": "Hyderabad",
    "state": "Telangana",
    "pincode": "500001",
    "contact_email": "spice@example.com",
    "contact_phone": "9876543210",
}


def make_restaurant(owner) -> Restaurant:
    return Restaurant.objects.create(owner=owner, **RESTAURANT_PAYLOAD)


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TestRestaurantModel(APITestCase):

    def setUp(self):
        self.owner = make_user("owner@example.com", role=User.Role.RESTAURANT_USER)

    def test_01_model_creation(self):
        r = make_restaurant(self.owner)
        self.assertEqual(r.name, "Spice Garden")
        self.assertEqual(r.city, "Hyderabad")

    def test_02_owner_relationship(self):
        r = make_restaurant(self.owner)
        self.assertEqual(r.owner, self.owner)

    def test_03_default_is_verified_false(self):
        r = make_restaurant(self.owner)
        self.assertFalse(r.is_verified)

    def test_04_default_is_active_true(self):
        r = make_restaurant(self.owner)
        self.assertTrue(r.is_active)


# ---------------------------------------------------------------------------
# Create tests
# ---------------------------------------------------------------------------

class TestRestaurantCreate(APITestCase):

    def setUp(self):
        self.resto_user = make_user("resto@example.com", role=User.Role.RESTAURANT_USER)
        self.customer = make_user("cust@example.com", role=User.Role.CUSTOMER)

    def test_05_customer_can_create_unclaimed_restaurant(self):
        resp = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()
        self.assertIsNone(data["owner"])
        self.assertFalse(data["is_verified"])
        self.assertTrue(data["is_active"])
        self.assertFalse(data["is_claimed"])
        self.assertEqual(data["claim_status"], "UNCLAIMED")
        self.assertEqual(data["name"], RESTAURANT_PAYLOAD["name"])

    def test_06_restaurant_user_can_create(self):
        resp = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.resto_user),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_07_owner_automatically_assigned(self):
        resp = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.resto_user),
        )
        self.assertEqual(resp.json()["owner"]["email"], self.resto_user.email)

    def test_08_client_cannot_assign_another_owner(self):
        other = make_user("other@example.com", role=User.Role.RESTAURANT_USER)
        payload = {**RESTAURANT_PAYLOAD, "owner": other.pk}
        resp = self.client.post(
            BASE_URL, payload, format="json",
            **auth_header(self.resto_user),
        )
        # owner field is ignored — still assigned to authenticated user
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["owner"]["email"], self.resto_user.email)

    def test_22_unauthenticated_create_returns_401(self):
        resp = self.client.post(BASE_URL, RESTAURANT_PAYLOAD, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Read tests
# ---------------------------------------------------------------------------

class TestRestaurantRead(APITestCase):

    def setUp(self):
        self.owner = make_user("owner2@example.com", role=User.Role.RESTAURANT_USER)
        self.customer = make_user("cust2@example.com", role=User.Role.CUSTOMER)
        self.restaurant = make_restaurant(self.owner)

    def test_09_restaurant_user_can_view_own(self):
        resp = self.client.get(
            f"{BASE_URL}{self.restaurant.pk}/",
            **auth_header(self.owner),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_12_customer_can_view_list(self):
        resp = self.client.get(BASE_URL, **auth_header(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.json(), list)

    def test_13_customer_can_view_detail(self):
        resp = self.client.get(
            f"{BASE_URL}{self.restaurant.pk}/",
            **auth_header(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_21_api_response_structure(self):
        resp = self.client.get(
            f"{BASE_URL}{self.restaurant.pk}/",
            **auth_header(self.customer),
        )
        data = resp.json()
        for field in [
            "id", "name", "description", "address", "city", "state",
            "pincode", "contact_email", "contact_phone", "owner",
            "is_verified", "is_active", "created_at", "updated_at",
        ]:
            self.assertIn(field, data, msg=f"Field '{field}' missing")


# ---------------------------------------------------------------------------
# Update tests
# ---------------------------------------------------------------------------

class TestRestaurantUpdate(APITestCase):

    def setUp(self):
        self.owner = make_user("owner3@example.com", role=User.Role.RESTAURANT_USER)
        self.other_owner = make_user("other3@example.com", role=User.Role.RESTAURANT_USER)
        self.customer = make_user("cust3@example.com", role=User.Role.CUSTOMER)
        self.reviewer = make_user("rev@example.com", role=User.Role.REVIEWER)
        self.admin = make_user("admin@example.com", role=User.Role.ADMIN)
        self.restaurant = make_restaurant(self.owner)

    def test_10_restaurant_user_can_update_own(self):
        resp = self.client.patch(
            f"{BASE_URL}{self.restaurant.pk}/",
            {"name": "Updated Garden"},
            format="json",
            **auth_header(self.owner),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["name"], "Updated Garden")

    def test_11_restaurant_user_cannot_update_another(self):
        resp = self.client.patch(
            f"{BASE_URL}{self.restaurant.pk}/",
            {"name": "Hack"},
            format="json",
            **auth_header(self.other_owner),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_14_customer_cannot_update(self):
        resp = self.client.patch(
            f"{BASE_URL}{self.restaurant.pk}/",
            {"name": "Bad Update"},
            format="json",
            **auth_header(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_18_unverified_restaurant_cannot_self_verify(self):
        resp = self.client.patch(
            f"{BASE_URL}{self.restaurant.pk}/",
            {"is_verified": True},
            format="json",
            **auth_header(self.owner),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_16_reviewer_access(self):
        resp = self.client.get(
            f"{BASE_URL}{self.restaurant.pk}/",
            **auth_header(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_17_admin_access(self):
        resp = self.client.get(
            f"{BASE_URL}{self.restaurant.pk}/",
            **auth_header(self.admin),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Delete tests
# ---------------------------------------------------------------------------

class TestRestaurantDelete(APITestCase):

    def setUp(self):
        self.owner = make_user("owner4@example.com", role=User.Role.RESTAURANT_USER)
        self.customer = make_user("cust4@example.com", role=User.Role.CUSTOMER)
        self.restaurant = make_restaurant(self.owner)

    def test_15_customer_cannot_delete(self):
        resp = self.client.delete(
            f"{BASE_URL}{self.restaurant.pk}/",
            **auth_header(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Validation tests
# ---------------------------------------------------------------------------

class TestRestaurantValidation(APITestCase):

    def setUp(self):
        self.owner = make_user("owner5@example.com", role=User.Role.RESTAURANT_USER)

    def test_19_required_fields_validated(self):
        resp = self.client.post(
            BASE_URL, {}, format="json", **auth_header(self.owner)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_20_invalid_email_rejected(self):
        payload = {**RESTAURANT_PAYLOAD, "contact_email": "not-an-email"}
        resp = self.client.post(
            BASE_URL, payload, format="json", **auth_header(self.owner)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Unclaimed & Claim Flow tests
# ---------------------------------------------------------------------------

class TestUnclaimedAndClaimFlow(APITestCase):

    def setUp(self):
        self.customer = make_user("cust_claim@example.com", role=User.Role.CUSTOMER)
        self.resto_user = make_user("resto_claim@example.com", role=User.Role.RESTAURANT_USER)
        self.reviewer = make_user("reviewer_claim@example.com", role=User.Role.REVIEWER)

    def test_search_filter_returns_matches(self):
        r1 = Restaurant.objects.create(
            name="Hyderabad Biryani House",
            address="Road 1",
            city="Hyderabad",
            state="Telangana",
            pincode="500001",
        )
        r2 = Restaurant.objects.create(
            name="Bangalore Dosa Corner",
            address="Road 2",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
        )
        resp = self.client.get(
            f"{BASE_URL}?search=Hyderabad",
            **auth_header(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in resp.json()]
        self.assertIn("Hyderabad Biryani House", names)
        self.assertNotIn("Bangalore Dosa Corner", names)

    def test_customer_cannot_modify_or_delete_unclaimed_restaurant(self):
        resp = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.customer),
        )
        resto_id = resp.json()["id"]

        # Attempt PATCH
        patch_resp = self.client.patch(
            f"{BASE_URL}{resto_id}/",
            {"name": "Hijacked Name"},
            format="json",
            **auth_header(self.customer),
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt DELETE
        del_resp = self.client.delete(
            f"{BASE_URL}{resto_id}/",
            **auth_header(self.customer),
        )
        self.assertEqual(del_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_restaurant_returns_existing(self):
        # Create initial
        resp1 = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.customer),
        )
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        first_id = resp1.json()["id"]

        # Post duplicate with same name and city (different case)
        payload_dup = {
            **RESTAURANT_PAYLOAD,
            "name": RESTAURANT_PAYLOAD["name"].lower(),
            "city": RESTAURANT_PAYLOAD["city"].upper(),
        }
        resp2 = self.client.post(
            BASE_URL, payload_dup, format="json",
            **auth_header(self.customer),
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.json()["id"], first_id)
        # Total count remains 1
        self.assertEqual(Restaurant.objects.filter(name__iexact=RESTAURANT_PAYLOAD["name"]).count(), 1)

    def test_restaurant_user_claim_and_reviewer_approve_flow(self):
        # Customer creates unclaimed restaurant
        resp = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.customer),
        )
        resto_id = resp.json()["id"]

        # Customer cannot claim
        claim_cust = self.client.post(
            f"{BASE_URL}{resto_id}/claim/",
            **auth_header(self.customer),
        )
        self.assertEqual(claim_cust.status_code, status.HTTP_403_FORBIDDEN)

        # Restaurant User claims it
        claim_resp = self.client.post(
            f"{BASE_URL}{resto_id}/claim/",
            **auth_header(self.resto_user),
        )
        self.assertEqual(claim_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(claim_resp.json()["claim_status"], "PENDING")
        self.assertEqual(claim_resp.json()["claimed_by"]["email"], self.resto_user.email)
        self.assertIsNone(claim_resp.json()["owner"])

        # Reviewer approves claim
        approve_resp = self.client.post(
            f"{BASE_URL}{resto_id}/approve-claim/",
            **auth_header(self.reviewer),
        )
        self.assertEqual(approve_resp.status_code, status.HTTP_200_OK)
        data = approve_resp.json()
        self.assertEqual(data["claim_status"], "CLAIMED")
        self.assertEqual(data["owner"]["email"], self.resto_user.email)
        self.assertTrue(data["is_verified"])
        self.assertTrue(data["is_claimed"])

    def test_restaurant_user_claim_and_reviewer_reject_flow(self):
        # Customer creates unclaimed restaurant
        resp = self.client.post(
            BASE_URL, RESTAURANT_PAYLOAD, format="json",
            **auth_header(self.customer),
        )
        resto_id = resp.json()["id"]

        # Restaurant User claims it
        claim_resp = self.client.post(
            f"{BASE_URL}{resto_id}/claim/",
            **auth_header(self.resto_user),
        )
        self.assertEqual(claim_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(claim_resp.json()["claim_status"], "PENDING")

        # Customer cannot reject
        reject_cust = self.client.post(
            f"{BASE_URL}{resto_id}/reject-claim/",
            {"reason": "Unauthorized attempt"},
            format="json",
            **auth_header(self.customer),
        )
        self.assertEqual(reject_cust.status_code, status.HTTP_403_FORBIDDEN)

        # Reviewer rejects claim
        reject_resp = self.client.post(
            f"{BASE_URL}{resto_id}/reject-claim/",
            {"reason": "Insufficient legal proof of business ownership."},
            format="json",
            **auth_header(self.reviewer),
        )
        self.assertEqual(reject_resp.status_code, status.HTTP_200_OK)
        data = reject_resp.json()
        self.assertEqual(data["claim_status"], "UNCLAIMED")
        self.assertIsNone(data["claimed_by"])
        self.assertIsNone(data["owner"])

        # Second reject on now-unclaimed restaurant fails with 400
        reject_again = self.client.post(
            f"{BASE_URL}{resto_id}/reject-claim/",
            **auth_header(self.reviewer),
        )
        self.assertEqual(reject_again.status_code, status.HTTP_400_BAD_REQUEST)

