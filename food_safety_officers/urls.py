"""
food_safety_officers URL configuration.

Customer-facing (read-only):
  GET  /api/v1/officer-assignments/<complaint_id>/
  GET  /api/v1/escalation-events/<complaint_id>/

Admin / Reviewer configuration:
  /api/v1/officer-levels/
  /api/v1/prototype-officers/
  /api/v1/restaurant-mappings/
  /api/v1/officer-assignments/admin/
  /api/v1/officer-assignments/admin/<id>/
  /api/v1/officer-assignments/admin/<id>/hold/
  /api/v1/officer-assignments/admin/<id>/resume/
  /api/v1/officer-assignments/admin/<id>/escalate/
  /api/v1/escalation-events/admin/
"""
from django.urls import path

from food_safety_officers.views import (
    AdminAssignmentDetailView,
    AdminAssignmentHoldView,
    AdminAssignmentListView,
    AdminAssignmentResumeView,
    AdminEscalationEventListView,
    AdminManualEscalateView,
    ComplaintAssignmentPublicView,
    ComplaintEscalationEventsPublicView,
    EscalationLevelDetailView,
    EscalationLevelListCreateView,
    PrototypeOfficerDetailView,
    PrototypeOfficerListCreateView,
    RestaurantMappingDetailView,
    RestaurantMappingListCreateView,
)

app_name = "food_safety_officers"

urlpatterns = [
    # ── Customer-facing ──────────────────────────────────────────────
    path(
        "officer-assignments/<int:complaint_id>/",
        ComplaintAssignmentPublicView.as_view(),
        name="assignment-public",
    ),
    path(
        "escalation-events/<int:complaint_id>/",
        ComplaintEscalationEventsPublicView.as_view(),
        name="events-public",
    ),

    # ── Escalation level config (admin) ──────────────────────────────
    path(
        "officer-levels/",
        EscalationLevelListCreateView.as_view(),
        name="level-list",
    ),
    path(
        "officer-levels/<int:pk>/",
        EscalationLevelDetailView.as_view(),
        name="level-detail",
    ),

    # ── Prototype officer accounts (admin) ───────────────────────────
    path(
        "prototype-officers/",
        PrototypeOfficerListCreateView.as_view(),
        name="officer-list",
    ),
    path(
        "prototype-officers/<int:pk>/",
        PrototypeOfficerDetailView.as_view(),
        name="officer-detail",
    ),

    # ── Restaurant → officer mapping (admin) ─────────────────────────
    path(
        "restaurant-mappings/",
        RestaurantMappingListCreateView.as_view(),
        name="mapping-list",
    ),
    path(
        "restaurant-mappings/<int:pk>/",
        RestaurantMappingDetailView.as_view(),
        name="mapping-detail",
    ),

    # ── Assignment management (admin/reviewer) ───────────────────────
    path(
        "officer-assignments/admin/",
        AdminAssignmentListView.as_view(),
        name="assignment-admin-list",
    ),
    path(
        "officer-assignments/admin/<int:pk>/",
        AdminAssignmentDetailView.as_view(),
        name="assignment-admin-detail",
    ),
    path(
        "officer-assignments/admin/<int:pk>/hold/",
        AdminAssignmentHoldView.as_view(),
        name="assignment-hold",
    ),
    path(
        "officer-assignments/admin/<int:pk>/resume/",
        AdminAssignmentResumeView.as_view(),
        name="assignment-resume",
    ),
    path(
        "officer-assignments/admin/<int:pk>/escalate/",
        AdminManualEscalateView.as_view(),
        name="assignment-escalate",
    ),

    # ── Escalation event log (admin/reviewer) ────────────────────────
    path(
        "escalation-events/admin/",
        AdminEscalationEventListView.as_view(),
        name="events-admin",
    ),
]
