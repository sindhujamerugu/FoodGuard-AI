from django.urls import path

from complaints.views import (
    ComplaintDetailView,
    ComplaintInvestigationCompleteView,
    ComplaintInvestigationHistoryView,
    ComplaintInvestigationStartView,
    ComplaintInvestigationView,
    ComplaintListCreateView,
    ReviewerActivityListView,
)

app_name = "complaints"

urlpatterns = [
    path("", ComplaintListCreateView.as_view(), name="list-create"),
    path("activity/", ReviewerActivityListView.as_view(), name="reviewer-activity"),
    path("<int:pk>/investigation/start/", ComplaintInvestigationStartView.as_view(), name="investigation-start"),
    path("<int:pk>/investigation/complete/", ComplaintInvestigationCompleteView.as_view(), name="investigation-complete"),
    path("<int:pk>/investigation/history/", ComplaintInvestigationHistoryView.as_view(), name="investigation-history"),
    path("<int:pk>/investigation/", ComplaintInvestigationView.as_view(), name="investigation"),
    path("<int:pk>/", ComplaintDetailView.as_view(), name="detail"),
]
