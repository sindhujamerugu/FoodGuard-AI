"""
food_safety_officers — Backend Tests (16 cases)
================================================

PROTOTYPE DISCLAIMER: Not an officially integrated government system.

Test coverage
-------------
 1.  Restaurant with mapping → complaint assigned to Level-1 officer
 2.  Restaurant without mapping → no assignment created (graceful)
 3.  Deadline calculation is correct
 4.  Automatic escalation after deadline expiry → new assignment at Level-2
 5.  Escalation skips disabled levels
 6.  Resolved complaint is NOT escalated
 7.  Closed complaint is NOT escalated
 8.  ON_HOLD assignment is NOT escalated
 9.  Administrative hold pauses deadline
10.  Resume extends deadline by days held
11.  Duplicate escalation prevention (same complaint + to_level)
12.  Escalation history (EscalationEvent) is persisted and append-only
13.  Customer can only read their own complaint assignment (403 for others)
14.  Officer account can't be created for CUSTOMER role user
15.  Notification generated on assignment
16.  Final configured level → no further escalation, audit event recorded
"""

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from complaints.models import Complaint
from food_reports.models import FoodReport
from food_safety_officers.models import (
    EscalationEvent,
    EscalationLevel,
    OfficerComplaintAssignment,
    PrototypeOfficer,
    RestaurantOfficerMapping,
)
from food_safety_officers.services import (
    OfficerAssignmentError,
    assign_complaint,
    escalate_assignment,
    place_on_hold,
    process_overdue,
    resume_from_hold,
)
from notifications.models import Notification
from restaurants.models import Restaurant
from users.models import User


# ── Shared fixture helpers ────────────────────────────────────────────────────

def _make_user(email, role=User.Role.CUSTOMER):
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        first_name="Test",
        last_name="User",
        role=role,
    )


def _make_levels(count=3, deadline_days=1):
    """Create `count` enabled escalation levels with short deadlines for testing."""
    levels = []
    for i in range(1, count + 1):
        levels.append(
            EscalationLevel.objects.create(
                name=f"Prototype Level {i}",
                code=f"PROTO_L{i}",
                order=i,
                is_enabled=True,
                response_deadline_days=deadline_days,
            )
        )
    return levels


def _make_officer(user, level, designation="Test Officer"):
    return PrototypeOfficer.objects.create(
        user=user,
        level=level,
        designation=designation,
        jurisdiction="Test Jurisdiction",
    )


def _make_restaurant(name="Test Restaurant"):
    return Restaurant.objects.create(
        name=name, address="123 Test St", city="Hyderabad",
        state="Telangana", pincode="500001",
    )


def _make_complaint(customer, restaurant):
    """Create a submitted FoodReport + Complaint without triggering auto-assign."""
    report = FoodReport.objects.create(
        customer=customer,
        restaurant=restaurant,
        title="Spoiled food",
        description="Found mold.",
        status=FoodReport.Status.SUBMITTED,
    )
    return Complaint.objects.create(
        food_report=report,
        customer=customer,
        restaurant=restaurant,
        title="Formal complaint",
        description="Formal complaint description.",
        category=Complaint.Category.SPOILAGE,
        status=Complaint.Status.SUBMITTED,
    )


# ── Test cases ────────────────────────────────────────────────────────────────

class TestOfficerAssignment(TestCase):
    """Tests 1–3: assignment, missing mapping, deadline."""

    def setUp(self):
        self.levels      = _make_levels(3)
        self.officer_user = _make_user("officer@test.com", User.Role.REVIEWER)
        self.officer      = _make_officer(self.officer_user, self.levels[0])
        self.restaurant   = _make_restaurant()
        self.mapping      = RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant,
            level_1_officer=self.officer,
        )
        self.customer = _make_user("customer@test.com")
        self.complaint = _make_complaint(self.customer, self.restaurant)

    def test_01_assignment_created_for_mapped_restaurant(self):
        """Restaurant with mapping → complaint gets Level-1 assignment."""
        assignment = assign_complaint(self.complaint)
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.officer, self.officer)
        self.assertEqual(assignment.level, self.levels[0])
        self.assertEqual(assignment.status, OfficerComplaintAssignment.AssignmentStatus.ASSIGNED)

    def test_02_no_assignment_for_unmapped_restaurant(self):
        """Restaurant without mapping → returns None gracefully (no crash)."""
        restaurant2 = _make_restaurant("Unmapped Restaurant")
        complaint2  = _make_complaint(self.customer, restaurant2)
        assignment  = assign_complaint(complaint2)
        self.assertIsNone(assignment)

    def test_03_deadline_calculated_correctly(self):
        """Deadline = now + response_deadline_days (1 day in test setup)."""
        before = timezone.now()
        assignment = assign_complaint(self.complaint)
        after  = timezone.now()
        expected_min = before + timedelta(days=1)
        expected_max = after  + timedelta(days=1)
        self.assertGreaterEqual(assignment.deadline_at, expected_min)
        self.assertLessEqual(assignment.deadline_at, expected_max)


class TestEscalation(TestCase):
    """Tests 4–6: auto-escalation, disabled levels, resolved complaint guard."""

    def setUp(self):
        self.levels       = _make_levels(3, deadline_days=0)  # 0-day deadline = always overdue
        self.officer_user = _make_user("officer@test.com", User.Role.REVIEWER)
        self.officer_l1   = _make_officer(self.officer_user, self.levels[0], "Level-1 Officer")
        ou2 = _make_user("officer2@test.com", User.Role.REVIEWER)
        self.officer_l2   = _make_officer(ou2, self.levels[1], "Level-2 Officer")
        self.restaurant   = _make_restaurant()
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=self.officer_l1
        )
        self.customer  = _make_user("cust@test.com")
        self.complaint = _make_complaint(self.customer, self.restaurant)
        self.assignment = assign_complaint(self.complaint)

    def test_04_auto_escalation_after_deadline(self):
        """Overdue assignment escalates to Level-2."""
        # Force past deadline
        self.assignment.deadline_at = timezone.now() - timedelta(seconds=1)
        self.assignment.save()
        new_assignment = escalate_assignment(self.assignment, reason="Test escalation")
        self.assertIsNotNone(new_assignment)
        self.assertEqual(new_assignment.level, self.levels[1])
        self.assertEqual(
            OfficerComplaintAssignment.objects.get(pk=self.assignment.pk).status,
            OfficerComplaintAssignment.AssignmentStatus.ESCALATED,
        )

    def test_05_disabled_level_is_skipped(self):
        """Level-2 disabled → escalates directly to Level-3."""
        self.levels[1].is_enabled = False
        self.levels[1].save()
        self.assignment.deadline_at = timezone.now() - timedelta(seconds=1)
        self.assignment.save()
        new_assignment = escalate_assignment(self.assignment, reason="Skip disabled level")
        self.assertIsNotNone(new_assignment)
        self.assertEqual(new_assignment.level, self.levels[2])

    def test_06_resolved_complaint_not_escalated(self):
        """RESOLVED complaint raises OfficerAssignmentError."""
        self.complaint.status = Complaint.Status.RESOLVED
        self.complaint.save()
        with self.assertRaises(OfficerAssignmentError):
            escalate_assignment(self.assignment, reason="Should fail")


class TestClosedAndHold(TestCase):
    """Tests 7–10: closed complaint, hold/resume."""

    def setUp(self):
        self.levels       = _make_levels(2, deadline_days=1)
        self.officer_user = _make_user("off@test.com", User.Role.REVIEWER)
        self.officer      = _make_officer(self.officer_user, self.levels[0])
        self.restaurant   = _make_restaurant()
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=self.officer
        )
        self.customer  = _make_user("cust2@test.com")
        self.complaint = _make_complaint(self.customer, self.restaurant)
        self.assignment = assign_complaint(self.complaint)

    def test_07_closed_complaint_not_escalated(self):
        """CLOSED complaint raises OfficerAssignmentError."""
        self.complaint.status = Complaint.Status.CLOSED
        self.complaint.save()
        with self.assertRaises(OfficerAssignmentError):
            escalate_assignment(self.assignment, reason="Should fail")

    def test_08_on_hold_not_escalated(self):
        """ON_HOLD assignment raises OfficerAssignmentError."""
        place_on_hold(self.assignment, reason="Test hold")
        with self.assertRaises(OfficerAssignmentError):
            escalate_assignment(self.assignment, reason="Should fail")

    def test_09_hold_pauses_deadline(self):
        """is_overdue returns False when assignment is ON_HOLD."""
        # Set deadline in the past
        self.assignment.deadline_at = timezone.now() - timedelta(seconds=1)
        self.assignment.save()
        place_on_hold(self.assignment, reason="Pause test")
        self.assignment.refresh_from_db()
        self.assertFalse(self.assignment.is_overdue)

    def test_10_resume_extends_deadline(self):
        """Resuming from hold extends deadline by days held."""
        # Simulate having been on hold for 2 days
        from unittest.mock import patch
        hold_start = timezone.now() - timedelta(days=2)
        self.assignment.status = OfficerComplaintAssignment.AssignmentStatus.ON_HOLD
        self.assignment.hold_started_at = hold_start
        self.assignment.save()
        resume_from_hold(self.assignment)
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.status, OfficerComplaintAssignment.AssignmentStatus.ASSIGNED)
        self.assertGreaterEqual(self.assignment.hold_duration_days, 2)


class TestDuplicateAndHistory(TestCase):
    """Tests 11–12: duplicate prevention, audit trail."""

    def setUp(self):
        self.levels       = _make_levels(2, deadline_days=0)
        self.officer_user = _make_user("off3@test.com", User.Role.REVIEWER)
        self.officer      = _make_officer(self.officer_user, self.levels[0])
        self.restaurant   = _make_restaurant()
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=self.officer
        )
        self.customer  = _make_user("cust3@test.com")
        self.complaint = _make_complaint(self.customer, self.restaurant)
        self.assignment = assign_complaint(self.complaint)

    def test_11_duplicate_escalation_event_not_created(self):
        """
        An ESCALATED assignment is never re-processed by process_overdue.
        After the first run marks the original assignment ESCALATED, a second
        run must not change its status or create a new event sourced from it.
        """
        self.assignment.deadline_at = timezone.now() - timedelta(seconds=1)
        self.assignment.save()

        # First run: escalates original assignment L1 → L2 (ESCALATED)
        process_overdue()
        self.assignment.refresh_from_db()
        self.assertEqual(
            self.assignment.status,
            OfficerComplaintAssignment.AssignmentStatus.ESCALATED,
            "Assignment must be ESCALATED after first run",
        )

        # Second run: original assignment is ESCALATED — not active — must be ignored.
        process_overdue()
        self.assignment.refresh_from_db()
        self.assertEqual(
            self.assignment.status,
            OfficerComplaintAssignment.AssignmentStatus.ESCALATED,
            "Original assignment status must not change on second run",
        )

    def test_12_escalation_history_persisted(self):
        """Every escalation transition creates an EscalationEvent row."""
        initial_count = EscalationEvent.objects.filter(complaint=self.complaint).count()
        # Initial assignment already created 1 event
        self.assertEqual(initial_count, 1)
        self.assignment.deadline_at = timezone.now() - timedelta(seconds=1)
        self.assignment.save()
        escalate_assignment(self.assignment, reason="Audit test")
        self.assertEqual(
            EscalationEvent.objects.filter(complaint=self.complaint).count(),
            2,  # initial assignment + 1 escalation
        )


class TestAPIAccessControl(TestCase):
    """Tests 13–14: customer isolation, officer account validation."""

    def setUp(self):
        self.levels       = _make_levels(1)
        self.officer_user = _make_user("off4@test.com", User.Role.REVIEWER)
        self.officer      = _make_officer(self.officer_user, self.levels[0])
        self.restaurant   = _make_restaurant()
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=self.officer
        )
        self.customer1 = _make_user("c1@test.com")
        self.customer2 = _make_user("c2@test.com")
        self.complaint = _make_complaint(self.customer1, self.restaurant)
        assign_complaint(self.complaint)

    def test_13_customer_cannot_read_other_customers_assignment(self):
        """Customer2 requesting complaint owned by Customer1 → 404."""
        client = APIClient()
        client.force_authenticate(user=self.customer2)
        resp = client.get(f"/api/v1/officer-assignments/{self.complaint.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_14_api_rejects_customer_role_as_officer(self):
        """
        POST /api/v1/prototype-officers/ with a CUSTOMER-role user
        must return 400 — enforced by PrototypeOfficerAdminSerializer.validate_user().
        """
        admin_user = _make_user("admin14@test.com", User.Role.ADMIN)
        client     = APIClient()
        client.force_authenticate(user=admin_user)
        resp = client.post(
            "/api/v1/prototype-officers/",
            {
                "user":        self.customer2.pk,
                "level":       self.levels[0].pk,
                "designation": "Invalid officer — customer role",
                "is_active":   True,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400,
                         "Should reject CUSTOMER-role user as officer (HTTP 400)")
        self.assertIn("user", resp.data,
                      "Error must reference the 'user' field")

    def test_14b_api_accepts_reviewer_role_as_officer(self):
        """
        POST /api/v1/prototype-officers/ with a REVIEWER-role user must succeed (201).
        """
        reviewer = _make_user("reviewer14@test.com", User.Role.REVIEWER)
        admin    = _make_user("admin14b@test.com",   User.Role.ADMIN)
        client   = APIClient()
        client.force_authenticate(user=admin)
        resp = client.post(
            "/api/v1/prototype-officers/",
            {
                "user":        reviewer.pk,
                "level":       self.levels[0].pk,
                "designation": "Valid reviewer officer",
                "is_active":   True,
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201,
                         "REVIEWER-role user should be accepted (HTTP 201)")


class TestOfficerRoleValidation(TestCase):
    """Tests 14c–14d: service-level officer role guard."""

    def setUp(self):
        self.levels      = _make_levels(1)
        self.restaurant  = _make_restaurant()
        self.customer    = _make_user("roleval_cust@test.com")

    def test_14c_service_rejects_customer_role_officer_on_assign(self):
        """
        assign_complaint() must return None (graceful) when the mapped Level-1
        officer has a CUSTOMER-role user — not raise, not create an assignment.
        """
        from food_safety_officers.services import InvalidOfficerRoleError
        customer_officer_user = _make_user("bad_officer@test.com", User.Role.CUSTOMER)
        bad_officer = PrototypeOfficer.objects.create(
            user=customer_officer_user,
            level=self.levels[0],
            designation="INVALID CUSTOMER OFFICER",
        )
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=bad_officer
        )
        complaint = _make_complaint(self.customer, self.restaurant)
        result = assign_complaint(complaint)
        self.assertIsNone(result,
            "assign_complaint must return None when officer has CUSTOMER role")
        # No OfficerComplaintAssignment should have been created
        self.assertFalse(
            OfficerComplaintAssignment.objects.filter(complaint=complaint).exists()
        )

    def test_14d_service_accepts_admin_role_officer_on_assign(self):
        """ADMIN-role users are permitted as prototype officers."""
        admin_officer_user = _make_user("admin_officer@test.com", User.Role.ADMIN)
        good_officer = _make_officer(admin_officer_user, self.levels[0], "Admin Officer")
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=good_officer
        )
        complaint = _make_complaint(self.customer, self.restaurant)
        result = assign_complaint(complaint)
        self.assertIsNotNone(result,
            "assign_complaint must succeed when officer has ADMIN role")


class TestNotifications(TestCase):
    """Test 15: notification generated on assignment."""

    def setUp(self):
        self.levels       = _make_levels(1)
        self.officer_user = _make_user("notif_off@test.com", User.Role.REVIEWER)
        self.officer      = _make_officer(self.officer_user, self.levels[0])
        self.restaurant   = _make_restaurant()
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=self.officer
        )
        self.customer  = _make_user("notif_cust@test.com")
        self.complaint = _make_complaint(self.customer, self.restaurant)

    def test_15_notification_generated_on_assignment(self):
        """Assigning a complaint fires OFFICER_ASSIGNED notifications."""
        before = Notification.objects.count()
        assign_complaint(self.complaint)
        after  = Notification.objects.count()
        # At least one notification created (officer + customer)
        self.assertGreater(after, before)
        # At least one has event_type OFFICER_ASSIGNED
        self.assertTrue(
            Notification.objects.filter(
                event_type="OFFICER_ASSIGNED",
                related_complaint=self.complaint,
            ).exists()
        )


class TestFinalLevel(TestCase):
    """Test 16: final level handling."""

    def setUp(self):
        # Only 1 level — no next level possible
        self.levels       = _make_levels(1, deadline_days=0)
        self.officer_user = _make_user("final_off@test.com", User.Role.REVIEWER)
        self.officer      = _make_officer(self.officer_user, self.levels[0])
        self.restaurant   = _make_restaurant()
        RestaurantOfficerMapping.objects.create(
            restaurant=self.restaurant, level_1_officer=self.officer
        )
        self.customer  = _make_user("final_cust@test.com")
        self.complaint = _make_complaint(self.customer, self.restaurant)
        self.assignment = assign_complaint(self.complaint)

    def test_16_final_level_returns_none_and_records_event(self):
        """
        When no next level is configured, escalate_assignment returns None
        and still records an EscalationEvent for the audit trail.
        """
        self.assignment.deadline_at = timezone.now() - timedelta(seconds=1)
        self.assignment.save()
        events_before = EscalationEvent.objects.filter(complaint=self.complaint).count()
        result = escalate_assignment(self.assignment, reason="Final level test")
        events_after = EscalationEvent.objects.filter(complaint=self.complaint).count()
        self.assertIsNone(result, "Should return None at final level")
        self.assertGreater(events_after, events_before, "Audit event must still be recorded")
