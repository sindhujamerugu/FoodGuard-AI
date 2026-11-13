from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Q
from users.models import User
from complaints.models import Complaint, ComplaintInvestigation, ReviewerActivity
from complaints.permissions import CanReviewComplaint, ComplaintListCreatePermission, IsComplaintOwner
from complaints.serializers import (
    ComplaintCreateSerializer,
    ComplaintInvestigationSerializer,
    ComplaintInvestigationUpdateSerializer,
    ComplaintReadSerializer,
    ComplaintUpdateSerializer,
    ReviewerActivityReadSerializer,
)
from complaints.services import ComplaintError, ComplaintInvestigationService

_REVIEWER_ADMIN = {User.Role.REVIEWER, User.Role.ADMIN}

# Fields that only REVIEWER / ADMIN may set
_PROTECTED_FIELDS = {
    "customer", "restaurant", "food_report", "original_language",
    "status", "priority", "resolution_notes",
    "submitted_at", "updated_at", "resolved_at",
}


@extend_schema_view(
    get=extend_schema(responses={200: ComplaintReadSerializer(many=True)}),
    post=extend_schema(request=ComplaintCreateSerializer, responses={201: ComplaintReadSerializer, 400: dict}),
)
class ComplaintListCreateView(APIView):
    """
    GET  /api/v1/complaints/  — list complaints (filtered by role)
    POST /api/v1/complaints/  — create complaint (CUSTOMER only)
    """

    permission_classes = [ComplaintListCreatePermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request: Request) -> Response:
        role = request.user.role
        if role in _REVIEWER_ADMIN:
            qs = Complaint.objects.select_related(
                "customer", "restaurant", "food_report"
            ).all()
        else:
            # CUSTOMER sees only their own; RESTAURANT_USER sees nothing here
            qs = Complaint.objects.select_related(
                "customer", "restaurant", "food_report"
            ).filter(customer=request.user)

        serializer = ComplaintReadSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        serializer = ComplaintCreateSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            complaint = serializer.save()
        except ComplaintError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            ComplaintReadSerializer(complaint).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        responses={200: ReviewerActivityReadSerializer(many=True)},
        description="REVIEWER/ADMIN only — latest reviewer activity and audit entries.",
    )
)
class ReviewerActivityListView(APIView):
    """List immutable reviewer activity records (reviewer/admin only)."""

    permission_classes = [CanReviewComplaint]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request: Request) -> Response:
        qs = ReviewerActivity.objects.select_related("actor", "complaint", "escalation").all()

        action_type = request.query_params.get("action_type")
        if action_type:
            qs = qs.filter(action_type=action_type)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(summary__icontains=search)
                | Q(metadata__icontains=search)
                | Q(complaint__title__icontains=search)
            )

        ordering = request.query_params.get("ordering", "-created_at")
        if ordering not in {"-created_at", "created_at"}:
            ordering = "-created_at"
        qs = qs.order_by(ordering)

        page = max(int(request.query_params.get("page", "1") or "1"), 1)
        page_size = max(min(int(request.query_params.get("page_size", "20") or "20"), 100), 1)

        total = qs.count()
        page_start = (page - 1) * page_size
        page_qs = qs[page_start:page_start + page_size]

        serializer = ReviewerActivityReadSerializer(page_qs, many=True)
        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema_view(
    get=extend_schema(responses={200: ComplaintReadSerializer, 404: dict}),
    patch=extend_schema(
        request=ComplaintUpdateSerializer,
        responses={200: ComplaintReadSerializer, 400: dict, 403: dict, 404: dict},
        description="REVIEWER/ADMIN only — status, priority, resolution_notes, rejection_reason.",
    ),
)
class ComplaintInvestigationView(APIView):
    """Get or update the complaint investigation workspace."""

    permission_classes = [CanReviewComplaint]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _get_complaint(self, pk: int):
        try:
            return Complaint.objects.select_related("customer", "restaurant", "food_report").get(pk=pk)
        except Complaint.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        complaint = self._get_complaint(pk)
        if complaint is None:
            return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in {User.Role.REVIEWER, User.Role.ADMIN}:
            return Response({"detail": "Only reviewers or admins may access investigation data."}, status=status.HTTP_403_FORBIDDEN)

        investigation = getattr(complaint, "investigation", None)
        if investigation is None:
            return Response({"status": "NOT_STARTED", "detail": "No investigation has been started yet."}, status=status.HTTP_200_OK)

        return Response(ComplaintInvestigationSerializer(investigation).data, status=status.HTTP_200_OK)

    def patch(self, request: Request, pk: int) -> Response:
        complaint = self._get_complaint(pk)
        if complaint is None:
            return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        investigation = getattr(complaint, "investigation", None)
        if investigation is None:
            return Response({"detail": "Investigation has not been started yet."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ComplaintInvestigationUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated = ComplaintInvestigationService().update_investigation(
                investigation,
                serializer.validated_data,
                request.user,
            )
        except ComplaintError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintInvestigationSerializer(updated).data, status=status.HTTP_200_OK)


class ComplaintInvestigationStartView(APIView):
    permission_classes = [CanReviewComplaint]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request: Request, pk: int) -> Response:
        try:
            complaint = Complaint.objects.select_related("customer", "restaurant", "food_report").get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role not in {User.Role.REVIEWER, User.Role.ADMIN}:
            return Response({"detail": "Only reviewers or admins may start investigations."}, status=status.HTTP_403_FORBIDDEN)

        try:
            investigation = ComplaintInvestigationService().start_investigation(complaint, request.user)
        except ComplaintError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintInvestigationSerializer(investigation).data, status=status.HTTP_201_CREATED)


class ComplaintInvestigationCompleteView(APIView):
    permission_classes = [CanReviewComplaint]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request: Request, pk: int) -> Response:
        try:
            complaint = Complaint.objects.select_related("customer", "restaurant", "food_report").get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        investigation = getattr(complaint, "investigation", None)
        if investigation is None:
            return Response({"detail": "Investigation has not been started yet."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ComplaintInvestigationUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            completed = ComplaintInvestigationService().complete_investigation(
                investigation,
                serializer.validated_data,
                request.user,
            )
        except ComplaintError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(ComplaintInvestigationSerializer(completed).data, status=status.HTTP_200_OK)


class ComplaintInvestigationHistoryView(APIView):
    permission_classes = [CanReviewComplaint]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request: Request, pk: int) -> Response:
        try:
            complaint = Complaint.objects.select_related("customer", "restaurant", "food_report").get(pk=pk)
        except Complaint.DoesNotExist:
            return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

        qs = ReviewerActivity.objects.select_related("actor", "complaint").filter(
            complaint_id=pk,
            action_type__in={
                ReviewerActivity.ActionType.INVESTIGATION_STARTED,
                ReviewerActivity.ActionType.INVESTIGATION_UPDATED,
                ReviewerActivity.ActionType.INVESTIGATION_COMPLETED,
                ReviewerActivity.ActionType.INVESTIGATION_AWAITING_INFORMATION,
            },
        ).order_by("-created_at")

        serializer = ReviewerActivityReadSerializer(qs, many=True)
        return Response({"results": serializer.data}, status=status.HTTP_200_OK)


class ComplaintDetailView(APIView):
    """
    GET   /api/v1/complaints/<id>/
    PATCH /api/v1/complaints/<id>/
    """

    permission_classes = [IsComplaintOwner]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _get_object(self, pk: int):
        try:
            return Complaint.objects.select_related(
                "customer", "restaurant", "food_report"
            ).get(pk=pk)
        except Complaint.DoesNotExist:
            return None

    def get(self, request: Request, pk: int) -> Response:
        complaint = self._get_object(pk)
        if complaint is None:
            return Response(
                {"detail": "Complaint not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, complaint)
        return Response(
            ComplaintReadSerializer(complaint).data, status=status.HTTP_200_OK
        )

    def patch(self, request: Request, pk: int) -> Response:
        complaint = self._get_object(pk)
        if complaint is None:
            return Response(
                {"detail": "Complaint not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        self.check_object_permissions(request, complaint)

        # Customers have read-only access after creation
        if request.user.role == User.Role.CUSTOMER:
            return Response(
                {
                    "detail": (
                        "Customers cannot update complaint fields after creation. "
                        "Workflow updates are performed by Reviewers and Admins."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Reviewer / Admin — validate they are not attempting to change
        # protected-read fields (food_report, customer, restaurant, etc.)
        immutable_attempted = set(request.data.keys()) - {
            "status", "priority", "resolution_notes", "rejection_reason"
        }
        if immutable_attempted:
            return Response(
                {
                    "detail": (
                        "The following fields cannot be changed after creation: "
                        + ", ".join(sorted(immutable_attempted))
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ComplaintUpdateSerializer(
            complaint, data=request.data, partial=True, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(
                serializer.errors, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            updated = serializer.save()
        except ComplaintError as exc:
            return Response(
                {"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            ComplaintReadSerializer(updated).data, status=status.HTTP_200_OK
        )
