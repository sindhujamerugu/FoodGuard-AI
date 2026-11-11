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
    Exposes moderation_status to customer (they can see own status).
    Never exposes moderation_note (admin-only internal field).
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
            "moderation_status",   # customer-visible: PENDING / APPROVED / REJECTED
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Moderation serializer (admin/reviewer only)
# ---------------------------------------------------------------------------

class FeedbackModerationSerializer(serializers.ModelSerializer):
    """
    PATCH /api/v1/feedback/<id>/moderate/
    Admin/Reviewer only — sets moderation_status and optional moderation_note.
    """

    class Meta:
        model = Feedback
        fields = ["moderation_status", "moderation_note"]

    def validate_moderation_status(self, value: str) -> str:
        from feedback.models import Feedback as F
        allowed = {F.ModerationStatus.APPROVED, F.ModerationStatus.REJECTED, F.ModerationStatus.PENDING}
        if value not in allowed:
            raise serializers.ValidationError(f"'{value}' is not a valid moderation status.")
        return value


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


# ---------------------------------------------------------------------------
# Restaurant rating aggregation serializer
# ---------------------------------------------------------------------------

class RestaurantRatingSerializer(serializers.Serializer):
    """
    Read-only aggregate returned by GET /api/v1/restaurants/<id>/rating/
    Only APPROVED feedback contributes to the aggregate.
    """
    restaurant_id      = serializers.IntegerField()
    restaurant_name    = serializers.CharField()
    average_rating     = serializers.FloatField(allow_null=True)
    total_ratings      = serializers.IntegerField()
    distribution       = serializers.DictField(child=serializers.IntegerField())
    has_ratings        = serializers.BooleanField()
