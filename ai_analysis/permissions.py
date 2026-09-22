from rest_framework.permissions import BasePermission, SAFE_METHODS

from users.models import User


class CanAccessAnalysis(BasePermission):
    """
    Controls access to AI analysis endpoints.

    View-level (has_permission):
    - Any authenticated user may reach the view.

    Object-level (has_object_permission):
    - CUSTOMER: only the report's own customer.
    - REVIEWER / ADMIN: always permitted (read-only boundary enforced
      at the view level for write operations).
    - RESTAURANT_USER: explicitly denied — owning the restaurant does not
      grant access to customer AI analysis results.
    """

    message = "You do not have permission to access this analysis."

    def has_permission(self, request, view) -> bool:
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj) -> bool:
        """
        `obj` here is the FoodReport (permission checked before fetching
        or creating the AIAnalysis so the 403/404 boundary is consistent
        with FoodReport access control).
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # REVIEWER and ADMIN may access any report's analysis
        if request.user.role in (User.Role.REVIEWER, User.Role.ADMIN):
            return True

        # CUSTOMER may only access their own report's analysis
        if request.user.role == User.Role.CUSTOMER:
            return obj.customer_id == request.user.pk

        # RESTAURANT_USER and any other role: explicitly denied
        return False
