from django.contrib import admin

from ai_analysis.models import AIAnalysis


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "food_report",
        "status",
        "risk",
        "confidence",
        "model_name",
        "model_version",
        "analyzed_at",
        "created_at",
    )
    list_filter = ("status", "risk", "model_name")
    search_fields = ("food_report__title", "food_report__customer__email")
    readonly_fields = ("created_at", "updated_at", "analyzed_at")
    ordering = ("-created_at",)
