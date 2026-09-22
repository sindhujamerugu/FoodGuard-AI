from rest_framework.permissions import BasePermission, SAFE_METHODS

from users.models import User


class IsRestaurantUserRole(BasePermission):
    """Grants access only to authenticated RESTAURANT_USER role."""

    message = "Only restaurant users may perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.RESTAURANT_USER
        )


class IsReviewerRole(BasePermission):
    """Grants access only to authenticated REVIEWER role."""

    message = "Only reviewers may perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.REVIEWER
        )


class IsAdminRole(BasePermission):
    """Grants access only to authenticated ADMIN role."""

    message = "Only admins may perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsReviewerOrAdminRole(BasePermission):
    """Grants access to REVIEWER or ADMIN roles."""

    message = "Only reviewers or admins may perform this action."

    def has_permission(self, request, view) -> bool:
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (User.Role.REVIEWER, User.Role.ADMIN)
        )


class IsOwnerOrAdminRole(BasePermission):
    """
    Object-level permission.

    - ADMIN: always allowed.
    - RESTAURANT_USER: only if they own the object.
    - Everyone else: denied.
    """

    message = "You do not have permission to modify this restaurant."

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == User.Role.ADMIN:
            return True
        if request.user.role == User.Role.RESTAURANT_USER:
            return obj.owner_id == request.user.pk
        return False


class RestaurantListCreatePermission(BasePermission):
    """
    Controls list + create access:

    GET  (list)   — any authenticated user
    POST (create) — RESTAURANT_USER or ADMIN only
    """

    message = "Only restaurant users or admins may create restaurants."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (
            User.Role.RESTAURANT_USER,
            User.Role.ADMIN,
        )


class RestaurantDetailPermission(BasePermission):
    """
    Controls retrieve + update + delete access:

    GET    (retrieve) — any authenticated user
    PATCH  (update)   — owner (RESTAURANT_USER) or ADMIN or REVIEWER
    DELETE (destroy)  — owner (RESTAURANT_USER) or ADMIN
    """

    message = "You do not have permission to perform this action on this restaurant."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in SAFE_METHODS:
            return True

        if request.user.role == User.Role.ADMIN:
            return True

        if request.method == "PATCH":
            # REVIEWER may update (e.g. set is_verified); owner may update own
            if request.user.role == User.Role.REVIEWER:
                return True
            if request.user.role == User.Role.RESTAURANT_USER:
                return obj.owner_id == request.user.pk

        if request.method == "DELETE":
            if request.user.role == User.Role.RESTAURANT_USER:
                return obj.owner_id == request.user.pk

        return False
