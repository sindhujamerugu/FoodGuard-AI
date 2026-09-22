"""
FoodGuard AI — food_reports test suite (Step 4).

39 tests covering:
  - Model defaults
  - Report creation (ownership, restaurant validation, image upload)
  - Report list / detail access control
  - Report update / delete lifecycle
  - Submit endpoint (state machine, required-field guards)
  - Image validation (type, size, corruption)
  - Reviewer / admin read access
  - Unauthenticated access
  - API response structure
"""

import io
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image as PilImage
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from food_reports.models import FoodReport
from food_reports.services import (
    MAX_IMAGE_BYTES,
    FoodReportSubmissionService,
    ImageValidationError,
    SubmissionValidationError,
    validate_report_image,
)
from restaurants.models import Restaurant
from users.models import User

LIST_URL = "/api/v1/reports/"
SUBMIT_URL = lambda pk: f"/api/v1/reports/{pk}/submit/"
DETAIL_URL = lambda pk: f"/api/v1/reports/{pk}/"

TEMP_MEDIA = tempfile.mkdtemp()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_user_counter = [0]


def make_user(email=None, role=User.Role.CUSTOMER, **kw) -> User:
    if email is None:
        _user_counter[0] += 1
        email = f"user{_user_counter[0]}@example.com"
    return User.objects.create_user(
        email=email,
        password="StrongPass99!",
        first_name="Test",
        last_name="User",
        role=role,
        **kw,
    )


def auth(user) -> dict:
    token = str(RefreshToken.for_user(user).access_token)
    return {"HTTP_AUTHORIZATION": f"Bearer {token}"}


def make_restaurant(owner=None, active=True) -> Restaurant:
    # Always create a fresh owner to avoid email collisions across test classes
    if owner is None:
        owner = make_user(role=User.Role.RESTAURANT_USER)
    return Restaurant.objects.create(
        name="Test Dhaba",
        description="",
        address="1 Main St",
        city="Hyderabad",
        state="Telangana",
        pincode="500001",
        owner=owner,
        is_active=active,
    )


def make_png_file(name="test.png") -> SimpleUploadedFile:
    buf = io.BytesIO()
    img = PilImage.new("RGB", (10, 10), color=(255, 0, 0))
    img.save(buf, format="PNG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type="image/png")


def make_jpeg_file(name="test.jpg") -> SimpleUploadedFile:
    buf = io.BytesIO()
    img = PilImage.new("RGB", (10, 10), color=(0, 255, 0))
    img.save(buf, format="JPEG")
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type="image/jpeg")


def make_report(customer, restaurant=None, **kw) -> FoodReport:
    if restaurant is None:
        restaurant = make_restaurant()
    return FoodReport.objects.create(
        customer=customer,
        restaurant=restaurant,
        title=kw.get("title", "Foreign Object Found"),
        description=kw.get("description", "There was a stone in my biryani."),
        status=kw.get("status", FoodReport.Status.DRAFT),
        priority=kw.get("priority", FoodReport.Priority.LOW),
    )


# ---------------------------------------------------------------------------
# 1–3: Model defaults
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestFoodReportModel(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()

    def test_01_model_creation(self):
        r = make_report(self.customer, self.restaurant)
        self.assertEqual(r.title, "Foreign Object Found")
        self.assertEqual(r.customer, self.customer)

    def test_02_default_status_draft(self):
        r = make_report(self.customer, self.restaurant)
        self.assertEqual(r.status, FoodReport.Status.DRAFT)

    def test_03_default_priority_low(self):
        r = make_report(self.customer, self.restaurant)
        self.assertEqual(r.priority, FoodReport.Priority.LOW)


# ---------------------------------------------------------------------------
# 4–9: Create endpoint
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestReportCreate(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.restaurant = make_restaurant()
        self.inactive_restaurant = make_restaurant(active=False)

    def _payload(self, **kw):
        return {
            "restaurant": kw.get("restaurant", self.restaurant.pk),
            "title": kw.get("title", "Hair in food"),
            "description": kw.get("description", "Found a hair in my meal."),
        }

    def test_04_customer_can_create_report(self):
        resp = self.client.post(
            LIST_URL, self._payload(), format="json", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_05_customer_automatically_assigned(self):
        resp = self.client.post(
            LIST_URL, self._payload(), format="json", **auth(self.customer)
        )
        self.assertEqual(resp.json()["customer"]["email"], self.customer.email)

    def test_06_customer_cannot_submit_another_customer_id(self):
        payload = {**self._payload(), "customer": self.other_customer.pk}
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        # customer field is silently ignored; report still belongs to requester
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["customer"]["email"], self.customer.email)

    def test_07_valid_restaurant_accepted(self):
        resp = self.client.post(
            LIST_URL, self._payload(), format="json", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.json()["restaurant"]["id"], self.restaurant.pk)

    def test_08_inactive_restaurant_rejected(self):
        payload = self._payload(restaurant=self.inactive_restaurant.pk)
        resp = self.client.post(
            LIST_URL, payload, format="json", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_unauthenticated_cannot_create(self):
        resp = self.client.post(LIST_URL, self._payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 10–12: List / detail access
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestReportAccess(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin = make_user(role=User.Role.ADMIN)
        self.restaurant = make_restaurant()
        self.report = make_report(self.customer, self.restaurant)
        self.other_report = make_report(self.other_customer, self.restaurant)

    def test_10_list_returns_only_own_reports(self):
        resp = self.client.get(LIST_URL, **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [r["id"] for r in resp.json()]
        self.assertIn(self.report.pk, ids)
        self.assertNotIn(self.other_report.pk, ids)

    def test_11_customer_cannot_retrieve_another_customers_report(self):
        resp = self.client.get(
            DETAIL_URL(self.other_report.pk), **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_12_customer_can_retrieve_own_report(self):
        resp = self.client.get(DETAIL_URL(self.report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 13–17: Update lifecycle
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestReportUpdate(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()
        self.draft = make_report(self.customer, self.restaurant)
        self.submitted = make_report(
            self.customer, self.restaurant,
            status=FoodReport.Status.SUBMITTED,
        )

    def test_13_customer_can_update_own_draft(self):
        resp = self.client.patch(
            DETAIL_URL(self.draft.pk),
            {"title": "Updated Title"},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["title"], "Updated Title")

    def test_14_customer_cannot_update_submitted_report(self):
        resp = self.client.patch(
            DETAIL_URL(self.submitted.pk),
            {"title": "Should Fail"},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_15_customer_cannot_change_customer_field(self):
        other = make_user()
        resp = self.client.patch(
            DETAIL_URL(self.draft.pk),
            {"customer": other.pk},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_16_customer_cannot_directly_modify_status(self):
        resp = self.client.patch(
            DETAIL_URL(self.draft.pk),
            {"status": "SUBMITTED"},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_17_customer_cannot_directly_modify_priority(self):
        resp = self.client.patch(
            DETAIL_URL(self.draft.pk),
            {"priority": "CRITICAL"},
            format="json",
            **auth(self.customer),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# 18–19: Delete lifecycle
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestReportDelete(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()

    def test_18_customer_can_delete_own_draft(self):
        report = make_report(self.customer, self.restaurant)
        resp = self.client.delete(DETAIL_URL(report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_19_customer_cannot_delete_submitted_report(self):
        report = make_report(
            self.customer, self.restaurant,
            status=FoodReport.Status.SUBMITTED,
        )
        resp = self.client.delete(DETAIL_URL(report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# 20–25: Image upload / validation
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestImageUpload(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()

    def _base_payload(self):
        return {
            "restaurant": self.restaurant.pk,
            "title": "Image Test",
            "description": "Testing image upload.",
        }

    def test_20_valid_jpg_upload_accepted(self):
        img = make_jpeg_file("photo.jpg")
        payload = {**self._base_payload(), "image": img}
        resp = self.client.post(
            LIST_URL, payload, format="multipart", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_21_valid_jpeg_upload_accepted(self):
        img = make_jpeg_file("photo.jpeg")
        payload = {**self._base_payload(), "image": img}
        resp = self.client.post(
            LIST_URL, payload, format="multipart", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_22_valid_png_upload_accepted(self):
        img = make_png_file("photo.png")
        payload = {**self._base_payload(), "image": img}
        resp = self.client.post(
            LIST_URL, payload, format="multipart", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_23_unsupported_image_type_rejected(self):
        bad_file = SimpleUploadedFile(
            "doc.pdf", b"%PDF-1.4 fake", content_type="application/pdf"
        )
        payload = {**self._base_payload(), "image": bad_file}
        resp = self.client.post(
            LIST_URL, payload, format="multipart", **auth(self.customer)
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_24_image_above_5mb_rejected(self):
        """validate_report_image raises ImageValidationError for > 5 MB files."""
        big_data = b"x" * (MAX_IMAGE_BYTES + 1)
        big_file = SimpleUploadedFile("big.png", big_data, content_type="image/png")
        with self.assertRaises(ImageValidationError):
            validate_report_image(big_file)

    def test_25_corrupted_image_rejected(self):
        """validate_report_image raises for data Pillow cannot parse."""
        bad = SimpleUploadedFile(
            "fake.png",
            b"\x89PNG\r\n\x1a\n" + b"\x00" * 50,
            content_type="image/png",
        )
        with self.assertRaises(ImageValidationError):
            validate_report_image(bad)


# ---------------------------------------------------------------------------
# 26–32: Submit endpoint
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestReportSubmit(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.other_customer = make_user()
        self.restaurant = make_restaurant()

    def _make_draft_with_image(self, customer=None) -> FoodReport:
        if customer is None:
            customer = self.customer
        report = make_report(customer, self.restaurant)
        img = make_png_file()
        report.image.save("test.png", img, save=True)
        return report

    def test_26_submit_requires_image(self):
        report = make_report(self.customer, self.restaurant)  # no image
        resp = self.client.post(SUBMIT_URL(report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_27_submit_requires_title(self):
        """Service raises SubmissionValidationError when title is blank."""
        report = make_report(
            self.customer, self.restaurant,
            title="A Title", description="A description."
        )
        img = make_png_file()
        report.image.save("t.png", img, save=True)
        # Blank the title directly on the instance (bypass form validation)
        FoodReport.objects.filter(pk=report.pk).update(title="")
        report.refresh_from_db()
        with self.assertRaises(SubmissionValidationError):
            FoodReportSubmissionService(report, self.customer).submit()

    def test_28_submit_requires_description(self):
        """Service raises SubmissionValidationError when description is blank."""
        report = make_report(
            self.customer, self.restaurant,
            title="A Title", description="A description."
        )
        img = make_png_file()
        report.image.save("d.png", img, save=True)
        FoodReport.objects.filter(pk=report.pk).update(description="")
        report.refresh_from_db()
        with self.assertRaises(SubmissionValidationError):
            FoodReportSubmissionService(report, self.customer).submit()

    def test_29_submit_requires_restaurant(self):
        """Service raises SubmissionValidationError when restaurant_id is None.

        We test the service directly because setting restaurant=NULL violates
        the DB NOT NULL constraint at the ORM layer.
        """
        report = make_report(self.customer, self.restaurant)
        img = make_png_file()
        report.image.save("r.png", img, save=True)
        # Nullify at the Python object level only (never hits the DB)
        report.restaurant_id = None
        with self.assertRaises(SubmissionValidationError):
            FoodReportSubmissionService(report, self.customer).submit()

    def test_30_successful_draft_to_submitted(self):
        report = self._make_draft_with_image()
        resp = self.client.post(SUBMIT_URL(report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["status"], FoodReport.Status.SUBMITTED)

    def test_31_customer_cannot_submit_another_users_report(self):
        report = self._make_draft_with_image(customer=self.other_customer)
        resp = self.client.post(SUBMIT_URL(report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_32_cannot_submit_already_submitted_report(self):
        report = self._make_draft_with_image()
        self.client.post(SUBMIT_URL(report.pk), **auth(self.customer))
        # Second submit must fail
        resp = self.client.post(SUBMIT_URL(report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# 33: Reviewer / admin read access
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestReviewerAdminAccess(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.reviewer = make_user(role=User.Role.REVIEWER)
        self.admin_user = make_user(role=User.Role.ADMIN)
        self.restaurant = make_restaurant()
        self.report = make_report(self.customer, self.restaurant)

    def test_33_reviewer_can_read_any_report(self):
        resp = self.client.get(DETAIL_URL(self.report.pk), **auth(self.reviewer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_33b_admin_can_read_any_report(self):
        resp = self.client.get(DETAIL_URL(self.report.pk), **auth(self.admin_user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 34: Unauthenticated access
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestUnauthenticatedAccess(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()
        self.report = make_report(self.customer, self.restaurant)

    def test_34_unauthenticated_list_returns_401(self):
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_34b_unauthenticated_detail_returns_401(self):
        resp = self.client.get(DETAIL_URL(self.report.pk))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_34c_unauthenticated_submit_returns_401(self):
        resp = self.client.post(SUBMIT_URL(self.report.pk))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# 35–36: Response structure + image URL
# ---------------------------------------------------------------------------

@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class TestResponseStructure(APITestCase):

    def setUp(self):
        self.customer = make_user()
        self.restaurant = make_restaurant()
        self.report = make_report(self.customer, self.restaurant)

    def test_35_api_response_structure(self):
        resp = self.client.get(DETAIL_URL(self.report.pk), **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        for field in [
            "id", "customer", "restaurant", "title", "description",
            "image", "status", "priority", "created_at", "updated_at",
        ]:
            self.assertIn(field, data, msg=f"Field '{field}' missing from response")

    def test_36_image_url_returned_correctly(self):
        """When an image is attached the response returns an absolute URL."""
        report = make_report(self.customer, self.restaurant)
        img = make_png_file()
        report.image.save("struct.png", img, save=True)

        resp = self.client.get(DETAIL_URL(report.pk), **auth(self.customer))
        image_url = resp.json()["image"]
        self.assertIsNotNone(image_url)
        self.assertIn("food_reports", image_url)
