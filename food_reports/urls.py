from django.urls import path

from food_reports.views import (
    ReportDetailView,
    ReportListCreateView,
    ReportSubmitView,
)

app_name = "food_reports"

urlpatterns = [
    path("", ReportListCreateView.as_view(), name="list-create"),
    path("<int:pk>/", ReportDetailView.as_view(), name="detail"),
    path("<int:pk>/submit/", ReportSubmitView.as_view(), name="submit"),
]
