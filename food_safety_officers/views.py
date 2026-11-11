"""
food_safety_officers — API Views
==================================

PROTOTYPE DISCLAIMER: Not an officially integrated government system.

Endpoints
---------
Customer (read-only, own complaints only):
  GET  /api/v1/officer-assignments/<complaint_id>/   — active assignment for a complaint
  GET  /api/v1/escalation-events/<complaint_id>/     — public escalation history

Admin / Reviewer:
  GET/POST   /api/v1/officer-levels/
  GET/PATCH  /api/v1/officer-levels/<id>/
  GET/POST   /api/v1/prototype-officers/
  GET/PATCH  /api/v1/prototype-officers/<id>/
  GET/POST   /api/v1/restaurant-mappings/
  GET/PATCH  /api/v1/restaurant-mappings/<id>/
  GET        /api/v1/officer-assignments/admin/
  PATCH      /api/v1/officer-assignments/admin/<id>/
  POST       /api/v1/officer-assignments/admin/<id>/hold/
  POST       /api/v1/officer-assignments/admin/<id>/resume/
  POST       /api/v1/officer-assignments/admin/<id>/escalate/
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from complaints.models import Complaint
from food_safety_officers.models import (
    EscalationEvent,
    EscalationLevel,
    OfficerComplaintAssignment,
    PrototypeOfficer,
    RestaurantOfficerMapping,
)
from food_safety_officers.permissions import IsAdminOrReviewer, IsAdminUser
from food_safety_officers.serializers import (
    EscalationEventAdminSerializer,
    EscalationEventPublicSerializer,
    EscalationLevelSerializer,
    OfficerAssignmentAdminSerializer,
    OfficerAssignmentPublicSerializer,
    PrototypeOfficerAdminSerializer,
    RestaurantOfficerMappingSerializer,
)
from food_safety_officers.services import (
    OfficerAssignmentError,
    escalate_assignment,
    place_on_hold,
    resume_from_hold,
)
from users.models import User


# ── Customer-facing views ─────────────────────────────────────────────────────

class ComplaintAssignmentPublicView(APIView):
    """
    GET /api/v1/officer-assignments/<complaint_id>/
    Returns the active assignment for the complaint — customer's own only.
    Does NOT expose investigation_notes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, complaint_id: int) -> Response:
        complaint = get_object_or_404(Complaint, pk=complaint_id)
        # Customers see only their own complaints
        if (request.user.role == User.Role.CUSTOMER and
                complaint.customer_id != request.user.pk):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        assignment = (
            OfficerComplaintAssignment.objects
            .filter(complaint=complaint)
            .filter(status__in=[
                OfficerComplaintAssignment.AssignmentStatus.ASSIGNED,
                OfficerComplaintAssignment.AssignmentStatus.UNDER_INVESTIGATION,
                OfficerComplaintAssignment.AssignmentStatus.ACTION_TAKEN,
                OfficerComplaintAssignment.AssignmentStatus.ON_HOLD,
            ])
            .select_related("officer__level", "level")
            .first()
        )
        if assignment is None:
            return Response({"detail": "No active assignment."}, status=status.HTTP_404_NOT_FOUND)

        return Response(OfficerAssignmentPublicSerializer(assignment).data)


class ComplaintEscalationEventsPublicView(APIView):
    """
    GET /api/v1/escalation-events/<complaint_id>/
    Returns customer-visible escalation history (no internal reason/notes).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, complaint_id: int) -> Response:
        complaint = get_object_or_404(Complaint, pk=complaint_id)
        if (request.user.role == User.Role.CUSTOMER and
                complaint.customer_id != request.user.pk):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        events = (
            EscalationEvent.objects
            .filter(complaint=complaint)
            .select_related("from_level", "to_level", "from_officer", "to_officer")
            .order_by("created_at")
        )
        return Response(EscalationEventPublicSerializer(events, many=True).data)


# ── Admin / Reviewer configuration views ─────────────────────────────────────

class EscalationLevelListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request: Request) -> Response:
        qs = EscalationLevel.objects.all()
        return Response(EscalationLevelSerializer(qs, many=True).data)

    def post(self, request: Request) -> Response:
        ser = EscalationLevelSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class EscalationLevelDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        return get_object_or_404(EscalationLevel, pk=pk)

    def get(self, request, pk):
        return Response(EscalationLevelSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        ser = EscalationLevelSerializer(self._get(pk), data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)


class PrototypeOfficerListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = PrototypeOfficer.objects.select_related("level").all()
        return Response(PrototypeOfficerAdminSerializer(qs, many=True).data)

    def post(self, request):
        ser = PrototypeOfficerAdminSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class PrototypeOfficerDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        return get_object_or_404(PrototypeOfficer, pk=pk)

    def get(self, request, pk):
        return Response(PrototypeOfficerAdminSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        ser = PrototypeOfficerAdminSerializer(self._get(pk), data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)


class RestaurantMappingListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = RestaurantOfficerMapping.objects.select_related(
            "restaurant", "level_1_officer"
        ).all()
        return Response(RestaurantOfficerMappingSerializer(qs, many=True).data)

    def post(self, request):
        ser = RestaurantOfficerMappingSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data, status=status.HTTP_201_CREATED)


class RestaurantMappingDetailView(APIView):
    permission_classes = [IsAdminUser]

    def _get(self, pk):
        return get_object_or_404(RestaurantOfficerMapping, pk=pk)

    def get(self, request, pk):
        return Response(RestaurantOfficerMappingSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        ser = RestaurantOfficerMappingSerializer(self._get(pk), data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)


class AdminAssignmentListView(APIView):
    """GET /api/v1/officer-assignments/admin/ — all assignments (admin/reviewer)."""
    permission_classes = [IsAdminOrReviewer]

    def get(self, request):
        qs = OfficerComplaintAssignment.objects.select_related(
            "complaint", "officer__level", "level"
        ).all()
        return Response(OfficerAssignmentAdminSerializer(qs, many=True).data)


class AdminAssignmentDetailView(APIView):
    """PATCH /api/v1/officer-assignments/admin/<id>/ — update status/notes/action."""
    permission_classes = [IsAdminOrReviewer]

    def _get(self, pk):
        return get_object_or_404(OfficerComplaintAssignment, pk=pk)

    def get(self, request, pk):
        return Response(OfficerAssignmentAdminSerializer(self._get(pk)).data)

    def patch(self, request, pk):
        assignment = self._get(pk)
        # Officers may only update their own assignments unless ADMIN
        if (request.user.role not in (User.Role.ADMIN, User.Role.REVIEWER)):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        allowed_fields = {"status", "investigation_notes", "action_taken"}
        attempted_forbidden = set(request.data.keys()) - allowed_fields
        if attempted_forbidden:
            return Response(
                {"detail": f"Fields not updatable: {', '.join(attempted_forbidden)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = OfficerAssignmentAdminSerializer(assignment, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)


class AdminAssignmentHoldView(APIView):
    """POST /api/v1/officer-assignments/admin/<id>/hold/"""
    permission_classes = [IsAdminOrReviewer]

    def post(self, request, pk):
        assignment = get_object_or_404(OfficerComplaintAssignment, pk=pk)
        reason = request.data.get("reason", "Administrative hold.")
        try:
            assignment = place_on_hold(assignment, reason=reason, performed_by=request.user)
        except OfficerAssignmentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OfficerAssignmentAdminSerializer(assignment).data)


class AdminAssignmentResumeView(APIView):
    """POST /api/v1/officer-assignments/admin/<id>/resume/"""
    permission_classes = [IsAdminOrReviewer]

    def post(self, request, pk):
        assignment = get_object_or_404(OfficerComplaintAssignment, pk=pk)
        try:
            assignment = resume_from_hold(assignment, performed_by=request.user)
        except OfficerAssignmentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OfficerAssignmentAdminSerializer(assignment).data)


class AdminManualEscalateView(APIView):
    """POST /api/v1/officer-assignments/admin/<id>/escalate/ — manual escalation."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        assignment = get_object_or_404(OfficerComplaintAssignment, pk=pk)
        reason = request.data.get("reason", "Manual administrative escalation.")
        try:
            new_assignment = escalate_assignment(
                assignment,
                reason=reason,
                trigger=EscalationEvent.TriggerType.ADMINISTRATIVE,
                performed_by=request.user,
            )
        except OfficerAssignmentError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        if new_assignment is None:
            return Response(
                {"detail": "Complaint has reached the final configured level. Marked for final authority review."},
                status=status.HTTP_200_OK,
            )
        return Response(OfficerAssignmentAdminSerializer(new_assignment).data, status=status.HTTP_201_CREATED)


class AdminEscalationEventListView(APIView):
    """GET /api/v1/escalation-events/admin/ — full history with internal details."""
    permission_classes = [IsAdminOrReviewer]

    def get(self, request):
        complaint_id = request.query_params.get("complaint_id")
        qs = EscalationEvent.objects.select_related(
            "from_level", "to_level", "from_officer", "to_officer", "performed_by"
        ).order_by("-created_at")
        if complaint_id:
            qs = qs.filter(complaint_id=complaint_id)
        return Response(EscalationEventAdminSerializer(qs, many=True).data)
