"""
FoodGuard AI — notifications app test suite.

Covers: model creation, service fan-out to reviewers/admins, ownership on
list/detail, is_read toggle, and one test per real hook point proving the
existing workflow services actually create a notification (not mocked).
"""

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from ai_analysis.services import AIAnalysisService
from complaints.models import Complaint
from complaints.services import ComplaintService
from escalation.services import EscalationService
from food_reports.models import FoodReport
from food_reports.services import FoodReportSubmissionService
from notifications.models import Notification
from notifications.services import NotificationService
from restaurants.models import Restaurant
from users.models import User

_counter = [0]


def make_user(role=User.Role.CUSTOMER) -> User:
    _counter[0] += 1
    return User.objects.create_user(
        email=f"n{_counter[0]}@example.com",
        password="StrongPass99!",
        first_name="Test",
        last_name="User",
        role=role,
    )


def auth(user) -> dict:
    return {"HTTP_AUTHORIZATION": f"Bearer {str(RefreshToken.for_user(user).access_token)}"}


def make_restaurant(owner=None) -> Restaurant:
    if owner is None:
        owner = make_user(role=User.Role.RESTAURANT_USER)
    return Restaurant.objects.create(
        name="Test Dhaba", address="1 Main St", city="Hyderabad",
        state="Telangana", pincode="500001", owner=owner, is_active=True,
    )


def make_png():
    import io
    from django.core.files.uploadedfile import SimpleUploadedFile
    from PIL import Image as PilImage
    buf = io.BytesIO()
    PilImage.new("RGB", (10, 10), color=(200, 100, 50)).save(buf, format="PNG")
    return SimpleUploadedFile("img.png", buf.getvalue(), content_type="image/png")


class TestNotificationModel(APITestCase):

    def test_01_create_notification(self):
        user = make_user()
        n = Notification.objects.create(
            recipient=user,
            event_type=Notification.EventType.REPORT_SUBMITTED,
            message="Test message",
        )
        self.assertIsNotNone(n.pk)
        self.assertFalse(n.is_read)


class TestNotificationServiceFanOut(APITestCase):

    def test_02_notify_single_recipient(self):
        user = make_user()
        n = NotificationService().notify(
            recipient=user, event_type=Notification.EventType.REPORT_SUBMITTED, message="hi"
        )
        self.assertEqual(n.recipient, user)

    def test_03_notify_reviewers_and_admins_fans_out_to_all_staff(self):
        reviewer = make_user(role=User.Role.REVIEWER)
        admin = make_user(role=User.Role.ADMIN)
        customer = make_user(role=User.Role.CUSTOMER)  # must NOT receive it

        created = NotificationService().notify_reviewers_and_admins(
            event_type=Notification.EventType.COMPLAINT_SUBMITTED, message="new complaint"
        )
        recipients = {n.recipient_id for n in created}
        self.assertIn(reviewer.pk, recipients)
        self.assertIn(admin.pk, recipients)
        self.assertNotIn(customer.pk, recipients)


class TestNotificationAPI(APITestCase):

    def setUp(self):
        self.owner = make_user()
        self.other = make_user()
        self.n1 = Notification.objects.create(
            recipient=self.owner, event_type=Notification.EventType.REPORT_SUBMITTED, message="m1"
        )

    def test_04_list_returns_only_own_notifications(self):
        Notification.objects.create(
            recipient=self.other, event_type=Notification.EventType.REPORT_SUBMITTED, message="not mine"
        )
        resp = self.client.get("/api/v1/notifications/", **auth(self.owner))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {row["id"] for row in resp.json()}
        self.assertEqual(ids, {self.n1.pk})

    def test_05_unauthenticated_denied(self):
        resp = self.client.get("/api/v1/notifications/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_06_mark_as_read_by_owner(self):
        resp = self.client.patch(
            f"/api/v1/notifications/{self.n1.pk}/", {"is_read": True},
            format="json", **auth(self.owner),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)

    def test_07_cannot_mark_another_users_notification(self):
        resp = self.client.patch(
            f"/api/v1/notifications/{self.n1.pk}/", {"is_read": True},
            format="json", **auth(self.other),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_08_cannot_patch_protected_fields(self):
        resp = self.client.patch(
            f"/api/v1/notifications/{self.n1.pk}/", {"message": "hacked"},
            format="json", **auth(self.owner),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class TestNotificationHookPoints(APITestCase):
    """Proves real workflow services actually create notifications — not mocked."""

    def test_09_report_submission_notifies_reviewers_and_admins(self):
        reviewer = make_user(role=User.Role.REVIEWER)
        customer = make_user()
        restaurant = make_restaurant()
        report = FoodReport.objects.create(
            customer=customer, restaurant=restaurant, title="Hair in food",
            description="desc", status=FoodReport.Status.DRAFT,
        )
        report.image.save("img.png", make_png(), save=True)

        FoodReportSubmissionService(report, customer).submit()

        self.assertTrue(
            Notification.objects.filter(
                recipient=reviewer, event_type=Notification.EventType.REPORT_SUBMITTED,
                related_report=report,
            ).exists()
        )

    def test_10_ai_analysis_completion_notifies_customer(self):
        customer = make_user()
        restaurant = make_restaurant()
        report = FoodReport.objects.create(
            customer=customer, restaurant=restaurant, title="t", description="d",
            status=FoodReport.Status.SUBMITTED,
        )
        report.image.save("img.png", make_png(), save=True)

        AIAnalysisService().analyze_food_report(report)

        self.assertTrue(
            Notification.objects.filter(
                recipient=customer, event_type=Notification.EventType.AI_ANALYSIS_COMPLETED,
                related_report=report,
            ).exists()
        )

    def test_11_complaint_creation_notifies_reviewers_and_admins(self):
        admin = make_user(role=User.Role.ADMIN)
        customer = make_user()
        restaurant = make_restaurant()
        report = FoodReport.objects.create(
            customer=customer, restaurant=restaurant, title="t", description="d",
            status=FoodReport.Status.SUBMITTED,
        )
        complaint = ComplaintService().create(
            food_report=report, requesting_user=customer,
            title="Complaint", description="desc", category=Complaint.Category.SPOILAGE,
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=admin, event_type=Notification.EventType.COMPLAINT_SUBMITTED,
                related_complaint=complaint,
            ).exists()
        )

    def test_12_complaint_status_update_notifies_customer(self):
        customer = make_user()
        restaurant = make_restaurant()
        report = FoodReport.objects.create(
            customer=customer, restaurant=restaurant, title="t", description="d",
            status=FoodReport.Status.SUBMITTED,
        )
        complaint = ComplaintService().create(
            food_report=report, requesting_user=customer,
            title="c", description="d", category=Complaint.Category.OTHER,
        )
        ComplaintService().update(complaint, {"status": Complaint.Status.UNDER_REVIEW})

        self.assertTrue(
            Notification.objects.filter(
                recipient=customer, event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
                related_complaint=complaint,
            ).exists()
        )

    def test_13_escalation_creation_notifies_assignee(self):
        from escalation.models import Escalation

        assignee = make_user(role=User.Role.REVIEWER)
        creator = make_user(role=User.Role.ADMIN)
        customer = make_user()
        restaurant = make_restaurant()
        report = FoodReport.objects.create(
            customer=customer, restaurant=restaurant, title="t", description="d",
            status=FoodReport.Status.SUBMITTED,
        )
        complaint = ComplaintService().create(
            food_report=report, requesting_user=customer, title="c", description="d",
            category=Complaint.Category.OTHER,
        )
        ComplaintService().update(complaint, {"status": Complaint.Status.UNDER_REVIEW})

        EscalationService().create(
            complaint=complaint, requesting_user=creator,
            escalation_level=Escalation.Level.LEVEL_1, reason="needs review",
            assigned_to_user=assignee,
        )

        self.assertTrue(
            Notification.objects.filter(
                recipient=assignee, event_type=Notification.EventType.ESCALATION_CREATED,
            ).exists()
        )


class TestReviewerNotificationsAndEndpoints(APITestCase):
    """
    Tests for Reviewer notification access, permissions, filtering,
    unread counts, bulk read operations, and category isolation.
    """

    def setUp(self):
        self.reviewer_1 = make_user(role=User.Role.REVIEWER)
        self.reviewer_2 = make_user(role=User.Role.REVIEWER)
        self.customer = make_user(role=User.Role.CUSTOMER)
        self.restaurant_user = make_user(role=User.Role.RESTAURANT_USER)

        # Create notifications for reviewer_1
        self.notif_r1_complaint = Notification.objects.create(
            recipient=self.reviewer_1,
            event_type=Notification.EventType.COMPLAINT_SUBMITTED,
            message="New complaint submitted for review",
            is_read=False,
        )
        self.notif_r1_escalation = Notification.objects.create(
            recipient=self.reviewer_1,
            event_type=Notification.EventType.ESCALATION_CREATED,
            message="Escalation assigned to you",
            is_read=False,
        )
        self.notif_r1_report = Notification.objects.create(
            recipient=self.reviewer_1,
            event_type=Notification.EventType.REPORT_SUBMITTED,
            message="Report submitted",
            is_read=True,
        )

        # Notification for reviewer_2
        self.notif_r2 = Notification.objects.create(
            recipient=self.reviewer_2,
            event_type=Notification.EventType.COMPLAINT_SUBMITTED,
            message="Reviewer 2 secret notification",
            is_read=False,
        )

        # Notification for customer
        self.notif_cust = Notification.objects.create(
            recipient=self.customer,
            event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
            message="Your complaint was resolved",
            is_read=False,
        )

    def test_14_reviewer_can_retrieve_own_notifications(self):
        resp = self.client.get("/api/v1/notifications/", **auth(self.reviewer_1))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {n["id"] for n in resp.json()}
        self.assertEqual(ids, {self.notif_r1_complaint.pk, self.notif_r1_escalation.pk, self.notif_r1_report.pk})

    def test_15_reviewer_cannot_retrieve_another_reviewers_notifications(self):
        resp = self.client.get("/api/v1/notifications/", **auth(self.reviewer_1))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {n["id"] for n in resp.json()}
        self.assertNotIn(self.notif_r2.pk, ids)

    def test_16_customer_cannot_access_reviewer_notifications(self):
        resp = self.client.get("/api/v1/notifications/", **auth(self.customer))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {n["id"] for n in resp.json()}
        self.assertEqual(ids, {self.notif_cust.pk})
        self.assertNotIn(self.notif_r1_complaint.pk, ids)
        self.assertNotIn(self.notif_r2.pk, ids)

    def test_17_restaurant_user_cannot_access_reviewer_notifications(self):
        resp = self.client.get("/api/v1/notifications/", **auth(self.restaurant_user))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json(), [])

    def test_18_reviewer_cannot_patch_another_users_notification(self):
        resp = self.client.patch(
            f"/api/v1/notifications/{self.notif_r2.pk}/",
            {"is_read": True},
            format="json",
            **auth(self.reviewer_1),
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_19_unread_count_endpoint(self):
        resp = self.client.get("/api/v1/notifications/unread-count/", **auth(self.reviewer_1))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # reviewer_1 has 2 unread, 1 read
        self.assertEqual(resp.json(), {"unread_count": 2})

    def test_20_mark_all_read_endpoint(self):
        resp = self.client.post("/api/v1/notifications/mark-all-read/", **auth(self.reviewer_1))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["updated_count"], 2)

        # Verify reviewer_1's notifications are now all read
        unread = Notification.objects.filter(recipient=self.reviewer_1, is_read=False).count()
        self.assertEqual(unread, 0)

        # Verify reviewer_2's notification is unaffected
        self.notif_r2.refresh_from_db()
        self.assertFalse(self.notif_r2.is_read)

    def test_21_filter_by_read_and_unread(self):
        resp_unread = self.client.get("/api/v1/notifications/?is_read=false", **auth(self.reviewer_1))
        self.assertEqual(resp_unread.status_code, status.HTTP_200_OK)
        unread_ids = {n["id"] for n in resp_unread.json()}
        self.assertEqual(unread_ids, {self.notif_r1_complaint.pk, self.notif_r1_escalation.pk})

        resp_read = self.client.get("/api/v1/notifications/?is_read=true", **auth(self.reviewer_1))
        self.assertEqual(resp_read.status_code, status.HTTP_200_OK)
        read_ids = {n["id"] for n in resp_read.json()}
        self.assertEqual(read_ids, {self.notif_r1_report.pk})

    def test_22_filter_by_category(self):
        resp_complaints = self.client.get("/api/v1/notifications/?category=complaints", **auth(self.reviewer_1))
        self.assertEqual(resp_complaints.status_code, status.HTTP_200_OK)
        ids = {n["id"] for n in resp_complaints.json()}
        self.assertEqual(ids, {self.notif_r1_complaint.pk})

        resp_escalations = self.client.get("/api/v1/notifications/?category=escalations", **auth(self.reviewer_1))
        self.assertEqual(resp_escalations.status_code, status.HTTP_200_OK)
        ids = {n["id"] for n in resp_escalations.json()}
        self.assertEqual(ids, {self.notif_r1_escalation.pk})

        resp_reports = self.client.get("/api/v1/notifications/?category=reports", **auth(self.reviewer_1))
        self.assertEqual(resp_reports.status_code, status.HTTP_200_OK)
        ids = {n["id"] for n in resp_reports.json()}
        self.assertEqual(ids, {self.notif_r1_report.pk})

    def test_23_pagination_when_requested(self):
        resp = self.client.get("/api/v1/notifications/?page=1&page_size=2", **auth(self.reviewer_1))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertEqual(data["count"], 3)
        self.assertEqual(len(data["results"]), 2)

    def test_24_reviewer_rejection_notification_integration(self):
        """Verifies Phase 2.1 rejection creates notification for customer."""
        customer = make_user()
        restaurant = make_restaurant()
        report = FoodReport.objects.create(
            customer=customer, restaurant=restaurant, title="Spoiled food", description="d",
            status=FoodReport.Status.SUBMITTED,
        )
        complaint = ComplaintService().create(
            food_report=report, requesting_user=customer, title="Spoiled food item",
            description="Bad taste and smell", category=Complaint.Category.SPOILAGE,
        )
        ComplaintService().update(complaint, {"status": Complaint.Status.UNDER_REVIEW})

        # Reject as reviewer
        ComplaintService().update(
            complaint,
            {"status": Complaint.Status.REJECTED, "rejection_reason": "Insufficient evidence provided."},
            requesting_user=self.reviewer_1,
        )

        # Verify customer received notification
        rejection_notif = Notification.objects.filter(
            recipient=customer,
            event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
            related_complaint=complaint,
        ).first()
        self.assertIsNotNone(rejection_notif)
        self.assertIn("rejected", rejection_notif.message.lower())
        self.assertIn("Insufficient evidence provided.", rejection_notif.message)

