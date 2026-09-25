from django.contrib.auth import get_user_model
from rest_framework import serializers

from complaints.models import Complaint
from escalation.models import Escalation

User = get_user_model()


# ---------------------------------------------------------------------------
# Nested minimal representations
# ---------------------------------------------------------------------------

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = fields


class ComplaintMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ["id", "title", "status", "category"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Read serializer
# ---------------------------------------------------------------------------

class EscalationReadSerializer(serializers.ModelSerializer):
    """
    Full read-only representation.
    Never exposes password or internal security fields.
    """

    complaint = ComplaintMinimalSerializer(read_only=True)
    created_by = UserMinimalSerializer(read_only=True)
    assigned_to = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Escalation
        fields = [
            "id",
            "complaint",
            "created_by",
            "assigned_to",
            "escalation_level",
            "reason",
            "original_language",
            "status",
            "resolution_notes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Create serializer
# ---------------------------------------------------------------------------

class EscalationCreateSerializer(serializers.Serializer):
    """
    POST /api/v1/escalations/

    Accepted from client: complaint, escalation_level, reason, assigned_to.
    Rejected from client: created_by, status, original_language, timestamps.
    """

    complaint = serializers.PrimaryKeyRelatedField(
        queryset=Complaint.objects.all()
    )
    escalation_level = serializers.ChoiceField(
        choices=Escalation.Level.choices,
        default=Escalation.Level.LEVEL_1,
    )
    reason = serializers.CharField()
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate_reason(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Reason cannot be blank.")
        return value.strip()

    def validate_assigned_to(self, user):
        if user is None:
            return user
        from users.models import User as UserModel
        if user.role not in (UserModel.Role.REVIEWER, UserModel.Role.ADMIN):
            raise serializers.ValidationError(
                f"User '{user.email}' cannot be assigned. "
                "Only REVIEWER or ADMIN users may be assigned to an escalation."
            )
        return user

    def create(self, validated_data: dict) -> Escalation:
        from escalation.services import EscalationService
        service = EscalationService()
        return service.create(
            complaint=validated_data["complaint"],
            requesting_user=self.context["request"].user,
            escalation_level=validated_data.get(
                "escalation_level", Escalation.Level.LEVEL_1
            ),
            reason=validated_data["reason"],
            assigned_to_user=validated_data.get("assigned_to"),
        )


# ---------------------------------------------------------------------------
# Update serializer
# ---------------------------------------------------------------------------

class EscalationUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /api/v1/escalations/<id>/

    Writable fields: assigned_to, escalation_level, status, resolution_notes.
    Never accepts: complaint, created_by, original_language, timestamps.
    """

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Escalation
        fields = ["assigned_to", "escalation_level", "status", "resolution_notes"]

    def validate_assigned_to(self, user):
        if user is None:
            return user
        from users.models import User as UserModel
        if user.role not in (UserModel.Role.REVIEWER, UserModel.Role.ADMIN):
            raise serializers.ValidationError(
                f"User '{user.email}' cannot be assigned. "
                "Only REVIEWER or ADMIN users may be assigned."
            )
        return user

    def update(self, instance: Escalation, validated_data: dict) -> Escalation:
        from escalation.services import EscalationService
        return EscalationService().update(instance, validated_data)
