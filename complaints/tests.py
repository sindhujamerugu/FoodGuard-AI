"""
FoodGuard AI — complaints test suite (Step 6).

38 tests covering:
  - Model creation and defaults
  - Service validation (ownership, status, duplicates, language derivation)
  - Customer create / list / retrieve access control
  - Reviewer / admin access and workflow transitions
  - Status transition validation
  - resolved_at bookkeeping
  - API response structure and security
  - Multilingual language preservation
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
from complaints.services import ComplaintError, ComplaintService
from food_reports.models import FoodReport
from restaurants.models import Restaurant
from users.models import User

TEMP_MEDIA = tempfile.mkdtemp()

LIST_URL = "/api/v1/complaints/"
DETAIL_URL = lambda pk: f"/api/v1/complaints/{pk}/"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_counter = [0]


def make_user(role=User.Role.CUSTOMER, lang=User.Language.ENGLISH) -> User:
    _counter[0] += 1
    return User.objects.create_user(
        email=f"u{_counter[0]}@example.com",
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


def make_restaurant(owner=None) -> Restaurant:
    if owner is None:
        owner = make_user(role=User.Role.RESTAURANT_USER)
    return Restaurant.objects.create(
        name="Spice Hut",
        description="",
        address="5 Gandhi Rd",
        city="Chennai",
        state="Tamil Nadu",
        pincode="600001",
        owner=owner,
        is_active=True,
    )


def make_png_upload() -> SimpleUploadedFile:
    buf = io.BytesIO()
    PilImage.new("RGB", (10, 10)).save(buf, format="PNG")
    return SimpleUploadedFile("img.png", buf.getvalue(), content_type="image/png")


def make_submitted_report(customer, restaurant=None) -> FoodReport:
    if restaurant is None:
        restaurant = make_restaurant()
    report = FoodReport.objects.create(
        customer=customer,
        restaurant=restaurant,
        title="Worm in curry",
        description="I found a worm in my curry.",
        status=FoodReport.Status.SUBMITTED,
    )
    report.image.save("img.png", make_png_upload(), save=True)
    return report


def make_draft_report(customer, restaurant=None) -> FoodReport:
    if restaurant is None:
        restaurant = make_restaurant()
    return FoodReport.objects.create(
        customer=customer,
        restaurant=restaurant,
        title="Draft report",
        description="This is a draft.",
        status=FoodReport.Status.DRAFT,
    )


_VALID_PAYLOAD = lambda report_pk: {
    "food_report": report_pk,
    "title": "Formal complaint about worm",
    "description": "I formally complain about the worm I found.",
    "category": Complaint.Category.FOREIGN_OBJECT,
}


# ===========================================================================
# Model tests (1–3)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintModel(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.report = make_submitted_report(self.customer)

    def test_01_complaint_model_creation(self):
        c = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.report.restaurant,
            title="Test",
            description="Test description.",
            category=Complaint.Category.OTHER,
            original_language="en",
        )
        self.assertEqual(c.food_report, self.report)
        self.assertEqual(c.customer, self.customer)

    def test_02_default_status_submitted(self):
        c = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.report.restaurant,
            title="Test",
            description="Desc",
            category=Complaint.Category.OTHER,
            original_language="en",
        )
        self.assertEqual(c.status, Complaint.Status.SUBMITTED)

    def test_03_default_priority_low(self):
        c = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.report.restaurant,
            title="Test",
            description="Desc",
            category=Complaint.Category.OTHER,
            original_language="en",
        )
        self.assertEqual(c.priority, Complaint.Priority.LOW)


# ===========================================================================
# Service-level tests (4–6, 14)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintService(APITestCase):

    def setUp(self):
        self.customer = make_user(lang=User.Language.TELUGU)
        self.other_customer = make_user()
        self.restaurant = make_restaurant()
        self.submitted_report = make_submitted_report(
            self.customer, self.restaurant
        )
        self.draft_report = make_draft_report(self.customer, self.restaurant)
        self.service = ComplaintService()

    def _create(self, report=None, user=None):
        if report is None:
            report = self.submitted_report
        if user is None:
            user = self.customer
        return self.service.create(
            food_report=report,
            requesting_user=user,
            title="Test complaint",
            description="Formal complaint description.",
            category=Complaint.Category.HYGIENE,
        )

    def test_04_customer_automatically_assigned(self):
        c = self._create()
        self.assertEqual(c.customer, self.customer)

    def test_05_restaurant_automatically_derived(self):
        c = self._create()
        self.assertEqual(c.restaurant, self.restaurant)

    def test_06_original_language_derived_from_user(self):
        c = self._create()
        self.assertEqual(c.original_language, User.Language.TELUGU)

    def test_14_duplicate_complaint_blocked(self):
        self._create()
        with self.assertRaises(ComplaintError):
            self._create()


# ===========================================================================
# Create endpoint tests (7–13)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintCreate(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.restaurant = make_restaurant()
        self.submitted_report = make_submitted_report(
            self.customer, self.restaurant
        )
        self.draft_report = make_draft_report(self.customer, self.restaurant)

    def test_07_customer_can_create_complaint_for_own_submitted_report(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.submitted_report.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_08_customer_cannot_create_complaint_for_draft_report(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.draft_report.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_customer_cannot_create_for_another_users_report(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.submitted_report.pk),
            format="json",
            **auth(self.other_customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_10_customer_cannot_override_customer_field(self):
        payload = {
            **_VALID_PAYLOAD(self.submitted_report.pk),
            "customer": self.other_customer.pk,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["customer"]["email"], self.customer.email)

    def test_11_customer_cannot_override_restaurant(self):
        other_resto = make_restaurant()
        payload = {
            **_VALID_PAYLOAD(self.submitted_report.pk),
            "restaurant": other_resto.pk,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        # restaurant field is ignored; derived from food_report
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            resp.json()["restaurant"]["id"], self.restaurant.pk
        )

    def test_12_customer_cannot_override_status(self):
        payload = {
            **_VALID_PAYLOAD(self.submitted_report.pk),
            "status": Complaint.Status.RESOLVED,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            resp.json()["status"], Complaint.Status.SUBMITTED
        )

    def test_13_customer_cannot_override_priority(self):
        payload = {
            **_VALID_PAYLOAD(self.submitted_report.pk),
            "priority": Complaint.Priority.CRITICAL,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["priority"], Complaint.Priority.LOW)


# ===========================================================================
# List / retrieve access tests (15–20, 21)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintAccess(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)
        self.restaurant = make_restaurant(owner=self.restaurant_user)

        self.report = make_submitted_report(self.customer, self.restaurant)
        self.other_report = make_submitted_report(
            self.other_customer, self.restaurant
        )

        self.complaint = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.restaurant,
            title="My Complaint",
            description="Desc",
            category=Complaint.Category.HYGIENE,
            original_language="en",
        )
        self.other_complaint = Complaint.objects.create(
            food_report=self.other_report,
            customer=self.other_customer,
            restaurant=self.restaurant,
            title="Other Complaint",
            description="Desc",
            category=Complaint.Category.OTHER,
            original_language="en",
        )

    def test_15_customer_list_returns_only_own_complaints(self):
        resp = self.client.get(LIST_URL, **auth(self.customer))
        ids = [c["id"] for c in resp.json()]
        self.assertIn(self.complaint.pk, ids)
        self.assertNotIn(self.other_complaint.pk, ids)

    def test_16_customer_retrieve_own_complaint(self):
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk), **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_17_customer_cannot_retrieve_another_customers_complaint(self):
        resp = self.client.get(
            DETAIL_URL(self.other_complaint.pk), **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_18_reviewer_can_access_authorized_complaints(self):
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk), **auth(self.reviewer)
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_19_admin_can_access_complaints(self):
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk), **auth(self.admin_user)
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_20_restaurant_user_cannot_view_customer_complaints(self):
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk), **auth(self.restaurant_user)
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_21_unauthenticated_access_returns_401(self):
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        resp2 = self.client.get(DETAIL_URL(self.complaint.pk))
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)


# ===========================================================================
# Status workflow tests (22–27)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintWorkflow(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)
        self.complaint = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.restaurant,
            title="Workflow Test",
            description="Testing status transitions.",
            category=Complaint.Category.SPOILAGE,
            original_language="en",
        )

    def _patch(self, data, user=None):
        if user is None:
            user = self.reviewer
        return self.client.patch(
            DETAIL_URL(self.complaint.pk),
            data,
            format="json",
            **auth(user),
        )

    def test_22_reviewer_moves_submitted_to_under_review(self):
        resp = self._patch({"status": Complaint.Status.UNDER_REVIEW})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Complaint.Status.UNDER_REVIEW)

    def test_23_reviewer_moves_under_review_to_resolved(self):
        self.complaint.status = Complaint.Status.UNDER_REVIEW
        self.complaint.save()
        resp = self._patch({"status": Complaint.Status.RESOLVED})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Complaint.Status.RESOLVED)

    def test_24_reviewer_can_close_resolved_complaint(self):
        self.complaint.status = Complaint.Status.RESOLVED
        self.complaint.save()
        resp = self._patch({"status": Complaint.Status.CLOSED})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Complaint.Status.CLOSED)

    def test_25_resolved_at_set_when_resolved(self):
        self.complaint.status = Complaint.Status.UNDER_REVIEW
        self.complaint.save()
        resp = self._patch({"status": Complaint.Status.RESOLVED})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(resp.json()["resolved_at"])

    def test_26_resolved_at_maintained_when_closed(self):
        self.complaint.status = Complaint.Status.RESOLVED
        self.complaint.save()
        resp = self._patch({"status": Complaint.Status.CLOSED})
        self.assertIsNotNone(resp.json()["resolved_at"])

    def test_27_invalid_status_transition_rejected(self):
        # SUBMITTED → RESOLVED is not a valid transition
        resp = self._patch({"status": Complaint.Status.RESOLVED})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# Customer update restriction (28), reviewer update (29–30)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintUpdate(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)
        self.complaint = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.restaurant,
            title="Update Test",
            description="Test update.",
            category=Complaint.Category.FOOD_QUALITY,
            original_language="en",
        )

    def test_28_customer_cannot_update_workflow_fields(self):
        resp = self.client.patch(
            DETAIL_URL(self.complaint.pk),
            {"status": Complaint.Status.UNDER_REVIEW},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_29_reviewer_can_update_priority(self):
        resp = self.client.patch(
            DETAIL_URL(self.complaint.pk),
            {"priority": Complaint.Priority.HIGH},
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["priority"], Complaint.Priority.HIGH)

    def test_30_reviewer_can_add_resolution_notes(self):
        self.complaint.status = Complaint.Status.UNDER_REVIEW
        self.complaint.save()
        resp = self.client.patch(
            DETAIL_URL(self.complaint.pk),
            {
                "status": Complaint.Status.RESOLVED,
                "resolution_notes": "Issue investigated and resolved.",
            },
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(
            resp.json()["resolution_notes"], "Issue investigated and resolved."
        )


# ===========================================================================
# API response structure + security (31, 34)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintResponse(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)
        self.complaint = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.restaurant,
            title="Response Test",
            description="Testing response fields.",
            category=Complaint.Category.FOREIGN_OBJECT,
            original_language="en",
        )

    def test_31_api_response_structure(self):
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk), **auth(self.customer)
        )
        data = resp.json()
        for field in [
            "id", "food_report", "customer", "restaurant",
            "title", "description", "category", "original_language",
            "status", "priority", "resolution_notes",
            "rejection_reason", "rejected_by", "rejected_at",
            "submitted_at", "updated_at", "resolved_at",
        ]:
            self.assertIn(field, data, msg=f"Missing field: {field}")

    def test_34_password_fields_never_appear_in_response(self):
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk), **auth(self.customer)
        )
        data = str(resp.json())
        for forbidden in ["password", "secret_key"]:
            self.assertNotIn(forbidden, data)


# ===========================================================================
# Multilingual preservation (32–33)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintMultilingual(APITestCase):

    def setUp(self):
        self.customer = make_user(lang=User.Language.TELUGU)
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)

    def test_32_multilingual_language_context_stored_correctly(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.report.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["original_language"], "te")

    def test_33_original_user_text_remains_unchanged(self):
        original_title = "Original Telugu complaint title"
        payload = {
            **_VALID_PAYLOAD(self.report.pk),
            "title": original_title,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        self.assertEqual(resp.json()["title"], original_title)


# ===========================================================================
# PostgreSQL persistence (35)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintPersistence(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)

    def test_35_postgresql_persistence(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.report.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        pk = resp.json()["id"]
        # Fetch directly from DB
        complaint = Complaint.objects.get(pk=pk)
        self.assertEqual(complaint.title, _VALID_PAYLOAD(self.report.pk)["title"])


# ===========================================================================
# Relationship integrity (36–38)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintRelationships(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)

    def _create_via_api(self):
        return self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.report.pk),
            format="json",
            **auth(self.customer),
        )

    def test_36_complaint_belongs_to_correct_food_report(self):
        resp = self._create_via_api()
        self.assertEqual(
            resp.json()["food_report"]["id"], self.report.pk
        )

    def test_37_complaint_belongs_to_correct_restaurant(self):
        resp = self._create_via_api()
        self.assertEqual(
            resp.json()["restaurant"]["id"], self.restaurant.pk
        )

    def test_38_complaint_belongs_to_correct_customer(self):
        resp = self._create_via_api()
        self.assertEqual(
            resp.json()["customer"]["email"], self.customer.email
        )


# ===========================================================================
# Rejection workflow tests (39–52)
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintRejection(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)
        self.restaurant = make_restaurant(owner=self.restaurant_user)
        self.report = make_submitted_report(self.customer, self.restaurant)

        self.complaint = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.restaurant,
            title="Rejection Workflow Test",
            description="Testing complaint rejection.",
            category=Complaint.Category.HYGIENE,
            original_language="en",
            status=Complaint.Status.UNDER_REVIEW,
        )

    def _reject(self, complaint_id=None, payload=None, user=None):
        if complaint_id is None:
            complaint_id = self.complaint.pk
        if payload is None:
            payload = {
                "status": Complaint.Status.REJECTED,
                "rejection_reason": "Insufficient evidence to corroborate contamination.",
            }
        if user is None:
            user = self.reviewer
        return self.client.patch(
            DETAIL_URL(complaint_id),
            payload,
            format="json",
            **auth(user),
        )

    def test_39_reviewer_can_reject_under_review_complaint(self):
        resp = self._reject()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Complaint.Status.REJECTED)
        self.assertEqual(
            resp.json()["rejection_reason"],
            "Insufficient evidence to corroborate contamination.",
        )
        self.assertIsNotNone(resp.json()["rejected_at"])
        self.assertEqual(resp.json()["rejected_by"]["id"], self.reviewer.pk)

    def test_40_rejection_missing_reason_rejected_400(self):
        resp = self._reject(payload={"status": Complaint.Status.REJECTED})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_41_rejection_empty_reason_rejected_400(self):
        resp = self._reject(
            payload={
                "status": Complaint.Status.REJECTED,
                "rejection_reason": "   \n\t  ",
            }
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_42_rejection_invalid_complaint_id_404(self):
        resp = self._reject(complaint_id=999999)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_43_customer_cannot_reject_complaint_403(self):
        resp = self._reject(user=self.customer)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_44_restaurant_user_cannot_reject_complaint_403(self):
        resp = self._reject(user=self.restaurant_user)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_45_unauthenticated_rejection_returns_401(self):
        resp = self.client.patch(
            DETAIL_URL(self.complaint.pk),
            {
                "status": Complaint.Status.REJECTED,
                "rejection_reason": "Reason",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_46_cannot_reject_resolved_complaint(self):
        self.complaint.status = Complaint.Status.RESOLVED
        self.complaint.save()
        resp = self._reject()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_47_cannot_reject_closed_complaint(self):
        self.complaint.status = Complaint.Status.CLOSED
        self.complaint.save()
        resp = self._reject()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_48_cannot_reject_already_rejected_complaint(self):
        self._reject()
        resp2 = self._reject()
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_49_reviewer_identity_and_timestamp_recorded(self):
        resp = self._reject()
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        complaint = Complaint.objects.get(pk=self.complaint.pk)
        self.assertEqual(complaint.rejected_by, self.reviewer)
        self.assertIsNotNone(complaint.rejected_at)

    def test_50_customer_can_view_rejection_status_and_reason(self):
        self._reject()
        resp = self.client.get(
            DETAIL_URL(self.complaint.pk),
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["status"], Complaint.Status.REJECTED)
        self.assertEqual(
            data["rejection_reason"],
            "Insufficient evidence to corroborate contamination.",
        )
        self.assertIsNotNone(data["rejected_at"])

    def test_51_customer_notification_created_on_rejection(self):
        from notifications.models import Notification

        self._reject()
        notif = Notification.objects.filter(
            recipient=self.customer,
            event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
            related_complaint=self.complaint,
        ).first()
        self.assertIsNotNone(notif)
        self.assertIn("rejected", notif.message.lower())

    def test_52_rejection_blocked_for_submitted_status_must_be_under_review(self):
        self.complaint.status = Complaint.Status.SUBMITTED
        self.complaint.save()
        resp = self._reject()
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestComplaintLocationAccess(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.restaurant = make_restaurant()
        self.report = make_submitted_report(self.customer, self.restaurant)
        self.report.location_lat = 17.385083
        self.report.location_lng = 78.486671
        self.report.save()
        self.complaint = Complaint.objects.create(
            food_report=self.report,
            customer=self.customer,
            restaurant=self.restaurant,
            title="Location check complaint",
            description="Complaint includes location details.",
            category=Complaint.Category.HYGIENE,
            original_language="en",
            status=Complaint.Status.UNDER_REVIEW,
        )

    def test_53_location_coordinates_are_returned_for_authorized_reviewer(self):
        resp = self.client.get(
            f"/api/v1/reports/{self.report.pk}/",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["location_lat"], "17.385083")
        self.assertEqual(resp.json()["location_lng"], "78.486671")

    def test_54_missing_location_coordinates_are_safe_and_null(self):
        self.report.location_lat = None
        self.report.location_lng = None
        self.report.save()

        resp = self.client.get(
            f"/api/v1/reports/{self.report.pk}/",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.json()["location_lat"])
        self.assertIsNone(resp.json()["location_lng"])


