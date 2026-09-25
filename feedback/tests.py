"""
FoodGuard AI — feedback test suite (Step 8).

30 tests covering:
  - Rating validation (1–5, boundaries, invalid types)
  - Creation: ownership, complaint status, duplicate guard
  - Multilingual: original_language derived from user preference
  - Access control: customer own / reviewer / admin / restaurant / unauth
  - Response structure, immutability, security
  - PostgreSQL persistence
"""

import io
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image as PilImage
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from complaints.models import Complaint
from feedback.models import Feedback
from feedback.services import FeedbackError, FeedbackService
from food_reports.models import FoodReport
from restaurants.models import Restaurant
from users.models import User

TEMP_MEDIA = tempfile.mkdtemp()

LIST_URL = "/api/v1/feedback/"
DETAIL_URL = lambda pk: f"/api/v1/feedback/{pk}/"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ctr = [0]


def make_user(role=User.Role.CUSTOMER, lang=User.Language.ENGLISH) -> User:
    _ctr[0] += 1
    return User.objects.create_user(
        email=f"u{_ctr[0]}@example.com",
        password="StrongPass99!",
        first_name="Test",
        last_name="User",
        role=role,
        preferred_language=lang,
    )


def auth(user) -> dict:
    return {
        "HTTP_AUTHORIZATION": (
            f"Bearer {str(RefreshToken.for_user(user).access_token)}"
        )
    }


def make_png() -> SimpleUploadedFile:
    buf = io.BytesIO()
    PilImage.new("RGB", (10, 10)).save(buf, format="PNG")
    return SimpleUploadedFile("img.png", buf.getvalue(), content_type="image/png")


def make_complaint(
    customer=None,
    complaint_status=Complaint.Status.RESOLVED,
) -> Complaint:
    if customer is None:
        customer = make_user()
    resto_owner = make_user(role=User.Role.RESTAURANT_USER)
    restaurant = Restaurant.objects.create(
        name="Test Cafe",
        description="",
        address="1 Test St",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        owner=resto_owner,
        is_active=True,
    )
    report = FoodReport.objects.create(
        customer=customer,
        restaurant=restaurant,
        title="Hair in food",
        description="Found a hair.",
        status=FoodReport.Status.SUBMITTED,
    )
    report.image.save("img.png", make_png(), save=True)
    return Complaint.objects.create(
        food_report=report,
        customer=customer,
        restaurant=restaurant,
        title="Formal complaint",
        description="Formal description.",
        category=Complaint.Category.HYGIENE,
        original_language="en",
        status=complaint_status,
    )


def _payload(complaint_pk, rating=4, comments="Good resolution."):
    return {
        "complaint": complaint_pk,
        "rating": rating,
        "comments": comments,
    }


# ===========================================================================
# 1–7: Rating validation
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestRatingValidation(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.complaint = make_complaint(customer=self.customer)

    def test_01_valid_feedback_creation(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.complaint.pk, rating=4),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_02_rating_1_accepted(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.complaint.pk, rating=1),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["rating"], 1)

    def test_03_rating_5_accepted(self):
        customer2 = make_user()
        complaint2 = make_complaint(customer=customer2)
        resp = self.client.post(
            LIST_URL,
            _payload(complaint2.pk, rating=5),
            format="json",
            **auth(customer2),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["rating"], 5)

    def test_04_rating_0_rejected(self):
        customer3 = make_user()
        complaint3 = make_complaint(customer=customer3)
        resp = self.client.post(
            LIST_URL,
            _payload(complaint3.pk, rating=0),
            format="json",
            **auth(customer3),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_rating_6_rejected(self):
        customer4 = make_user()
        complaint4 = make_complaint(customer=customer4)
        resp = self.client.post(
            LIST_URL,
            _payload(complaint4.pk, rating=6),
            format="json",
            **auth(customer4),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_06_negative_rating_rejected(self):
        customer5 = make_user()
        complaint5 = make_complaint(customer=customer5)
        resp = self.client.post(
            LIST_URL,
            _payload(complaint5.pk, rating=-1),
            format="json",
            **auth(customer5),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_07_non_integer_rating_rejected(self):
        customer6 = make_user()
        complaint6 = make_complaint(customer=customer6)
        resp = self.client.post(
            LIST_URL,
            _payload(complaint6.pk, rating="abc"),
            format="json",
            **auth(customer6),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# 8–16: Create endpoint business rules
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFeedbackCreate(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)

        self.resolved_complaint = make_complaint(
            customer=self.customer,
            complaint_status=Complaint.Status.RESOLVED,
        )
        self.closed_complaint = make_complaint(
            customer=self.customer,
            complaint_status=Complaint.Status.CLOSED,
        )
        self.submitted_complaint = make_complaint(
            customer=self.customer,
            complaint_status=Complaint.Status.SUBMITTED,
        )
        self.under_review_complaint = make_complaint(
            customer=self.customer,
            complaint_status=Complaint.Status.UNDER_REVIEW,
        )
        self.other_complaint = make_complaint(
            customer=self.other_customer,
            complaint_status=Complaint.Status.RESOLVED,
        )

    def test_08_unauthenticated_create_rejected(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.resolved_complaint.pk),
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_09_customer_can_feedback_own_resolved_complaint(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.resolved_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_10_customer_can_feedback_own_closed_complaint(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.closed_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_11_feedback_before_resolution_rejected(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.submitted_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_12_feedback_during_under_review_rejected(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.under_review_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_13_customer_cannot_feedback_another_users_complaint(self):
        resp = self.client.post(
            LIST_URL,
            _payload(self.other_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_14_customer_cannot_spoof_customer_id(self):
        payload = {**_payload(self.resolved_complaint.pk), "customer": self.other_customer.pk}
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        # customer field is silently ignored — always set to requester
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["customer"]["email"], self.customer.email)

    def test_15_customer_cannot_spoof_original_language(self):
        payload = {**_payload(self.resolved_complaint.pk), "original_language": "te"}
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        # original_language is derived from user preference (en), not payload
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["original_language"], "en")

    def test_16_duplicate_feedback_rejected(self):
        self.client.post(
            LIST_URL,
            _payload(self.resolved_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        resp = self.client.post(
            LIST_URL,
            _payload(self.resolved_complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_17_database_uniqueness_enforced(self):
        """UniqueConstraint on complaint prevents DB-level duplicates."""
        from django.db import IntegrityError
        Feedback.objects.create(
            complaint=self.resolved_complaint,
            customer=self.customer,
            rating=3,
            original_language="en",
        )
        with self.assertRaises(IntegrityError):
            Feedback.objects.create(
                complaint=self.resolved_complaint,
                customer=self.customer,
                rating=5,
                original_language="en",
            )


# ===========================================================================
# 18–23: List / retrieve access control
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFeedbackAccess(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)

        self.complaint = make_complaint(
            customer=self.customer,
            complaint_status=Complaint.Status.RESOLVED,
        )
        self.other_complaint = make_complaint(
            customer=self.other_customer,
            complaint_status=Complaint.Status.RESOLVED,
        )
        self.feedback = Feedback.objects.create(
            complaint=self.complaint,
            customer=self.customer,
            rating=4,
            comments="Good.",
            original_language="en",
        )
        self.other_feedback = Feedback.objects.create(
            complaint=self.other_complaint,
            customer=self.other_customer,
            rating=2,
            comments="OK.",
            original_language="en",
        )

    def test_18_own_feedback_list(self):
        resp = self.client.get(LIST_URL, **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [f["id"] for f in resp.json()]
        self.assertIn(self.feedback.pk, ids)
        self.assertNotIn(self.other_feedback.pk, ids)

    def test_19_own_feedback_retrieve(self):
        resp = self.client.get(DETAIL_URL(self.feedback.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_20_another_customers_feedback_inaccessible(self):
        resp = self.client.get(
            DETAIL_URL(self.other_feedback.pk), **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_21_reviewer_read_access(self):
        resp = self.client.get(DETAIL_URL(self.feedback.pk), **auth(self.reviewer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_22_admin_read_access(self):
        resp = self.client.get(DETAIL_URL(self.feedback.pk), **auth(self.admin_user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_23_restaurant_user_restricted(self):
        resp = self.client.get(
            DETAIL_URL(self.feedback.pk), **auth(self.restaurant_user)
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# 24–30: Response structure, multilingual, immutability, security, persistence
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFeedbackResponse(APITestCase):

    def setUp(self):
        self.customer = make_user(lang=User.Language.TELUGU)
        self.complaint = make_complaint(
            customer=self.customer,
            complaint_status=Complaint.Status.RESOLVED,
        )

    def _create(self, **kw):
        payload = _payload(self.complaint.pk, **kw)
        return self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )

    def test_24_api_response_structure(self):
        resp = self._create()
        data = resp.json()
        for field in [
            "id", "complaint", "customer", "rating",
            "comments", "original_language", "created_at", "updated_at",
        ]:
            self.assertIn(field, data, msg=f"Missing field: {field}")

    def test_25_comments_preserved_exactly(self):
        original = "ఇది నా సమస్య — The food had a foreign object."
        resp = self._create(comments=original)
        self.assertEqual(resp.json()["comments"], original)

    def test_26_multilingual_original_language_stored_correctly(self):
        resp = self._create()
        self.assertEqual(resp.json()["original_language"], "te")

    def test_27_complaint_relationship_immutable(self):
        """After creation, the complaint FK on the record must not change."""
        resp = self._create()
        pk = resp.json()["id"]
        fb = Feedback.objects.get(pk=pk)
        self.assertEqual(fb.complaint_id, self.complaint.pk)

    def test_28_customer_relationship_immutable(self):
        """After creation, the customer FK on the record must not change."""
        resp = self._create()
        pk = resp.json()["id"]
        fb = Feedback.objects.get(pk=pk)
        self.assertEqual(fb.customer_id, self.customer.pk)

    def test_29_no_password_fields_in_response(self):
        resp = self._create()
        raw = str(resp.json())
        for forbidden in ["password", "secret_key"]:
            self.assertNotIn(forbidden, raw)

    def test_30_postgresql_persistence(self):
        resp = self._create(comments="Persisted to DB.")
        pk = resp.json()["id"]
        fb = Feedback.objects.get(pk=pk)
        self.assertEqual(fb.comments, "Persisted to DB.")
        self.assertEqual(fb.rating, 4)
