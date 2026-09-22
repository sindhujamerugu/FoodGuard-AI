from django.contrib import admin

from complaints.models import Complaint


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "food_report",
        "customer",
        "restaurant",
        "category",
        "status",
        "priority",
        "original_language",
        "submitted_at",
        "resolved_at",
    )
    list_filter = (
        "category",
        "status",
        "priority",
        "original_language",
        "restaurant",
    )
    search_fields = (
        "title",
        "description",
        "customer__email",
        "restaurant__name",
    )
    readonly_fields = ("submitted_at", "updated_at", "resolved_at")
    ordering = ("-submitted_at",)
