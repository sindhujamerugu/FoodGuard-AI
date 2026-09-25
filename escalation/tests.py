"""
FoodGuard AI — escalation test suite (Step 7).

38 tests covering:
  - Model defaults
  - Service: creation guards, language derivation, duplicate prevention
  - Role-based access (reviewer/admin vs customer/restaurant/unauth)
  - Status workflow: PENDING→IN_REVIEW→RESOLVED→CLOSED
  - resolved_at bookkeeping
  - assigned_to role validation
  - API response structure + security
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
from escalation.models import Escalation
from escalation.services import EscalationError, EscalationService
from food_reports.models import FoodReport
from restaurants.models import Restaurant
from users.models import User

TEMP_MEDIA = tempfile.mkdtemp()

LIST_URL = "/api/v1/escalations/"
DETAIL_URL = lambda pk: f"/api/v1/escalations/{pk}/"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ctr = [0]


def make_user(role=User.Role.REVIEWER, lang=User.Language.ENGLISH) -> User:
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


def make_complaint(customer=None, status_val=Complaint.Status.UNDER_REVIEW):
    if customer is None:
        customer = make_user(role=User.Role.CUSTOMER)
    resto_owner = make_user(role=User.Role.RESTAURANT_USER)
    restaurant = Restaurant.objects.create(
        name="Test Cafe",
        description="",
        address="1 Test St",
        city="Pune",
        state="Maharashtra",
        pincode="411001",
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
        status=status_val,
    )


def make_escalation(reviewer=None, complaint=None, **kw) -> Escalation:
    if reviewer is None:
        reviewer = make_user(role=User.Role.REVIEWER)
    if complaint is None:
        complaint = make_complaint()
    return Escalation.objects.create(
        complaint=complaint,
        created_by=reviewer,
        escalation_level=kw.get("escalation_level", Escalation.Level.LEVEL_1),
        reason=kw.get("reason", "Unresolved after review period."),
        original_language=kw.get("original_language", "en"),
        status=kw.get("status", Escalation.Status.PENDING),
    )


_VALID_PAYLOAD = lambda complaint_pk: {
    "complaint": complaint_pk,
    "escalation_level": Escalation.Level.LEVEL_1,
    "reason": "Complaint has not been resolved after 7 days under review.",
}


# ===========================================================================
# 1–3: Model defaults
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestEscalationModel(APITestCase):

    def test_01_model_creation(self):
        reviewer = make_user(role=User.Role.REVIEWER)
        complaint = make_complaint()
        e = make_escalation(reviewer=reviewer, complaint=complaint)
        self.assertEqual(e.complaint, complaint)
        self.assertEqual(e.created_by, reviewer)

    def test_02_default_level_level_1(self):
        e = make_escalation()
        self.assertEqual(e.escalation_level, Escalation.Level.LEVEL_1)

    def test_03_default_status_pending(self):
        e = make_escalation()
        self.assertEqual(e.status, Escalation.Status.PENDING)


# ===========================================================================
# 4–18: Create endpoint + service guards
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestEscalationCreate(APITestCase):

    def setUp(self):
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.customer = make_user(role=User.Role.CUSTOMER)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)
        self.complaint = make_complaint()

    def test_04_reviewer_can_create(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_05_admin_can_create(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.admin_user),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_06_customer_cannot_create(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_07_restaurant_user_cannot_create(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.restaurant_user),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_08_unauthenticated_rejected(self):
        resp = self.client.post(
            LIST_URL, _VALID_PAYLOAD(self.complaint.pk), format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_09_created_by_auto_assigned(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.json()["created_by"]["email"], self.reviewer.email)

    def test_10_created_by_cannot_be_spoofed(self):
        payload = {
            **_VALID_PAYLOAD(self.complaint.pk),
            "created_by": self.admin_user.pk,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.reviewer)
        )
        # created_by field is silently ignored — always set to requester
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["created_by"]["email"], self.reviewer.email)

    def test_11_complaint_relationship_correct(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.json()["complaint"]["id"], self.complaint.pk)

    def test_12_assigned_to_reviewer_accepted(self):
        payload = {
            **_VALID_PAYLOAD(self.complaint.pk),
            "assigned_to": self.reviewer.pk,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.admin_user)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            resp.json()["assigned_to"]["email"], self.reviewer.email
        )

    def test_13_assigned_to_admin_accepted(self):
        second_complaint = make_complaint()
        payload = {
            **_VALID_PAYLOAD(second_complaint.pk),
            "assigned_to": self.admin_user.pk,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.reviewer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_14_invalid_assigned_to_rejected(self):
        payload = {
            **_VALID_PAYLOAD(self.complaint.pk),
            "assigned_to": self.customer.pk,
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.reviewer)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_15_active_duplicate_escalation_blocked(self):
        # First escalation succeeds
        self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        # Second (still active) fails
        second_complaint_same = self.complaint
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(second_complaint_same.pk),
            format="json",
            **auth(self.admin_user),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_16_historical_closed_escalation_allows_new_one(self):
        """A CLOSED escalation is not 'active'; a new one may be created."""
        closed_esc = make_escalation(
            reviewer=self.reviewer,
            complaint=self.complaint,
            status=Escalation.Status.CLOSED,
        )
        self.assertFalse(closed_esc.is_active)
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_17_reason_required(self):
        payload = {
            "complaint": self.complaint.pk,
            "escalation_level": Escalation.Level.LEVEL_1,
            "reason": "",
        }
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.reviewer)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_18_original_language_derived_from_reviewer(self):
        hindi_reviewer = make_user(
            role=User.Role.REVIEWER, lang=User.Language.HINDI
        )
        second_complaint = make_complaint()
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(second_complaint.pk),
            format="json",
            **auth(hindi_reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["original_language"], "hi")


# ===========================================================================
# 19–28: List / retrieve / update access
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestEscalationAccess(APITestCase):

    def setUp(self):
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.customer = make_user(role=User.Role.CUSTOMER)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)
        self.complaint = make_complaint()
        self.escalation = make_escalation(
            reviewer=self.reviewer, complaint=self.complaint
        )

    def test_19_customer_cannot_list_escalations(self):
        resp = self.client.get(LIST_URL, **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_20_customer_cannot_retrieve_escalation(self):
        resp = self.client.get(
            DETAIL_URL(self.escalation.pk), **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_21_reviewer_can_list(self):
        resp = self.client.get(LIST_URL, **auth(self.reviewer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_22_admin_can_list(self):
        resp = self.client.get(LIST_URL, **auth(self.admin_user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_23_reviewer_can_retrieve(self):
        resp = self.client.get(
            DETAIL_URL(self.escalation.pk), **auth(self.reviewer)
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_24_admin_can_retrieve(self):
        resp = self.client.get(
            DETAIL_URL(self.escalation.pk), **auth(self.admin_user)
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_25_reviewer_can_update(self):
        resp = self.client.patch(
            DETAIL_URL(self.escalation.pk),
            {"status": Escalation.Status.IN_REVIEW},
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_26_admin_can_update(self):
        resp = self.client.patch(
            DETAIL_URL(self.escalation.pk),
            {"status": Escalation.Status.IN_REVIEW},
            format="json",
            **auth(self.admin_user),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_27_customer_cannot_update(self):
        resp = self.client.patch(
            DETAIL_URL(self.escalation.pk),
            {"status": Escalation.Status.IN_REVIEW},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_28_restaurant_user_cannot_update(self):
        resp = self.client.patch(
            DETAIL_URL(self.escalation.pk),
            {"status": Escalation.Status.IN_REVIEW},
            format="json",
            **auth(self.restaurant_user),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# 29–35: Status workflow and resolution
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestEscalationWorkflow(APITestCase):

    def setUp(self):
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.complaint = make_complaint()
        self.escalation = make_escalation(
            reviewer=self.reviewer, complaint=self.complaint
        )

    def _patch(self, data):
        return self.client.patch(
            DETAIL_URL(self.escalation.pk),
            data,
            format="json",
            **auth(self.reviewer),
        )

    def test_29_pending_to_in_review(self):
        resp = self._patch({"status": Escalation.Status.IN_REVIEW})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Escalation.Status.IN_REVIEW)

    def test_30_in_review_to_resolved(self):
        self.escalation.status = Escalation.Status.IN_REVIEW
        self.escalation.save()
        resp = self._patch({"status": Escalation.Status.RESOLVED})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Escalation.Status.RESOLVED)

    def test_31_resolved_to_closed(self):
        self.escalation.status = Escalation.Status.RESOLVED
        self.escalation.save()
        resp = self._patch({"status": Escalation.Status.CLOSED})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], Escalation.Status.CLOSED)

    def test_32_invalid_status_transition_rejected(self):
        # PENDING → RESOLVED is not allowed
        resp = self._patch({"status": Escalation.Status.RESOLVED})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_33_resolved_at_set_on_resolved(self):
        self.escalation.status = Escalation.Status.IN_REVIEW
        self.escalation.save()
        resp = self._patch({"status": Escalation.Status.RESOLVED})
        self.assertIsNotNone(resp.json()["resolved_at"])

    def test_34_resolved_at_set_on_closed(self):
        self.escalation.status = Escalation.Status.RESOLVED
        self.escalation.save()
        resp = self._patch({"status": Escalation.Status.CLOSED})
        self.assertIsNotNone(resp.json()["resolved_at"])

    def test_35_resolution_notes_saved(self):
        self.escalation.status = Escalation.Status.IN_REVIEW
        self.escalation.save()
        resp = self._patch({
            "status": Escalation.Status.RESOLVED,
            "resolution_notes": "Issue resolved after senior review.",
        })
        self.assertEqual(
            resp.json()["resolution_notes"],
            "Issue resolved after senior review.",
        )


# ===========================================================================
# 36–38: Response structure, security, persistence
# ===========================================================================

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestEscalationResponse(APITestCase):

    def setUp(self):
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.complaint = make_complaint()
        self.escalation = make_escalation(
            reviewer=self.reviewer, complaint=self.complaint
        )

    def test_36_api_response_structure(self):
        resp = self.client.get(
            DETAIL_URL(self.escalation.pk), **auth(self.reviewer)
        )
        data = resp.json()
        for field in [
            "id", "complaint", "created_by", "assigned_to",
            "escalation_level", "reason", "original_language",
            "status", "resolution_notes", "created_at",
            "updated_at", "resolved_at",
        ]:
            self.assertIn(field, data, msg=f"Missing field: {field}")

    def test_37_password_security_fields_never_exposed(self):
        resp = self.client.get(
            DETAIL_URL(self.escalation.pk), **auth(self.reviewer)
        )
        raw = str(resp.json())
        for forbidden in ["password", "secret_key"]:
            self.assertNotIn(forbidden, raw)

    def test_38_postgresql_persistence(self):
        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        # There is already an active escalation from setUp; close it first
        self.escalation.status = Escalation.Status.CLOSED
        self.escalation.save()

        resp = self.client.post(
            LIST_URL,
            _VALID_PAYLOAD(self.complaint.pk),
            format="json",
            **auth(self.reviewer),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        pk = resp.json()["id"]
        from_db = Escalation.objects.get(pk=pk)
        self.assertEqual(from_db.reason, _VALID_PAYLOAD(self.complaint.pk)["reason"])
