from rest_framework.permissions import BasePermission, SAFE_METHODS

from users.models import User

_PRIVILEGED_ROLES = {User.Role.REVIEWER, User.Role.ADMIN}


class FeedbackListCreatePermission(BasePermission):
    """
    GET  /api/v1/feedback/ — any authenticated user (view filters by role).
    POST /api/v1/feedback/ — CUSTOMER only.
    """

    message = "Only customers may create feedback."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == User.Role.CUSTOMER


class FeedbackDetailPermission(BasePermission):
    """
    Object-level permission for feedback detail (GET only).

    - CUSTOMER: own feedback only.
    - REVIEWER / ADMIN: full read access.
    - RESTAURANT_USER: explicitly denied.
    - Unauthenticated: 401.
    """

    message = "You do not have permission to access this feedback."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        role = request.user.role

        if role in _PRIVILEGED_ROLES:
            return True

        if role == User.Role.CUSTOMER:
            return obj.customer_id == request.user.pk

        # RESTAURANT_USER and any other role: explicitly denied
        return False
