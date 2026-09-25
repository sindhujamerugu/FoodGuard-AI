from rest_framework.permissions import BasePermission

from users.models import User

_PRIVILEGED_ROLES = {User.Role.REVIEWER, User.Role.ADMIN}


class IsReviewerOrAdmin(BasePermission):
    """
    View-level and object-level permission for escalation endpoints.

    REVIEWER / ADMIN: full create, read, update access.
    CUSTOMER:         403 at view level.
    RESTAURANT_USER:  403 at view level.
    Unauthenticated:  401.
    """

    message = "Only reviewers or admins may access escalation records."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in _PRIVILEGED_ROLES
        )

    def has_object_permission(self, request, view, obj) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in _PRIVILEGED_ROLES
        )
