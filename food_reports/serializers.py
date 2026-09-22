from django.contrib.auth import get_user_model
from rest_framework import serializers

from food_reports.models import FoodReport
from food_reports.services import validate_report_image
from restaurants.models import Restaurant

User = get_user_model()


# ---------------------------------------------------------------------------
# Nested read-only representations
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


# ---------------------------------------------------------------------------
# Read serializer
# ---------------------------------------------------------------------------

class FoodReportReadSerializer(serializers.ModelSerializer):
    """
    Full read-only representation.  Returns a usable image URL (not a raw
    filesystem path) via the request context.
    """

    customer = CustomerMinimalSerializer(read_only=True)
    restaurant = RestaurantMinimalSerializer(read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = FoodReport
        fields = [
            "id",
            "customer",
            "restaurant",
            "title",
            "description",
            "image",
            "status",
            "priority",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_image(self, obj) -> str | None:
        if not obj.image:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


# ---------------------------------------------------------------------------
# Create serializer
# ---------------------------------------------------------------------------

class FoodReportCreateSerializer(serializers.Serializer):
    """
    POST /api/v1/reports/

    Accepted fields: restaurant, title, description, image.
    Rejected from client: customer, status, priority, timestamps.
    """

    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all()
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField()
    image = serializers.ImageField(required=False, allow_null=True)

    # ------------------------------------------------------------------
    # Field-level validation
    # ------------------------------------------------------------------

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Title cannot be blank.")
        return value.strip()

    def validate_description(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Description cannot be blank.")
        return value.strip()

    def validate_restaurant(self, restaurant: Restaurant) -> Restaurant:
        if not restaurant.is_active:
            raise serializers.ValidationError(
                "Reports can only be filed against active restaurants."
            )
        return restaurant

    def validate_image(self, image_file):
        if image_file:
            validate_report_image(image_file)
        return image_file

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    def create(self, validated_data: dict) -> FoodReport:
        request = self.context["request"]
        return FoodReport.objects.create(
            customer=request.user,
            restaurant=validated_data["restaurant"],
            title=validated_data["title"],
            description=validated_data["description"],
            image=validated_data.get("image"),
            status=FoodReport.Status.DRAFT,
            priority=FoodReport.Priority.LOW,
        )


# ---------------------------------------------------------------------------
# Update serializer
# ---------------------------------------------------------------------------

class FoodReportUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /api/v1/reports/<id>/

    Customers may update title, description, restaurant, image
    only while the report is DRAFT.

    Rejected from client: customer, status, priority, timestamps.
    """

    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.filter(is_active=True),
        required=False,
    )
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = FoodReport
        fields = ["title", "description", "restaurant", "image"]

    def validate_title(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Title cannot be blank.")
        return value.strip()

    def validate_description(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Description cannot be blank.")
        return value.strip()

    def validate_image(self, image_file):
        if image_file:
            validate_report_image(image_file)
        return image_file

    def update(self, instance: FoodReport, validated_data: dict) -> FoodReport:
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
