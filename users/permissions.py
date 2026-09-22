from rest_framework.permissions import BasePermission

from users.models import User


class IsCustomer(BasePermission):
    """Grants access only to authenticated users with role CUSTOMER."""

    message = "Only customers can perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.CUSTOMER
        )


class IsReviewer(BasePermission):
    """Grants access only to authenticated users with role REVIEWER."""

    message = "Only reviewers can perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.REVIEWER
        )


class IsAdmin(BasePermission):
    """Grants access only to authenticated users with role ADMIN."""

    message = "Only admins can perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsReviewerOrAdmin(BasePermission):
    """Grants access to authenticated users with role REVIEWER or ADMIN."""

    message = "Only reviewers or admins can perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.REVIEWER, User.Role.ADMIN)
        )


class IsRestaurantUser(BasePermission):
    """Grants access only to authenticated users with role RESTAURANT_USER."""

    message = "Only restaurant users can perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.RESTAURANT_USER
        )
