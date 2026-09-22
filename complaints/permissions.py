from rest_framework.permissions import BasePermission, SAFE_METHODS

from users.models import User


class IsComplaintOwner(BasePermission):
    """
    Object-level permission for Complaint instances.

    - CUSTOMER: own complaint only (read-only after creation).
    - REVIEWER: read + update (status / priority / resolution_notes).
    - ADMIN: full access.
    - RESTAURANT_USER: explicitly denied — restaurant ownership does not
      grant automatic access to customer complaints.
    """

    message = "You do not have permission to access this complaint."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        role = request.user.role

        if role == User.Role.ADMIN:
            return True

        if role == User.Role.REVIEWER:
            # Reviewer gets read + update; DELETE is not exposed.
            return True

        if role == User.Role.CUSTOMER:
            return obj.customer_id == request.user.pk

        # RESTAURANT_USER and any other role: explicitly denied
        return False


class CanReviewComplaint(BasePermission):
    """
    View-level permission for PATCH (reviewer/admin workflow actions).

    Customers reach the view but are blocked from changing workflow
    fields inside ComplaintUpdateSerializer / the view guard.
    """

    message = "Only reviewers or admins may update complaint workflow fields."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in (
            User.Role.REVIEWER,
            User.Role.ADMIN,
        )


class ComplaintListCreatePermission(BasePermission):
    """
    GET  /api/v1/complaints/ — any authenticated user (filtered by role in view).
    POST /api/v1/complaints/ — CUSTOMER only.
    """

    message = "Only customers may create complaints."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == User.Role.CUSTOMER
