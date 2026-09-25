"""
FoodGuard AI — Feedback Service Layer.

Responsibilities
----------------
- Verify complaint belongs to the requesting customer
- Verify complaint is in RESOLVED or CLOSED status
- Prevent duplicate feedback per complaint
- Derive customer and original_language from context (never from client)
- Create the Feedback record

No AI logic. No notification logic. No translation logic.
"""

from complaints.models import Complaint
from feedback.models import Feedback


# ---------------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------------

class FeedbackError(Exception):
    """Raised when a feedback business rule is violated."""


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class FeedbackService:
    """
    Encapsulates feedback creation.

    Usage
    -----
    service = FeedbackService()
    fb = service.create(
        complaint=complaint,
        requesting_user=request.user,
        rating=4,
        comments="The issue was handled promptly.",
    )
    """

    # Statuses that allow feedback
    _ALLOWED_STATUSES = {
        Complaint.Status.RESOLVED,
        Complaint.Status.CLOSED,
    }

    def create(
        self,
        *,
        complaint: Complaint,
        requesting_user,
        rating: int,
        comments: str = "",
    ) -> Feedback:
        self._check_ownership(complaint, requesting_user)
        self._check_complaint_status(complaint)
        self._check_no_existing_feedback(complaint)

        return Feedback.objects.create(
            complaint=complaint,
            customer=requesting_user,
            rating=rating,
            comments=comments,
            original_language=requesting_user.preferred_language,
        )

    # ------------------------------------------------------------------
    # Guards
    # ------------------------------------------------------------------

    def _check_ownership(self, complaint: Complaint, user) -> None:
        if complaint.customer_id != user.pk:
            raise FeedbackError(
                "You can only submit feedback for your own complaint."
            )

    def _check_complaint_status(self, complaint: Complaint) -> None:
        if complaint.status not in self._ALLOWED_STATUSES:
            raise FeedbackError(
                "Feedback can only be submitted for RESOLVED or CLOSED complaints. "
                f"This complaint is currently '{complaint.get_status_display()}'."
            )

    def _check_no_existing_feedback(self, complaint: Complaint) -> None:
        if Feedback.objects.filter(complaint=complaint).exists():
            raise FeedbackError(
                "Feedback has already been submitted for this complaint. "
                "Only one feedback submission per complaint is permitted."
            )
