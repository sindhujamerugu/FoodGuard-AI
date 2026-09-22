from django.contrib.auth import get_user_model
from rest_framework import serializers

from complaints.models import Complaint
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

    class Meta:
        model = Complaint
        fields = ["status", "priority", "resolution_notes"]

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

    def update(self, instance: Complaint, validated_data: dict) -> Complaint:
        from complaints.services import ComplaintService
        return ComplaintService().update(instance, validated_data)
