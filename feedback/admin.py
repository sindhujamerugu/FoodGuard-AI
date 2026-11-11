from django.contrib import admin

from feedback.models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = (
        "id", "complaint", "customer", "rating",
        "moderation_status", "original_language", "created_at",
    )
    list_filter  = ("moderation_status", "rating", "original_language", "created_at")
    search_fields = ("customer__email", "comments", "complaint__title")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    fieldsets = (
        ("Feedback", {
            "fields": ("complaint", "customer", "rating", "comments", "original_language"),
        }),
        ("Moderation", {
            "description": (
                "Only APPROVED feedback contributes to public restaurant ratings. "
                "moderation_note is never exposed to customers."
            ),
            "fields": ("moderation_status", "moderation_note"),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
    actions = ["approve_selected", "reject_selected"]

    @admin.action(description="Approve selected feedback")
    def approve_selected(self, request, queryset):
        updated = queryset.update(moderation_status=Feedback.ModerationStatus.APPROVED)
        self.message_user(request, f"{updated} feedback record(s) approved.")

    @admin.action(description="Reject selected feedback")
    def reject_selected(self, request, queryset):
        updated = queryset.update(moderation_status=Feedback.ModerationStatus.REJECTED)
        self.message_user(request, f"{updated} feedback record(s) rejected.")
