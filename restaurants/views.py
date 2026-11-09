from django.db.models import Q
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from restaurants.models import Restaurant
from restaurants.permissions import (
    IsRestaurantUserRole,
    IsReviewerOrAdminRole,
    RestaurantDetailPermission,
    RestaurantListCreatePermission,
)
from restaurants.serializers import (
    RestaurantCreateSerializer,
    RestaurantReadSerializer,
    RestaurantUpdateSerializer,
)

# Fields that only REVIEWER / ADMIN may set via PATCH
_RESTRICTED_UPDATE_FIELDS = {"is_verified"}
_PRIVILEGED_ROLES = {User.Role.REVIEWER, User.Role.ADMIN}


@extend_schema_view(
    get=extend_schema(responses={200: RestaurantReadSerializer(many=True)}),
    post=extend_schema(request=RestaurantCreateSerializer, responses={201: RestaurantReadSerializer, 200: RestaurantReadSerializer, 400: dict}),
)
class RestaurantListCreateView(APIView):
    """
    GET  /api/v1/restaurants/   — list all active restaurants (authenticated) with optional ?search=
    POST /api/v1/restaurants/   — create or reuse a restaurant (authenticated)
    """

    permission_classes = [RestaurantListCreatePermission]

    def get(self, request: Request) -> Response:
        queryset = Restaurant.objects.select_related("owner", "claimed_by").filter(
            is_active=True
        )
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(city__icontains=search)
                | Q(state__icontains=search)
            )
        serializer = RestaurantReadSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        serializer = RestaurantCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        name = serializer.validated_data["name"].strip()
        city = serializer.validated_data["city"].strip()

        # Obvious duplicate prevention: case-insensitive name & city match for active restaurant
        existing = Restaurant.objects.filter(
            name__iexact=name,
            city__iexact=city,
            is_active=True,
        ).first()

        if existing is not None:
            # Reuse existing matching restaurant and return 200 OK
            return Response(
                RestaurantReadSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        restaurant = serializer.save()
        return Response(
            RestaurantReadSerializer(restaurant).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(responses={200: RestaurantReadSerializer, 404: dict}),
    patch=extend_schema(request=RestaurantUpdateSerializer, responses={200: RestaurantReadSerializer, 400: dict, 403: dict, 404: dict}),
    delete=extend_schema(responses={204: None, 404: dict}),
)
class RestaurantDetailView(APIView):
    """
    GET    /api/v1/restaurants/<id>/  — retrieve restaurant
    PATCH  /api/v1/restaurants/<id>/  — partial update
    DELETE /api/v1/restaurants/<id>/  — delete
    """

    permission_classes = [RestaurantDetailPermission]

    def _get_object(self, pk: int) -> Restaurant | None:
        try:
            return Restaurant.objects.select_related("owner").get(pk=pk)
        except Restaurant.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        restaurant = self._get_object(pk)
        if restaurant is None:
            return Response(
                {"detail": "Restaurant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, restaurant)
        serializer = RestaurantReadSerializer(restaurant)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request: Request, pk: int) -> Response:
        restaurant = self._get_object(pk)
        if restaurant is None:
            return Response(
                {"detail": "Restaurant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, restaurant)

        # Block RESTAURANT_USER from setting is_verified
        incoming_fields = set(request.data.keys())
        restricted_attempted = incoming_fields & _RESTRICTED_UPDATE_FIELDS
        if restricted_attempted and request.user.role not in _PRIVILEGED_ROLES:
            return Response(
                {
                    "detail": (
                        "You are not permitted to change: "
                        + ", ".join(sorted(restricted_attempted))
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = RestaurantUpdateSerializer(
            restaurant, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )
        updated = serializer.save()
        return Response(
            RestaurantReadSerializer(updated).data, status=status.HTTP_200_OK
        )

    def delete(self, request: Request, pk: int) -> Response:
        restaurant = self._get_object(pk)
        if restaurant is None:
            return Response(
                {"detail": "Restaurant not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, restaurant)
        restaurant.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RestaurantClaimView(APIView):
    """
    POST /api/v1/restaurants/<id>/claim/ — Request ownership of an unclaimed restaurant (RESTAURANT_USER only).
    """

    permission_classes = [IsRestaurantUserRole]

    def post(self, request: Request, pk: int) -> Response:
        try:
            restaurant = Restaurant.objects.select_related("owner", "claimed_by").get(pk=pk)
        except Restaurant.DoesNotExist:
            return Response({"detail": "Restaurant not found."}, status=status.HTTP_404_NOT_FOUND)

        if restaurant.owner_id is not None:
            return Response(
                {"detail": "This restaurant already has a registered owner."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if restaurant.claimed_by_id == request.user.pk:
            return Response(
                {"detail": "You have already requested ownership for this restaurant. Awaiting review."},
                status=status.HTTP_200_OK,
            )

        if restaurant.claimed_by_id is not None and restaurant.claimed_by_id != request.user.pk:
            return Response(
                {"detail": "Another restaurant user has already requested to claim this restaurant."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        restaurant.claimed_by = request.user
        restaurant.claim_status = Restaurant.ClaimStatus.PENDING
        restaurant.save(update_fields=["claimed_by", "claim_status", "updated_at"])

        from notifications.models import Notification
        from notifications.services import NotificationService
        NotificationService().notify_reviewers_and_admins(
            event_type=Notification.EventType.REPORT_SUBMITTED,
            message=f"Ownership claim submitted for restaurant \"{restaurant.name}\" by {request.user.email}.",
        )

        return Response(RestaurantReadSerializer(restaurant).data, status=status.HTTP_200_OK)


class RestaurantApproveClaimView(APIView):
    """
    POST /api/v1/restaurants/<id>/approve-claim/ — Approve a pending ownership claim (REVIEWER/ADMIN only).
    """

    permission_classes = [IsReviewerOrAdminRole]

    def post(self, request: Request, pk: int) -> Response:
        try:
            restaurant = Restaurant.objects.select_related("owner", "claimed_by").get(pk=pk)
        except Restaurant.DoesNotExist:
            return Response({"detail": "Restaurant not found."}, status=status.HTTP_404_NOT_FOUND)

        if restaurant.claimed_by is None:
            return Response(
                {"detail": "This restaurant does not have any pending ownership claim to approve."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_owner = restaurant.claimed_by
        restaurant.owner = new_owner
        restaurant.claimed_by = None
        restaurant.claim_status = Restaurant.ClaimStatus.CLAIMED
        restaurant.is_verified = True
        restaurant.save(update_fields=["owner", "claimed_by", "claim_status", "is_verified", "updated_at"])

        from notifications.models import Notification
        from notifications.services import NotificationService
        NotificationService().notify(
            recipient=new_owner,
            event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
            message=f"Your ownership claim for \"{restaurant.name}\" has been approved.",
        )

        return Response(RestaurantReadSerializer(restaurant).data, status=status.HTTP_200_OK)


class RestaurantRejectClaimView(APIView):
    """
    POST /api/v1/restaurants/<id>/reject-claim/ — Reject a pending ownership claim (REVIEWER/ADMIN only).
    """

    permission_classes = [IsReviewerOrAdminRole]

    def post(self, request: Request, pk: int) -> Response:
        try:
            restaurant = Restaurant.objects.select_related("owner", "claimed_by").get(pk=pk)
        except Restaurant.DoesNotExist:
            return Response({"detail": "Restaurant not found."}, status=status.HTTP_404_NOT_FOUND)

        if restaurant.claimed_by is None:
            return Response(
                {"detail": "This restaurant does not have any pending ownership claim to reject."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejected_user = restaurant.claimed_by
        reason = request.data.get("reason", "").strip() if isinstance(request.data, dict) else ""

        restaurant.claimed_by = None
        restaurant.claim_status = Restaurant.ClaimStatus.UNCLAIMED
        restaurant.save(update_fields=["claimed_by", "claim_status", "updated_at"])

        from notifications.models import Notification
        from notifications.services import NotificationService
        msg = f"Your ownership claim for \"{restaurant.name}\" has been rejected."
        if reason:
            msg += f" Reason: {reason}"
        NotificationService().notify(
            recipient=rejected_user,
            event_type=Notification.EventType.COMPLAINT_STATUS_CHANGED,
            message=msg,
        )

        return Response(RestaurantReadSerializer(restaurant).data, status=status.HTTP_200_OK)

