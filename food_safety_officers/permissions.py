from rest_framework.permissions import BasePermission
from users.models import User


class IsAdminUser(BasePermission):
    """ADMIN role only."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.ADMIN
        )


class IsAdminOrReviewer(BasePermission):
    """REVIEWER or ADMIN."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in (User.Role.REVIEWER, User.Role.ADMIN)
        )


class IsAssignedOfficer(BasePermission):
    """
    Object-level: the requesting user must be the officer assigned to
    the OfficerComplaintAssignment, or be ADMIN.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.ADMIN:
            return True
        try:
            return obj.officer.user_id == request.user.pk
        except AttributeError:
            return False
