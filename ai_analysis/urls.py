from django.urls import path

from ai_analysis.views import AnalyzeReportView, ReportAnalysisView

app_name = "ai_analysis"

urlpatterns = [
    path(
        "<int:report_id>/analyze/",
        AnalyzeReportView.as_view(),
        name="analyze",
    ),
    path(
        "<int:report_id>/analysis/",
        ReportAnalysisView.as_view(),
        name="result",
    ),
]
