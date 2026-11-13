"""
FoodGuard AI — Complaint Service Layer.

Responsibilities
----------------
- Validate FoodReport ownership before creation
- Verify FoodReport is in SUBMITTED status
- Prevent duplicate complaints per FoodReport
- Derive customer, restaurant, original_language from context (never from client)
- Create Complaint record
- Validate and execute status transitions
- Set / clear resolved_at appropriately

No AI logic. No escalation logic. No translation logic.
"""

from django.db import transaction
from django.utils import timezone

from food_reports.models import FoodReport
from complaints.models import Complaint, ComplaintInvestigation, ReviewerActivity
from users.models import User


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class ComplaintError(Exception):
    """Generic complaint business-rule violation."""


# ---------------------------------------------------------------------------
# Valid status transitions
# ---------------------------------------------------------------------------

# Maps current status → allowed next statuses (reviewer/admin only)
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    Complaint.Status.SUBMITTED: {
        Complaint.Status.UNDER_REVIEW,
    },
    Complaint.Status.UNDER_REVIEW: {
        Complaint.Status.SUBMITTED,   # revert with documented reason
        Complaint.Status.RESOLVED,
        Complaint.Status.REJECTED,
    },
    Complaint.Status.RESOLVED: {
        Complaint.Status.CLOSED,
    },
    Complaint.Status.CLOSED: set(),    # terminal state
    Complaint.Status.REJECTED: set(),  # terminal state
}

# Statuses that represent resolution (trigger resolved_at timestamp)
_RESOLVED_STATUSES = {Complaint.Status.RESOLVED, Complaint.Status.CLOSED}


# ---------------------------------------------------------------------------
# Investigation Service
# ---------------------------------------------------------------------------

class ComplaintInvestigationService:
    """Create and maintain structured complaint investigations."""

    def _record_activity(
        self,
        complaint,
        actor,
        action_type,
        summary,
        metadata=None,
    ):
        return ReviewerActivity.objects.create(
            actor=actor,
            complaint=complaint,
            action_type=action_type,
            summary=summary,
            metadata=metadata or {},
        )

    def get_investigation(self, complaint):
        return complaint.investigation if hasattr(complaint, "investigation") else None

    def start_investigation(self, complaint, requesting_user):
        if requesting_user.role not in {User.Role.REVIEWER, User.Role.ADMIN}:
            raise ComplaintError("Only authorized reviewers or admins can start an investigation.")

        investigation = complaint.investigation if hasattr(complaint, "investigation") else None
        if investigation is None:
            investigation = ComplaintInvestigation.objects.create(
                complaint=complaint,
                investigator=requesting_user,
                assigned_reviewer=requesting_user,
                status=ComplaintInvestigation.Status.IN_PROGRESS,
                started_at=timezone.now(),
            )
        else:
            if investigation.status == ComplaintInvestigation.Status.COMPLETED:
                raise ComplaintError("This complaint investigation has already been completed.")
            if (
                investigation.investigator_id is not None
                and investigation.investigator_id != requesting_user.pk
                and requesting_user.role != User.Role.ADMIN
            ):
                raise ComplaintError("You are not authorized to investigate this complaint.")
            investigation.investigator = requesting_user
            investigation.assigned_reviewer = requesting_user
            investigation.status = ComplaintInvestigation.Status.IN_PROGRESS
            if investigation.started_at is None:
                investigation.started_at = timezone.now()
            investigation.save(update_fields=["investigator", "assigned_reviewer", "status", "started_at", "updated_at"])

        self._record_activity(
            complaint,
            requesting_user,
            ReviewerActivity.ActionType.INVESTIGATION_STARTED,
            f"Investigation started by {requesting_user.full_name or requesting_user.email}.",
            {"status": investigation.status},
        )
        return investigation

    def update_investigation(self, investigation, validated_data, requesting_user):
        if requesting_user.role not in {User.Role.REVIEWER, User.Role.ADMIN}:
            raise ComplaintError("Only authorized reviewers or admins can update an investigation.")

        if (
            requesting_user.role != User.Role.ADMIN
            and investigation.investigator_id != requesting_user.pk
            and investigation.assigned_reviewer_id != requesting_user.pk
        ):
            raise ComplaintError("You are not authorized to modify this investigation.")

        if investigation.status == ComplaintInvestigation.Status.COMPLETED:
            raise ComplaintError("Completed investigations are read-only.")

        for attr, value in validated_data.items():
            if attr == "status" and value:
                setattr(investigation, attr, value)
            elif attr != "status":
                setattr(investigation, attr, value)

        if validated_data.get("status"):
            investigation.status = validated_data["status"]
        else:
            investigation.status = ComplaintInvestigation.Status.IN_PROGRESS

        if investigated := validated_data.get("recommendation"):
            investigation.recommendation = investigated

        investigation.save()
        self._record_activity(
            investigation.complaint,
            requesting_user,
            ReviewerActivity.ActionType.INVESTIGATION_UPDATED,
            f"Investigation notes updated by {requesting_user.full_name or requesting_user.email}.",
            {"status": investigation.status, "recommendation": investigation.recommendation},
        )
        return investigation

    def complete_investigation(self, investigation, validated_data, requesting_user):
        if requesting_user.role not in {User.Role.REVIEWER, User.Role.ADMIN}:
            raise ComplaintError("Only authorized reviewers or admins can complete an investigation.")

        if (
            requesting_user.role != User.Role.ADMIN
            and investigation.investigator_id != requesting_user.pk
            and investigation.assigned_reviewer_id != requesting_user.pk
        ):
            raise ComplaintError("You are not authorized to complete this investigation.")

        required_fields = [
            "summary",
            "findings",
            "actions_taken",
            "recommendation",
        ]
        for field in required_fields:
            value = (validated_data.get(field) or "").strip()
            if not value:
                raise ComplaintError(f"Investigation field '{field}' is required before completion.")

        investigation.summary = (validated_data.get("summary") or "").strip()
        investigation.findings = (validated_data.get("findings") or "").strip()
        investigation.observations = (validated_data.get("observations") or "").strip()
        investigation.evidence_review_notes = (validated_data.get("evidence_review_notes") or "").strip()
        investigation.actions_taken = (validated_data.get("actions_taken") or "").strip()
        investigation.remarks = (validated_data.get("remarks") or "").strip()
        investigation.recommendation = validated_data["recommendation"]
        investigation.status = ComplaintInvestigation.Status.COMPLETED
        investigation.completed_at = timezone.now()
        investigation.save()

        self._record_activity(
            investigation.complaint,
            requesting_user,
            ReviewerActivity.ActionType.INVESTIGATION_COMPLETED,
            f"Investigation completed by {requesting_user.full_name or requesting_user.email}.",
            {"status": investigation.status, "recommendation": investigation.recommendation},
        )
        return investigation


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ComplaintService:
    """
    Encapsulates complaint creation and lifecycle management.

    Usage — creation
    ----------------
    service = ComplaintService()
    complaint = service.create(
        food_report=report,
        requesting_user=request.user,
        title=..., description=..., category=...
    )

    Usage — update (reviewer/admin)
    --------------------------------
    complaint = service.update(complaint, validated_data)
    """

    # ------------------------------------------------------------------
    # Creation
    # ------------------------------------------------------------------

    def create(
        self,
        *,
        food_report: FoodReport,
        requesting_user,
        title: str,
        description: str,
        category: str,
    ) -> Complaint:
        """
        Validate and create a Complaint.

        Raises ComplaintError on any rule violation.
        """
        self._check_report_ownership(food_report, requesting_user)
        self._check_report_submitted(food_report)
        self._check_no_existing_complaint(food_report)

        complaint = Complaint.objects.create(
            food_report=food_report,
            customer=requesting_user,
            # Derived server-side — never from the client
            restaurant=food_report.restaurant,
            original_language=requesting_user.preferred_language,
            title=title,
            description=description,
            category=category,
            status=Complaint.Status.SUBMITTED,
            priority=Complaint.Priority.LOW,
        )

        from notifications.models import Notification
        from notifications.services import NotificationService
        # Reviewers and Admins are always the recipients/fallbacks for incoming complaints
        NotificationService().notify_reviewers_and_admins(
            event_type=Notification.EventType.COMPLAINT_SUBMITTED,
            message=f"New complaint filed: \"{complaint.title}\".",
            related_complaint=complaint,
        )

        # Notify the restaurant owner ONLY if the restaurant has a verified claimed owner
        if complaint.restaurant.owner_id is not None and complaint.restaurant.is_verified:
            NotificationService().notify(
                recipient=complaint.restaurant.owner,
                event_type=Notification.EventType.COMPLAINT_SUBMITTED,
                message=f"New complaint filed for {complaint.restaurant.name}: \"{complaint.title}\".",
                related_complaint=complaint,
            )

        # ── Prototype officer auto-assignment ──────────────────────
        # Best-effort: never raise if the food_safety_officers app has no
        # mapping configured — complaint creation must always succeed.
        try:
            from food_safety_officers.services import assign_complaint as _assign
            _assign(complaint)
        except Exception:
            import logging
            logging.getLogger("foodguard").exception(
                "Officer auto-assignment failed for complaint_id=%s — "
                "complaint was still created successfully.", complaint.pk
            )

        return complaint

    # ------------------------------------------------------------------
    # Update (reviewer / admin only)
    # ------------------------------------------------------------------

    def update(
        self,
        complaint: Complaint,
        validated_data: dict,
        requesting_user=None,
    ) -> Complaint:
        """
        Apply a validated partial update to an existing Complaint.

        Handles:
        - status transition validation (including rejection rules)
        - resolved_at / rejected_at bookkeeping
        - reviewer action attribution
        - atomic database updates
        """
        previous_status = complaint.status
        previous_priority = complaint.priority
        new_status = validated_data.get("status")
        status_changed = bool(new_status and new_status != complaint.status)

        if new_status == Complaint.Status.REJECTED:
            if complaint.status == Complaint.Status.RESOLVED:
                raise ComplaintError("A resolved complaint cannot be rejected.")
            if complaint.status == Complaint.Status.CLOSED:
                raise ComplaintError("A closed complaint cannot be rejected.")
            if complaint.status == Complaint.Status.REJECTED:
                raise ComplaintError("This complaint is already rejected.")
            if complaint.status == Complaint.Status.SUBMITTED:
                raise ComplaintError(
                    "Status transition from 'SUBMITTED' to 'REJECTED' is not allowed. "
                    "A complaint must be in 'UNDER_REVIEW' status before it can be rejected."
                )
            rejection_reason = validated_data.get("rejection_reason")
            if rejection_reason is None or not rejection_reason.strip():
                raise ComplaintError(
                    "A non-empty rejection reason is required when rejecting a complaint."
                )

        if status_changed:
            self._check_status_transition(complaint.status, new_status)

        with transaction.atomic():
            for attr, value in validated_data.items():
                if attr == "rejection_reason":
                    setattr(complaint, attr, value.strip())
                else:
                    setattr(complaint, attr, value)

            if new_status == Complaint.Status.REJECTED:
                complaint.rejected_at = timezone.now()
                if requesting_user and getattr(requesting_user, "is_authenticated", False):
                    complaint.rejected_by = requesting_user

            # Manage resolved_at based on the resulting status
            current_status = getattr(complaint, "status")
            if current_status in _RESOLVED_STATUSES:
                if complaint.resolved_at is None:
                    complaint.resolved_at = timezone.now()
            else:
                complaint.resolved_at = None

            complaint.save()
            self._record_review_activity(
                complaint=complaint,
                actor=requesting_user,
                previous_status=previous_status,
                previous_priority=previous_priority,
                new_status=new_status,
            )

        if status_changed:
            from notifications.models import Notification
            from notifications.services import NotificationService

            if complaint.status == Complaint.Status.REJECTED:
                NotificationService().notify(
                    recipient=complaint.customer,
                    event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
                    message=(
                        f"Your complaint \"{complaint.title}\" has been rejected: "
                        f"{complaint.rejection_reason}"
                    ),
                    related_complaint=complaint,
                )
                if complaint.restaurant.owner_id is not None and complaint.restaurant.is_verified:
                    NotificationService().notify(
                        recipient=complaint.restaurant.owner,
                        event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
                        message=(
                            f"Complaint \"{complaint.title}\" for {complaint.restaurant.name} "
                            f"was rejected by reviewer."
                        ),
                        related_complaint=complaint,
                    )
            else:
                NotificationService().notify(
                    recipient=complaint.customer,
                    event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
                    message=(
                        f"Your complaint \"{complaint.title}\" status changed to "
                        f"{complaint.get_status_display()}."
                    ),
                    related_complaint=complaint,
                )

        return complaint

    # ------------------------------------------------------------------
    # Private guards
    # ------------------------------------------------------------------

    def _record_review_activity(
        self,
        *,
        complaint: Complaint,
        actor,
        previous_status: str | None,
        previous_priority: str | None,
        new_status: str | None,
    ) -> None:
        if actor is None or not getattr(actor, "is_authenticated", False):
            return
        if actor.role not in (User.Role.REVIEWER, User.Role.ADMIN):
            return

        priority_changed = (
            "priority" in complaint.__dict__ and
            previous_priority is not None and
            complaint.priority != previous_priority
        )

        if new_status == Complaint.Status.REJECTED:
            ReviewerActivity.objects.create(
                actor=actor,
                complaint=complaint,
                action_type=ReviewerActivity.ActionType.COMPLAINT_REJECTED,
                summary=(
                    f"Complaint #{complaint.pk} rejected by {actor.full_name} — "
                    f"{complaint.rejection_reason or 'No reason provided'}"
                ),
                metadata={
                    "from_status": previous_status,
                    "to_status": Complaint.Status.REJECTED,
                    "rejection_reason": complaint.rejection_reason,
                },
            )
            return

        if new_status and new_status != previous_status:
            ReviewerActivity.objects.create(
                actor=actor,
                complaint=complaint,
                action_type=ReviewerActivity.ActionType.COMPLAINT_STATUS_CHANGED,
                summary=(
                    f"Complaint #{complaint.pk} status changed from "
                    f"{previous_status} to {new_status} by {actor.full_name}"
                ),
                metadata={
                    "from_status": previous_status,
                    "to_status": new_status,
                },
            )
            return

        if priority_changed:
            ReviewerActivity.objects.create(
                actor=actor,
                complaint=complaint,
                action_type=ReviewerActivity.ActionType.COMPLAINT_PRIORITY_CHANGED,
                summary=(
                    f"Complaint #{complaint.pk} priority changed from "
                    f"{previous_priority} to {complaint.priority} by {actor.full_name}"
                ),
                metadata={
                    "from_priority": previous_priority,
                    "to_priority": complaint.priority,
                },
            )

    def _check_report_ownership(self, food_report: FoodReport, user) -> None:
        if food_report.customer_id != user.pk:
            raise ComplaintError(
                "You can only file a complaint for your own food report."
            )

    def _check_report_submitted(self, food_report: FoodReport) -> None:
        if food_report.status != FoodReport.Status.SUBMITTED:
            raise ComplaintError(
                "A complaint can only be filed against a SUBMITTED food report. "
                f"This report is currently '{food_report.get_status_display()}'."
            )

    def _check_no_existing_complaint(self, food_report: FoodReport) -> None:
        if Complaint.objects.filter(food_report=food_report).exists():
            raise ComplaintError(
                "A complaint already exists for this food report. "
                "Only one complaint per report is permitted."
            )

    def _check_status_transition(
        self, current: str, requested: str
    ) -> None:
        allowed = _ALLOWED_TRANSITIONS.get(current, set())
        if requested not in allowed:
            raise ComplaintError(
                f"Status transition from '{current}' to '{requested}' is not allowed. "
                f"Allowed transitions from '{current}': "
                + (", ".join(sorted(allowed)) if allowed else "none (terminal state)")
            )
