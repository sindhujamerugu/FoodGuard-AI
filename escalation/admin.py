from django.contrib import admin

from escalation.models import Escalation


@admin.register(Escalation)
class EscalationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "complaint",
        "created_by",
        "assigned_to",
        "escalation_level",
        "status",
        "original_language",
        "created_at",
        "resolved_at",
    )
    list_filter = (
        "escalation_level",
        "status",
        "original_language",
        "created_at",
    )
    search_fields = (
        "reason",
        "created_by__email",
        "assigned_to__email",
    )
    readonly_fields = ("created_at", "updated_at", "resolved_at")
    ordering = ("-created_at",)
