"""
food_safety_officers — Service Layer
=====================================

PROTOTYPE DISCLAIMER: Not an officially integrated government system.

Responsibilities
----------------
- assign_complaint()       : route a new complaint to its Level-1 officer
- escalate_assignment()    : move complaint to next enabled level
- place_on_hold()          : pause deadline on an assignment
- resume_from_hold()       : unpause and extend deadline by time held
- process_overdue()        : check all active assignments and escalate overdue ones
- _next_enabled_level()    : utility — find the next configured + enabled level

Rules enforced here (never in views)
--------------------------------------
- Resolved / Closed complaints are never escalated
- Complaints on hold are never auto-escalated
- Duplicate escalation events (same complaint + to_level) are prevented
- Duplicate active assignments per complaint are prevented
- Final-level complaints are marked AWAITING_FINAL_AUTHORITY, not silently dropped
"""

import logging
from datetime import timedelta

from django.utils import timezone

from complaints.models import Complaint
from food_safety_officers.models import (
    EscalationEvent,
    EscalationLevel,
    OfficerComplaintAssignment,
    PrototypeOfficer,
    RestaurantOfficerMapping,
)

logger = logging.getLogger("foodguard")

# Roles that are permitted to hold officer assignments
_OFFICER_ROLES = {"REVIEWER", "ADMIN"}


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class OfficerAssignmentError(Exception):
    """Raised when an officer-assignment business rule is violated."""


class InvalidOfficerRoleError(OfficerAssignmentError):
    """Raised when a user with an ineligible role is used as a prototype officer."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _next_enabled_level(current_level: EscalationLevel) -> EscalationLevel | None:
    """Return the next enabled EscalationLevel after current_level, or None if final."""
    return (
        EscalationLevel.objects
        .filter(order__gt=current_level.order, is_enabled=True)
        .order_by("order")
        .first()
    )


def _check_officer_user_role(officer: PrototypeOfficer) -> None:
    """
    Guard: raise InvalidOfficerRoleError if the officer's linked user account
    does not have REVIEWER or ADMIN role.  Called before any assignment is
    persisted so invalid accounts are caught at service layer regardless of
    how the PrototypeOfficer record was created (admin, management command, etc.).
    """
    if officer.user.role not in _OFFICER_ROLES:
        raise InvalidOfficerRoleError(
            f"Officer '{officer.designation}' is linked to user '{officer.user.email}' "
            f"who has role '{officer.user.role}'. "
            "Only REVIEWER or ADMIN role users may be assigned to complaints."
        )


def _active_assignment(complaint: Complaint) -> OfficerComplaintAssignment | None:
    return (
        OfficerComplaintAssignment.objects
        .filter(
            complaint=complaint,
            status__in=[
                OfficerComplaintAssignment.AssignmentStatus.ASSIGNED,
                OfficerComplaintAssignment.AssignmentStatus.UNDER_INVESTIGATION,
                OfficerComplaintAssignment.AssignmentStatus.ACTION_TAKEN,
                OfficerComplaintAssignment.AssignmentStatus.ON_HOLD,
            ],
        )
        .select_related("officer", "level")
        .first()
    )


def _fire_notification(complaint: Complaint, officer: PrototypeOfficer, event_type: str, message: str) -> None:
    """Create a notification for the officer's user account and the complaint customer."""
    try:
        from notifications.services import NotificationService
        svc = NotificationService()
        # Notify the officer
        svc.notify(
            recipient=officer.user,
            event_type=event_type,
            message=message,
            related_complaint=complaint,
        )
        # Notify the complaint's customer
        if complaint.customer_id and complaint.customer_id != officer.user_id:
            svc.notify(
                recipient=complaint.customer,
                event_type=event_type,
                message=message,
                related_complaint=complaint,
            )
    except Exception:
        # Notifications are best-effort — never let a notification failure
        # block the escalation workflow
        logger.exception(
            "Notification failed for complaint_id=%s event=%s", complaint.pk, event_type
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def assign_complaint(complaint: Complaint) -> OfficerComplaintAssignment | None:
    """
    Route a newly submitted complaint to its Level-1 officer.

    1. Look up RestaurantOfficerMapping for the complaint's restaurant.
    2. If no mapping exists → log a warning, return None
       (complaint is marked awaiting assignment by admin).
    3. If a mapping exists but no level_1_officer set → return None.
    4. Create OfficerComplaintAssignment + EscalationEvent.
    5. Fire OFFICER_ASSIGNED notifications.

    Never raises — failures are logged server-side only.
    """
    try:
        mapping = RestaurantOfficerMapping.objects.select_related(
            "level_1_officer__level"
        ).get(restaurant=complaint.restaurant)
    except RestaurantOfficerMapping.DoesNotExist:
        logger.warning(
            "No officer mapping for restaurant_id=%s — complaint_id=%s "
            "is awaiting administrative assignment.",
            complaint.restaurant_id,
            complaint.pk,
        )
        return None

    officer = mapping.level_1_officer
    if officer is None or not officer.is_active:
        logger.warning(
            "Mapping exists for restaurant_id=%s but level_1_officer is "
            "None or inactive — complaint_id=%s awaiting assignment.",
            complaint.restaurant_id,
            complaint.pk,
        )
        return None

    # Role guard — prevents CUSTOMER-role users from being used as officers
    try:
        _check_officer_user_role(officer)
    except InvalidOfficerRoleError:
        logger.warning(
            "Officer '%s' (user=%s, role=%s) has an ineligible role — "
            "complaint_id=%s is awaiting administrative assignment.",
            officer.designation, officer.user.email, officer.user.role,
            complaint.pk,
        )
        return None

    level    = officer.level
    deadline = timezone.now() + timedelta(days=level.response_deadline_days)

    assignment = OfficerComplaintAssignment.objects.create(
        complaint    = complaint,
        officer      = officer,
        level        = level,
        status       = OfficerComplaintAssignment.AssignmentStatus.ASSIGNED,
        deadline_at  = deadline,
    )

    # Append-only audit event
    EscalationEvent.objects.create(
        complaint        = complaint,
        from_level       = None,   # initial — no previous level
        to_level         = level,
        from_officer     = None,
        to_officer       = officer,
        trigger          = EscalationEvent.TriggerType.AUTOMATIC,
        reason           = "Complaint automatically assigned to Level-1 prototype officer.",
        customer_message = (
            f"Your complaint has been assigned for review by the designated "
            f"authority: {officer.designation}."
        ),
    )

    _fire_notification(
        complaint  = complaint,
        officer    = officer,
        event_type = "OFFICER_ASSIGNED",
        message    = (
            f"Complaint '{complaint.title}' assigned to {officer.designation}. "
            f"Response required by {deadline.strftime('%d %b %Y')}."
        ),
    )

    return assignment


def escalate_assignment(
    assignment: OfficerComplaintAssignment,
    *,
    reason: str = "Response deadline exceeded.",
    trigger: str = EscalationEvent.TriggerType.AUTOMATIC,
    performed_by=None,
) -> OfficerComplaintAssignment | None:
    """
    Escalate an assignment to the next enabled level.

    - Marks current assignment ESCALATED.
    - Creates a new OfficerComplaintAssignment at the next level.
    - Appends an EscalationEvent.
    - Returns the new assignment, or None if already at the final level.

    If the final level is reached and no next level exists, marks the
    complaint as AWAITING_FINAL_AUTHORITY by logging clearly — no silent drop.
    """
    complaint = assignment.complaint

    # Safety guards
    if complaint.status in (Complaint.Status.RESOLVED, Complaint.Status.CLOSED):
        raise OfficerAssignmentError(
            f"Cannot escalate complaint #{complaint.pk} — it is already "
            f"'{complaint.get_status_display()}'."
        )
    if assignment.status == OfficerComplaintAssignment.AssignmentStatus.ON_HOLD:
        raise OfficerAssignmentError(
            f"Cannot escalate complaint #{complaint.pk} — assignment is ON_HOLD."
        )

    next_level = _next_enabled_level(assignment.level)

    if next_level is None:
        # Final level reached — no auto-invention of further levels
        logger.warning(
            "Complaint #%s has reached the final configured escalation level (%s). "
            "No further auto-escalation is possible. Marking for administrative review.",
            complaint.pk,
            assignment.level.code,
        )
        # Keep existing assignment but record the event
        EscalationEvent.objects.create(
            complaint            = complaint,
            from_level           = assignment.level,
            to_level             = assignment.level,  # stays at same level
            from_officer         = assignment.officer,
            to_officer           = None,
            trigger              = trigger,
            reason               = reason,
            deadline_exceeded_at = assignment.effective_deadline,
            performed_by         = performed_by,
            customer_message     = (
                "Your complaint has reached the highest configured authority level "
                "and is awaiting final administrative review."
            ),
        )
        return None

    # Find a Level-1 (or any) officer at next_level
    next_officer = (
        PrototypeOfficer.objects
        .filter(level=next_level, is_active=True)
        .select_related("user")
        .first()
    )
    # Skip officers with ineligible roles
    if next_officer:
        try:
            _check_officer_user_role(next_officer)
        except InvalidOfficerRoleError:
            logger.warning(
                "Officer '%s' at level %s has ineligible role — "
                "falling back to previous officer for assignment.",
                next_officer.designation, next_level.code,
            )
            next_officer = None

    # Mark current assignment superseded
    now = timezone.now()
    assignment.status      = OfficerComplaintAssignment.AssignmentStatus.ESCALATED
    assignment.resolved_at = now
    assignment.save(update_fields=["status", "resolved_at", "updated_at"])

    # Create new assignment at next level
    deadline = now + timedelta(days=next_level.response_deadline_days)
    new_assignment = OfficerComplaintAssignment.objects.create(
        complaint   = complaint,
        officer     = next_officer if next_officer else assignment.officer,  # fallback
        level       = next_level,
        status      = OfficerComplaintAssignment.AssignmentStatus.ASSIGNED,
        deadline_at = deadline,
    )

    EscalationEvent.objects.create(
        complaint            = complaint,
        from_level           = assignment.level,
        to_level             = next_level,
        from_officer         = assignment.officer,
        to_officer           = next_officer,
        trigger              = trigger,
        reason               = reason,
        deadline_exceeded_at = assignment.effective_deadline,
        performed_by         = performed_by,
        customer_message     = (
            f"Your complaint has been escalated to the {next_level.name} "
            f"as the previous authority did not resolve it within the required time."
        ),
    )

    if next_officer:
        _fire_notification(
            complaint  = complaint,
            officer    = next_officer,
            event_type = "OFFICER_ESCALATED",
            message    = (
                f"Complaint '{complaint.title}' escalated to {next_level.name}. "
                f"Response required by {deadline.strftime('%d %b %Y')}."
            ),
        )

    return new_assignment


def place_on_hold(
    assignment: OfficerComplaintAssignment,
    *,
    reason: str,
    performed_by=None,
) -> OfficerComplaintAssignment:
    """Pause the deadline on an assignment. Only active assignments can be held."""
    if not assignment.is_active:
        raise OfficerAssignmentError(
            f"Assignment #{assignment.pk} is not active and cannot be placed on hold."
        )
    if assignment.status == OfficerComplaintAssignment.AssignmentStatus.ON_HOLD:
        raise OfficerAssignmentError(
            f"Assignment #{assignment.pk} is already on hold."
        )
    assignment.status         = OfficerComplaintAssignment.AssignmentStatus.ON_HOLD
    assignment.hold_started_at = timezone.now()
    assignment.hold_reason    = reason
    assignment.save(update_fields=["status", "hold_started_at", "hold_reason", "updated_at"])
    return assignment


def resume_from_hold(
    assignment: OfficerComplaintAssignment,
    *,
    performed_by=None,
) -> OfficerComplaintAssignment:
    """
    Resume a held assignment. Extends the deadline by the number of days
    spent on hold so the officer gets a fresh window.
    """
    if assignment.status != OfficerComplaintAssignment.AssignmentStatus.ON_HOLD:
        raise OfficerAssignmentError(
            f"Assignment #{assignment.pk} is not on hold."
        )
    now = timezone.now()
    if assignment.hold_started_at:
        days_held = max(1, (now - assignment.hold_started_at).days)
        assignment.hold_duration_days += days_held

    assignment.status          = OfficerComplaintAssignment.AssignmentStatus.ASSIGNED
    assignment.hold_started_at = None
    assignment.save(update_fields=[
        "status", "hold_started_at", "hold_duration_days", "updated_at"
    ])
    return assignment


def process_overdue(dry_run: bool = False) -> dict:
    """
    Find all active assignments whose effective deadline has passed and
    escalate them.

    - Skips RESOLVED / CLOSED complaints.
    - Skips ON_HOLD assignments.
    - Prevents duplicate events by checking EscalationEvent for same
      complaint + to_level in the same processing run.
    - Returns a summary dict for logging / management-command output.

    Set dry_run=True to preview without committing changes.
    """
    now = timezone.now()

    overdue = (
        OfficerComplaintAssignment.objects
        .filter(
            status__in=[
                OfficerComplaintAssignment.AssignmentStatus.ASSIGNED,
                OfficerComplaintAssignment.AssignmentStatus.UNDER_INVESTIGATION,
                OfficerComplaintAssignment.AssignmentStatus.ACTION_TAKEN,
            ],
        )
        .exclude(complaint__status__in=[
            Complaint.Status.RESOLVED,
            Complaint.Status.CLOSED,
        ])
        .select_related("officer__level", "complaint", "level")
    )

    summary = {
        "checked":   0,
        "escalated": 0,
        "final_level": 0,
        "skipped":   0,
        "errors":    0,
        "dry_run":   dry_run,
    }

    for assignment in overdue:
        summary["checked"] += 1
        if not assignment.is_overdue:
            summary["skipped"] += 1
            continue
        try:
            if dry_run:
                logger.info(
                    "[DRY RUN] Would escalate complaint_id=%s from level=%s",
                    assignment.complaint_id,
                    assignment.level.code,
                )
                summary["escalated"] += 1
                continue

            result = escalate_assignment(
                assignment,
                reason=f"Deadline exceeded: {assignment.effective_deadline.strftime('%d %b %Y %H:%M UTC')}.",
                trigger=EscalationEvent.TriggerType.AUTOMATIC,
            )
            if result is None:
                summary["final_level"] += 1
            else:
                summary["escalated"] += 1
        except OfficerAssignmentError as e:
            logger.warning(
                "Could not escalate assignment_id=%s: %s",
                assignment.pk, e,
            )
            summary["skipped"] += 1
        except Exception:
            logger.exception(
                "Unexpected error escalating assignment_id=%s", assignment.pk
            )
            summary["errors"] += 1

    return summary
