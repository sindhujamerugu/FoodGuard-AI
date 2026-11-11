from rest_framework import serializers

from food_safety_officers.models import (
    EscalationEvent,
    EscalationLevel,
    OfficerComplaintAssignment,
    PrototypeOfficer,
    RestaurantOfficerMapping,
)


# ── EscalationLevel ──────────────────────────────────────────────────────────

class EscalationLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationLevel
        fields = [
            "id", "name", "code", "order", "is_enabled",
            "response_deadline_days", "description",
        ]


# ── PrototypeOfficer ─────────────────────────────────────────────────────────

class PrototypeOfficerPublicSerializer(serializers.ModelSerializer):
    """Customer-safe: designation + jurisdiction only. No user PII."""
    level_name = serializers.CharField(source="level.name", read_only=True)
    level_code = serializers.CharField(source="level.code", read_only=True)

    class Meta:
        model = PrototypeOfficer
        fields = ["id", "designation", "jurisdiction", "level_name", "level_code"]


class PrototypeOfficerAdminSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source="level.name", read_only=True)

    class Meta:
        model = PrototypeOfficer
        fields = [
            "id", "user", "level", "level_name",
            "designation", "jurisdiction", "is_active",
        ]

    def validate_user(self, user):
        """
        Only REVIEWER or ADMIN role users may be registered as prototype officers.
        CUSTOMER and RESTAURANT_USER accounts must be rejected.
        """
        from users.models import User as UserModel
        ALLOWED = (UserModel.Role.REVIEWER, UserModel.Role.ADMIN)
        if user.role not in ALLOWED:
            raise serializers.ValidationError(
                f"User '{user.email}' has role '{user.role}' and cannot be registered "
                "as a prototype officer. Only REVIEWER or ADMIN role users are permitted."
            )
        return user


# ── OfficerComplaintAssignment ───────────────────────────────────────────────

class OfficerAssignmentPublicSerializer(serializers.ModelSerializer):
    """
    Customer-facing — NEVER exposes investigation_notes (internal field).
    Shows designation, jurisdiction, level name, deadline, action_taken
    (officer's customer-visible summary), and customer_message from
    the latest escalation event.
    """
    officer_designation  = serializers.CharField(source="officer.designation", read_only=True)
    officer_jurisdiction = serializers.CharField(source="officer.jurisdiction", read_only=True)
    level_name           = serializers.CharField(source="level.name", read_only=True)
    level_code           = serializers.CharField(source="level.code", read_only=True)
    is_overdue           = serializers.BooleanField(read_only=True)
    effective_deadline   = serializers.DateTimeField(read_only=True)

    class Meta:
        model = OfficerComplaintAssignment
        fields = [
            "id",
            "complaint",
            "officer_designation",
            "officer_jurisdiction",
            "level_name",
            "level_code",
            "status",
            "action_taken",        # customer-visible summary only
            "assigned_at",
            "deadline_at",
            "effective_deadline",
            "is_overdue",
        ]
        # investigation_notes deliberately excluded


class OfficerAssignmentAdminSerializer(serializers.ModelSerializer):
    officer_designation = serializers.CharField(source="officer.designation", read_only=True)
    level_name          = serializers.CharField(source="level.name", read_only=True)

    class Meta:
        model = OfficerComplaintAssignment
        fields = [
            "id", "complaint", "officer", "officer_designation",
            "level", "level_name", "status",
            "investigation_notes", "action_taken",
            "assigned_at", "deadline_at", "effective_deadline",
            "hold_started_at", "hold_reason", "hold_duration_days",
            "is_overdue", "updated_at", "resolved_at",
        ]


# ── EscalationEvent ──────────────────────────────────────────────────────────

class EscalationEventPublicSerializer(serializers.ModelSerializer):
    """Customer-facing — only customer_message + timing. No internal reason text."""
    from_level_name = serializers.CharField(source="from_level.name", read_only=True, default=None)
    to_level_name   = serializers.CharField(source="to_level.name",   read_only=True)
    from_officer_designation = serializers.CharField(
        source="from_officer.designation", read_only=True, default=None
    )
    to_officer_designation = serializers.CharField(
        source="to_officer.designation", read_only=True, default=None
    )

    class Meta:
        model = EscalationEvent
        fields = [
            "id",
            "from_level_name",
            "to_level_name",
            "from_officer_designation",
            "to_officer_designation",
            "trigger",
            "customer_message",
            "created_at",
        ]


class EscalationEventAdminSerializer(serializers.ModelSerializer):
    from_level_name = serializers.CharField(source="from_level.name", read_only=True, default=None)
    to_level_name   = serializers.CharField(source="to_level.name",   read_only=True)

    class Meta:
        model = EscalationEvent
        fields = "__all__"


# ── RestaurantOfficerMapping ─────────────────────────────────────────────────

class RestaurantOfficerMappingSerializer(serializers.ModelSerializer):
    restaurant_name    = serializers.CharField(source="restaurant.name", read_only=True)
    officer_designation = serializers.CharField(
        source="level_1_officer.designation", read_only=True, default=None
    )

    class Meta:
        model = RestaurantOfficerMapping
        fields = [
            "id", "restaurant", "restaurant_name",
            "level_1_officer", "officer_designation",
            "jurisdiction_notes",
        ]
