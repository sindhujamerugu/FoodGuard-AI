from django.contrib import admin

from food_reports.models import FoodReport


@admin.register(FoodReport)
class FoodReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "customer",
        "restaurant",
        "status",
        "priority",
        "created_at",
    )
    list_filter = ("status", "priority", "restaurant", "created_at")
    search_fields = ("title", "description", "customer__email", "restaurant__name")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
