from django.contrib.auth import get_user_model
from rest_framework import serializers

from complaints.models import Complaint
from feedback.models import Feedback

User = get_user_model()


# ---------------------------------------------------------------------------
# Nested read-only minimals
# ---------------------------------------------------------------------------

class CustomerMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "preferred_language"]
        read_only_fields = fields


class ComplaintMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ["id", "title", "status", "category"]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Read serializer
# ---------------------------------------------------------------------------

class FeedbackReadSerializer(serializers.ModelSerializer):
    """
    Full read-only response.
    Never exposes password or internal security fields.
    """

    complaint = ComplaintMinimalSerializer(read_only=True)
    customer = CustomerMinimalSerializer(read_only=True)

    class Meta:
        model = Feedback
        fields = [
            "id",
            "complaint",
            "customer",
            "rating",
            "comments",
            "original_language",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Create serializer
# ---------------------------------------------------------------------------

class FeedbackCreateSerializer(serializers.Serializer):
    """
    POST /api/v1/feedback/

    Accepted: complaint, rating, comments.
    Rejected from client: customer, original_language, timestamps.
    """

    complaint = serializers.PrimaryKeyRelatedField(
        queryset=Complaint.objects.all()
    )
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comments = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    def validate_rating(self, value: int) -> int:
        if not isinstance(value, int) or isinstance(value, bool):
            raise serializers.ValidationError("Rating must be an integer.")
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5 (inclusive)."
            )
        return value

    def validate_complaint(self, complaint: Complaint) -> Complaint:
        from complaints.models import Complaint as C
        allowed = {C.Status.RESOLVED, C.Status.CLOSED}
        if complaint.status not in allowed:
            raise serializers.ValidationError(
                "Feedback can only be submitted for RESOLVED or CLOSED complaints. "
                f"This complaint is currently '{complaint.get_status_display()}'."
            )
        return complaint

    def create(self, validated_data: dict) -> Feedback:
        from feedback.services import FeedbackService
        return FeedbackService().create(
            complaint=validated_data["complaint"],
            requesting_user=self.context["request"].user,
            rating=validated_data["rating"],
            comments=validated_data.get("comments", ""),
        )
