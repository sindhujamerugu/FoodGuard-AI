from rest_framework.permissions import BasePermission, SAFE_METHODS

from users.models import User


class IsCustomerRole(BasePermission):
    """Authenticated user with role CUSTOMER."""

    message = "Only customers may perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CUSTOMER
        )


class IsReviewerOrAdminRole(BasePermission):
    """Authenticated user with role REVIEWER or ADMIN."""

    message = "Only reviewers or admins may perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.REVIEWER, User.Role.ADMIN)
        )


class IsCustomerOwner(BasePermission):
    """
    Object-level permission.

    - REVIEWER / ADMIN: read-only access always granted.
    - CUSTOMER who owns the report: full access.
    - Anyone else (including other customers): denied.
    """

    message = "You do not have permission to access this report."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        # REVIEWER / ADMIN get read access
        if request.user.role in (User.Role.REVIEWER, User.Role.ADMIN):
            return request.method in SAFE_METHODS

        # Owner (CUSTOMER) gets full access
        return obj.customer_id == request.user.pk


class ReportListPermission(BasePermission):
    """
    GET  /api/v1/reports/ — authenticated users only.
    POST /api/v1/reports/ — CUSTOMER only.
    """

    message = "Only customers may create food reports."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        # POST — CUSTOMER only
        return request.user.role == User.Role.CUSTOMER
