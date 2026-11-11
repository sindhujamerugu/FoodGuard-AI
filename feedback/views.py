from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from feedback.models import Feedback
from feedback.permissions import FeedbackDetailPermission, FeedbackListCreatePermission, FeedbackModeratePermission
from feedback.serializers import FeedbackCreateSerializer, FeedbackModerationSerializer, FeedbackReadSerializer
from feedback.services import FeedbackError

_PRIVILEGED_ROLES = {User.Role.REVIEWER, User.Role.ADMIN}


@extend_schema_view(
    get=extend_schema(responses={200: FeedbackReadSerializer(many=True)}),
    post=extend_schema(request=FeedbackCreateSerializer, responses={201: FeedbackReadSerializer, 400: dict}),
)
class FeedbackListCreateView(APIView):
    """
    GET  /api/v1/feedback/  — list feedback (role-filtered)
    POST /api/v1/feedback/  — create feedback (CUSTOMER only)
    """

    permission_classes = [FeedbackListCreatePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request: Request) -> Response:
        role = request.user.role
        if role in _PRIVILEGED_ROLES:
            qs = Feedback.objects.select_related("complaint", "customer").all()
        else:
            # CUSTOMER sees only their own; RESTAURANT_USER sees nothing here
            qs = Feedback.objects.select_related(
                "complaint", "customer"
            ).filter(customer=request.user)

        serializer = FeedbackReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        serializer = FeedbackCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            feedback = serializer.save()
        except FeedbackError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            FeedbackReadSerializer(feedback).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(responses={200: FeedbackReadSerializer, 404: dict}),
)
class FeedbackDetailView(APIView):
    """
    GET /api/v1/feedback/<id>/

    Create-and-read-only design — no PATCH or DELETE endpoints.
    """

    permission_classes = [FeedbackDetailPermission]

    def _get_object(self, pk: int):
        try:
            return Feedback.objects.select_related(
                "complaint", "customer"
            ).get(pk=pk)
        except Feedback.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        feedback = self._get_object(pk)
        if feedback is None:
            return Response(
                {"detail": "Feedback not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, feedback)
        return Response(
            FeedbackReadSerializer(feedback).data,
            status=status.HTTP_200_OK,
        )


class FeedbackModerateView(APIView):
    """
    PATCH /api/v1/feedback/<id>/moderate/
    Admin / Reviewer only — approve or reject feedback.
    Fires notification to the customer when status changes to APPROVED or REJECTED.
    """

    permission_classes = [FeedbackModeratePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _get_object(self, pk: int):
        try:
            return Feedback.objects.select_related("complaint", "customer").get(pk=pk)
        except Feedback.DoesNotExist:
            return None

    def patch(self, request: Request, pk: int) -> Response:
        feedback = self._get_object(pk)
        if feedback is None:
            return Response({"detail": "Feedback not found."}, status=status.HTTP_404_NOT_FOUND)

        previous_status = feedback.moderation_status
        ser = FeedbackModerationSerializer(feedback, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()

        # Fire customer notification when status changes to APPROVED or REJECTED
        new_status = feedback.moderation_status
        if new_status != previous_status and new_status in (
            Feedback.ModerationStatus.APPROVED,
            Feedback.ModerationStatus.REJECTED,
        ):
            try:
                from notifications.services import NotificationService
                event = (
                    "FEEDBACK_APPROVED" if new_status == Feedback.ModerationStatus.APPROVED
                    else "FEEDBACK_REJECTED"
                )
                msg = (
                    f"Your feedback for complaint \"{feedback.complaint.title}\" "
                    f"has been {'approved and published' if new_status == Feedback.ModerationStatus.APPROVED else 'reviewed'}."
                )
                NotificationService().notify(
                    recipient=feedback.customer,
                    event_type=event,
                    message=msg,
                    related_complaint=feedback.complaint,
                )
            except Exception:
                import logging
                logging.getLogger("foodguard").exception(
                    "Notification failed for feedback_id=%s moderation", feedback.pk
                )

        return Response(FeedbackReadSerializer(feedback).data)


class RestaurantRatingView(APIView):
    """
    GET /api/v1/restaurants/<restaurant_id>/rating/
    Public (authenticated) — returns aggregated APPROVED feedback only.
    Restaurants with no APPROVED feedback return has_ratings=False.
    """
    from rest_framework.permissions import IsAuthenticated
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, restaurant_id: int) -> Response:
        from restaurants.models import Restaurant
        from django.shortcuts import get_object_or_404
        from django.db.models import Avg, Count

        restaurant = get_object_or_404(Restaurant, pk=restaurant_id)

        approved_qs = Feedback.objects.filter(
            complaint__restaurant=restaurant,
            moderation_status=Feedback.ModerationStatus.APPROVED,
        )

        agg   = approved_qs.aggregate(avg=Avg("rating"), total=Count("id"))
        total = agg["total"] or 0
        avg   = round(agg["avg"], 2) if agg["avg"] else None

        # Rating distribution: {1: n, 2: n, ..., 5: n}
        dist  = {str(i): 0 for i in range(1, 6)}
        for row in approved_qs.values("rating").annotate(n=Count("id")):
            dist[str(row["rating"])] = row["n"]

        from feedback.serializers import RestaurantRatingSerializer
        data = RestaurantRatingSerializer({
            "restaurant_id":   restaurant.pk,
            "restaurant_name": restaurant.name,
            "average_rating":  avg,
            "total_ratings":   total,
            "distribution":    dist,
            "has_ratings":     total > 0,
        })
        return Response(data.data)
