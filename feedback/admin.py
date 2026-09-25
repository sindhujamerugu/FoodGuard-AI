from django.contrib import admin

from feedback.models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "complaint",
        "customer",
        "rating",
        "original_language",
        "created_at",
    )
    list_filter = ("rating", "original_language", "created_at")
    search_fields = ("customer__email", "comments")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
