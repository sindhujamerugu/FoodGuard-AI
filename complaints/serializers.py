from django.contrib.auth import get_user_model
from rest_framework import serializers

from complaints.models import Complaint, ComplaintInvestigation, ReviewerActivity
from food_reports.models import FoodReport
from restaurants.models import Restaurant

User = get_user_model()


# ---------------------------------------------------------------------------
# Nested read-only minimals
# ---------------------------------------------------------------------------

class CustomerMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "preferred_language"]
        read_only_fields = fields


class StaffMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = fields


class RestaurantMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = ["id", "name", "city", "state"]
        read_only_fields = fields


class FoodReportMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodReport
        fields = ["id", "title", "status"]
        read_only_fields = fields


class ReviewerActivityReadSerializer(serializers.ModelSerializer):
    actor = StaffMinimalSerializer(read_only=True)
    complaint = serializers.PrimaryKeyRelatedField(read_only=True)
    escalation = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ReviewerActivity
        fields = [
            "id",
            "actor",
            "complaint",
            "escalation",
            "action_type",
            "summary",
            "metadata",
            "created_at",
        ]
        read_only_fields = fields


class ComplaintInvestigationSerializer(serializers.ModelSerializer):
    investigator = StaffMinimalSerializer(read_only=True)
    assigned_reviewer = StaffMinimalSerializer(read_only=True)

    class Meta:
        model = ComplaintInvestigation
        fields = [
            "id",
            "complaint",
            "investigator",
            "assigned_reviewer",
            "status",
            "summary",
            "findings",
            "observations",
            "evidence_review_notes",
            "actions_taken",
            "recommendation",
            "remarks",
            "started_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ComplaintInvestigationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplaintInvestigation
        fields = [
            "summary",
            "findings",
            "observations",
            "evidence_review_notes",
            "actions_taken",
            "recommendation",
            "remarks",
            "status",
        ]

    def validate_summary(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_findings(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_observations(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_evidence_review_notes(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_actions_taken(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_remarks(self, value: str) -> str:
        return value.strip() if value else ""

    def validate_recommendation(self, value: str) -> str:
        if value and value not in dict(ComplaintInvestigation.Recommendation.choices):
            raise serializers.ValidationError("Invalid recommendation.")
        return value

    def validate_status(self, value: str) -> str:
        valid = [item[0] for item in ComplaintInvestigation.Status.choices]
        if value and value not in valid:
            raise serializers.ValidationError("Invalid investigation status.")
        return value


# ---------------------------------------------------------------------------
# Read serializer
# ---------------------------------------------------------------------------

class ComplaintReadSerializer(serializers.ModelSerializer):
    """
    Full read-only response.
    Never exposes password, secret_key, or internal tokens.
    """

    customer = CustomerMinimalSerializer(read_only=True)
    restaurant = RestaurantMinimalSerializer(read_only=True)
    food_report = FoodReportMinimalSerializer(read_only=True)
    rejected_by = StaffMinimalSerializer(read_only=True)

    class Meta:
        model = Complaint
        fields = [
            "id",
            "food_report",
            "customer",
            "restaurant",
            "title",
            "description",
            "category",
            "original_language",
            "status",
            "priority",
            "resolution_notes",
            "rejection_reason",
            "rejected_by",
            "rejected_at",
            "submitted_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Create serializer
# ---------------------------------------------------------------------------

class ComplaintCreateSerializer(serializers.Serializer):
    """
    POST /api/v1/complaints/

    Accepted from client: food_report, title, description, category.
    Rejected from client: customer, restaurant, status, priority,
                          original_language, timestamps.
    """

    food_report = serializers.PrimaryKeyRelatedField(
        queryset=FoodReport.objects.all()
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    category = serializers.ChoiceField(choices=Complaint.Category.choices)

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Title cannot be blank.")
        return value.strip()

    def validate_description(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Description cannot be blank.")
        return value.strip()

    def validate_food_report(self, report: FoodReport) -> FoodReport:
        # Lightweight pre-check before the service runs full validation
        if report.status == FoodReport.Status.DRAFT:
            raise serializers.ValidationError(
                "Complaints can only be filed against SUBMITTED food reports."
            )
        return report

    def create(self, validated_data: dict) -> Complaint:
        from complaints.services import ComplaintService
        service = ComplaintService()
        return service.create(
            food_report=validated_data["food_report"],
            requesting_user=self.context["request"].user,
            title=validated_data["title"],
            description=validated_data["description"],
            category=validated_data["category"],
        )


# ---------------------------------------------------------------------------
# Update serializer  (reviewer / admin only)
# ---------------------------------------------------------------------------

class ComplaintUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /api/v1/complaints/<id>/

    Only reviewer/admin fields are writable.
    Customer, restaurant, food_report, original_language and timestamps
    are never accepted.
    """

    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Complaint
        fields = ["status", "priority", "resolution_notes", "rejection_reason"]

    def validate_status(self, value: str) -> str:
        valid = [s[0] for s in Complaint.Status.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"'{value}' is not a valid status."
            )
        return value

    def validate_priority(self, value: str) -> str:
        valid = [p[0] for p in Complaint.Priority.choices]
        if value not in valid:
            raise serializers.ValidationError(
                f"'{value}' is not a valid priority."
            )
        return value

    def validate(self, attrs: dict) -> dict:
        status_val = attrs.get("status")
        if status_val == Complaint.Status.REJECTED:
            reason = attrs.get("rejection_reason")
            if not reason or not reason.strip():
                raise serializers.ValidationError(
                    {"rejection_reason": "A non-empty rejection reason is required when rejecting a complaint."}
                )
        return attrs

    def update(self, instance: Complaint, validated_data: dict) -> Complaint:
        from complaints.services import ComplaintService
        request = self.context.get("request")
        requesting_user = request.user if request else None
        return ComplaintService().update(
            instance, validated_data, requesting_user=requesting_user
        )
