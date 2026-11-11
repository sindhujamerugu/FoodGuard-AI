"""
food_safety_officers — Django Admin Interface
==============================================

PROTOTYPE DISCLAIMER: Not an officially integrated government system.
All accounts and designations are sample prototype data.

Admin sections
--------------
1. EscalationLevel       — configure hierarchy, deadlines, enable/disable
2. PrototypeOfficer      — designation-based accounts
3. RestaurantOfficerMapping — map restaurants to Level-1 officer
4. OfficerComplaintAssignment — view/manage active assignments + hold/resume
5. EscalationEvent       — read-only audit trail
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from food_safety_officers.models import (
    EscalationEvent,
    EscalationLevel,
    OfficerComplaintAssignment,
    PrototypeOfficer,
    RestaurantOfficerMapping,
)
from food_safety_officers.services import (
    OfficerAssignmentError,
    place_on_hold,
    resume_from_hold,
    escalate_assignment,
)


# ── 1. EscalationLevel ───────────────────────────────────────────────────────

@admin.register(EscalationLevel)
class EscalationLevelAdmin(admin.ModelAdmin):
    list_display   = ("order", "code", "name", "response_deadline_days", "is_enabled")
    list_display_links = ("code", "name")
    list_editable  = ("order", "is_enabled", "response_deadline_days")
    list_filter    = ("is_enabled",)
    search_fields  = ("name", "code")
    ordering       = ("order",)
    fieldsets = (
        ("Identity", {"fields": ("name", "code", "order")}),
        ("Configuration", {
            "fields": ("is_enabled", "response_deadline_days", "description"),
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ("code",)
        return ()


# ── 2. PrototypeOfficer ──────────────────────────────────────────────────────

@admin.register(PrototypeOfficer)
class PrototypeOfficerAdmin(admin.ModelAdmin):
    list_display   = ("id", "designation", "level", "jurisdiction", "is_active", "user")
    list_filter    = ("level", "is_active")
    search_fields  = ("designation", "jurisdiction", "user__email")
    list_select_related = ("level", "user")
    autocomplete_fields = ("user",)
    fieldsets = (
        ("Account", {"fields": ("user", "level", "is_active")}),
        ("Designation (Prototype)", {
            "description": (
                "These are prototype designations — not real government officials. "
                "Accounts must be clearly labelled as PROTOTYPE in production."
            ),
            "fields": ("designation", "jurisdiction"),
        }),
    )


# ── 3. RestaurantOfficerMapping ──────────────────────────────────────────────

@admin.register(RestaurantOfficerMapping)
class RestaurantOfficerMappingAdmin(admin.ModelAdmin):
    list_display   = ("id", "restaurant", "level_1_officer_display", "jurisdiction_notes")
    list_filter    = ("level_1_officer__level",)
    search_fields  = ("restaurant__name", "level_1_officer__designation")
    list_select_related = ("restaurant", "level_1_officer__level")
    autocomplete_fields = ("restaurant",)

    @admin.display(description="Level-1 Officer")
    def level_1_officer_display(self, obj):
        if obj.level_1_officer:
            return f"{obj.level_1_officer.designation} [{obj.level_1_officer.level.code}]"
        return format_html('<span style="color:red">⚠ AWAITING ASSIGNMENT</span>')


# ── 4. OfficerComplaintAssignment ────────────────────────────────────────────


@admin.register(OfficerComplaintAssignment)
class OfficerComplaintAssignmentAdmin(admin.ModelAdmin):
    list_display   = (
        "id", "complaint_link", "officer_designation", "level",
        "status", "overdue_indicator", "effective_deadline", "assigned_at",
    )
    list_filter    = ("status", "level", "officer__level")
    search_fields  = ("complaint__title", "officer__designation")
    list_select_related = ("complaint", "officer__level", "level")
    readonly_fields = (
        "assigned_at", "updated_at", "resolved_at",
        "effective_deadline", "is_overdue",
        "hold_started_at", "hold_duration_days",
    )
    fieldsets = (        ("Assignment", {
            "fields": ("complaint", "officer", "level", "status"),
        }),
        ("Officer Notes (Not visible to customers)", {
            "fields": ("investigation_notes", "action_taken"),
        }),
        ("Deadline", {
            "fields": ("deadline_at", "effective_deadline", "is_overdue"),
        }),
        ("Hold Management", {
            "fields": ("hold_started_at", "hold_reason", "hold_duration_days"),
        }),
        ("Timestamps", {
            "fields": ("assigned_at", "updated_at", "resolved_at"),
            "classes": ("collapse",),
        }),
    )
    # Escalation history is viewable via EscalationEventAdmin filtered by complaint_id
    actions = ["action_place_on_hold", "action_resume", "action_manual_escalate"]

    @admin.display(description="Complaint")
    def complaint_link(self, obj):
        return format_html(
            '<a href="/admin/complaints/complaint/{}/change/">#{} — {}</a>',
            obj.complaint_id, obj.complaint_id, obj.complaint.title[:40],
        )

    @admin.display(description="Officer")
    def officer_designation(self, obj):
        return obj.officer.designation

    @admin.display(description="Overdue?")
    def overdue_indicator(self, obj):
        if obj.is_overdue:
            return format_html('<span style="color:red;font-weight:bold">⚠ OVERDUE</span>')
        return format_html('<span style="color:green">OK</span>')

    @admin.action(description="Place selected assignments ON HOLD")
    def action_place_on_hold(self, request, queryset):
        ok, fail = 0, 0
        for a in queryset:
            try:
                place_on_hold(a, reason="Admin hold via Django admin.", performed_by=request.user)
                ok += 1
            except OfficerAssignmentError:
                fail += 1
        self.message_user(request, f"Held: {ok}  |  Skipped: {fail}")

    @admin.action(description="Resume selected ON HOLD assignments")
    def action_resume(self, request, queryset):
        ok, fail = 0, 0
        for a in queryset:
            try:
                resume_from_hold(a, performed_by=request.user)
                ok += 1
            except OfficerAssignmentError:
                fail += 1
        self.message_user(request, f"Resumed: {ok}  |  Skipped: {fail}")

    @admin.action(description="Manually escalate selected assignments")
    def action_manual_escalate(self, request, queryset):
        ok, final, fail = 0, 0, 0
        for a in queryset:
            try:
                result = escalate_assignment(
                    a,
                    reason="Manual escalation via Django admin.",
                    trigger=EscalationEvent.TriggerType.ADMINISTRATIVE,
                    performed_by=request.user,
                )
                if result is None:
                    final += 1
                else:
                    ok += 1
            except OfficerAssignmentError:
                fail += 1
        self.message_user(
            request,
            f"Escalated: {ok}  |  Final level reached: {final}  |  Skipped: {fail}",
        )


# ── 5. EscalationEvent ───────────────────────────────────────────────────────

@admin.register(EscalationEvent)
class EscalationEventAdmin(admin.ModelAdmin):
    list_display = (
        "id", "complaint_link", "from_level", "to_level",
        "trigger", "created_at",
    )
    list_filter  = ("trigger", "to_level", "from_level")
    search_fields = ("complaint__title", "reason")
    readonly_fields = (
        "complaint", "from_level", "to_level", "from_officer", "to_officer",
        "trigger", "reason", "customer_message", "deadline_exceeded_at",
        "performed_by", "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False   # append-only via service layer only

    def has_change_permission(self, request, obj=None):
        return False   # immutable audit trail

    @admin.display(description="Complaint")
    def complaint_link(self, obj):
        return format_html(
            '<a href="/admin/complaints/complaint/{}/change/">#{}</a>',
            obj.complaint_id, obj.complaint_id,
        )
