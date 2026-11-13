from drf_spectacular.utils import extend_schema, extend_schema_view, inline_serializer
from rest_framework import serializers, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from notifications.permissions import IsNotificationOwner
from notifications.serializers import NotificationSerializer

_COMPLAINT_EVENTS = {
    Notification.EventType.COMPLAINT_SUBMITTED,
    Notification.EventType.COMPLAINT_STATUS_CHANGED,
    Notification.EventType.OFFICER_ASSIGNED,
    Notification.EventType.OFFICER_ESCALATED,
}

_ESCALATION_EVENTS = {
    Notification.EventType.ESCALATION_CREATED,
    Notification.EventType.ESCALATION_UPDATED,
    Notification.EventType.OFFICER_ESCALATED,
}

_REPORT_EVENTS = {
    Notification.EventType.REPORT_SUBMITTED,
    Notification.EventType.REPORT_STATUS_CHANGED,
    Notification.EventType.AI_ANALYSIS_COMPLETED,
}

_ALLOWED_ORDERINGS = {"-created_at", "created_at", "-id", "id", "-is_read", "is_read"}


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


@extend_schema_view(
    get=extend_schema(responses={200: NotificationSerializer(many=True)}),
)
class NotificationListView(APIView):
    """
    GET /api/v1/notifications/ — the requesting user's own notifications.

    Supports:
    - is_read filter: ?is_read=true / ?is_read=false
    - category filter: ?category=complaints / ?category=escalations / ?category=reports / ?category=other
    - event_type filter: ?event_type=COMPLAINT_SUBMITTED
    - ordering: ?ordering=-created_at
    - optional pagination: ?page=1&page_size=20 (unpaginated list by default for backward compatibility)
    """

    permission_classes = [IsNotificationOwner]

    def get(self, request: Request) -> Response:
        qs = Notification.objects.filter(recipient=request.user).select_related(
            "related_report", "related_complaint"
        )

        # Filtering by read/unread status
        is_read_param = request.query_params.get("is_read")
        if is_read_param is not None:
            val = is_read_param.strip().lower()
            if val in ("true", "1"):
                qs = qs.filter(is_read=True)
            elif val in ("false", "0"):
                qs = qs.filter(is_read=False)

        # Filtering by category
        category = request.query_params.get("category")
        if category:
            cat = category.strip().lower()
            if cat == "complaints":
                qs = qs.filter(event_type__in=_COMPLAINT_EVENTS)
            elif cat == "escalations":
                qs = qs.filter(event_type__in=_ESCALATION_EVENTS)
            elif cat == "reports":
                qs = qs.filter(event_type__in=_REPORT_EVENTS)
            elif cat == "other":
                all_covered = _COMPLAINT_EVENTS | _ESCALATION_EVENTS | _REPORT_EVENTS
                qs = qs.exclude(event_type__in=all_covered)

        # Filtering by specific event_type
        event_type = request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type.strip())

        # Ordering
        ordering = request.query_params.get("ordering", "-created_at").strip()
        if ordering in _ALLOWED_ORDERINGS:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by("-created_at")

        # Optional pagination: activate only if page or page_size is specified
        if "page" in request.query_params or "page_size" in request.query_params:
            paginator = NotificationPagination()
            page_data = paginator.paginate_queryset(qs, request)
            if page_data is not None:
                serializer = NotificationSerializer(page_data, many=True, context={"request": request})
                return paginator.get_paginated_response(serializer.data)

        # Default: unpaginated list
        return Response(
            NotificationSerializer(qs, many=True, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(
        responses={200: inline_serializer(name="UnreadCountResponse", fields={"unread_count": serializers.IntegerField()})},
    ),
)
class NotificationUnreadCountView(APIView):
    """GET /api/v1/notifications/unread-count/ — get count of unread notifications for requesting user."""

    permission_classes = [IsNotificationOwner]

    def get(self, request: Request) -> Response:
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


@extend_schema_view(
    post=extend_schema(
        responses={200: inline_serializer(name="MarkAllReadResponse", fields={"detail": serializers.CharField(), "updated_count": serializers.IntegerField()})},
    ),
)
class NotificationMarkAllReadView(APIView):
    """POST /api/v1/notifications/mark-all-read/ — mark all unread notifications of requesting user as read."""

    permission_classes = [IsNotificationOwner]

    def post(self, request: Request) -> Response:
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response(
            {"detail": "All notifications marked as read.", "updated_count": updated},
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    patch=extend_schema(
        request=inline_serializer(name="NotificationPatch", fields={"is_read": serializers.BooleanField()}),
        responses={200: NotificationSerializer, 400: dict, 403: dict, 404: dict},
    ),
)
class NotificationDetailView(APIView):
    """PATCH /api/v1/notifications/<id>/ — mark as read/unread. Owner only."""

    permission_classes = [IsNotificationOwner]

    def _get_object(self, pk: int):
        try:
            return Notification.objects.get(pk=pk)
        except Notification.DoesNotExist:
            return None

    def patch(self, request: Request, pk: int) -> Response:
        notification = self._get_object(pk)
        if notification is None:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, notification)

        if set(request.data.keys()) - {"is_read"}:
            return Response(
                {"detail": "Only 'is_read' may be updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_read = request.data.get("is_read")
        if not isinstance(is_read, bool):
            return Response(
                {"detail": "'is_read' must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notification.is_read = is_read
        notification.save(update_fields=["is_read"])
        return Response(
            NotificationSerializer(notification, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
