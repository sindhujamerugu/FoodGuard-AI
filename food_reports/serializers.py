from decimal import Decimal

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
    filesystem path) via the request context.  Includes location_lat /
    location_lng when present (NULL values are serialised as null).
    """

    customer   = CustomerMinimalSerializer(read_only=True)
    restaurant = RestaurantMinimalSerializer(read_only=True)
    image      = serializers.SerializerMethodField()

    class Meta:
        model = FoodReport
        fields = [
            "id",
            "customer",
            "restaurant",
            "title",
            "description",
            "image",
            "location_lat",
            "location_lng",
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
# Shared location-coordinate validators (reused by create + update)
# ---------------------------------------------------------------------------

def _validate_lat(value) -> Decimal | None:
    """Latitude must be in [-90.0, 90.0]."""
    if value is None:
        return None
    value = Decimal(str(value))
    if not (Decimal("-90") <= value <= Decimal("90")):
        raise serializers.ValidationError(
            "Latitude must be between -90.0 and 90.0."
        )
    return value


def _validate_lng(value) -> Decimal | None:
    """Longitude must be in [-180.0, 180.0]."""
    if value is None:
        return None
    value = Decimal(str(value))
    if not (Decimal("-180") <= value <= Decimal("180")):
        raise serializers.ValidationError(
            "Longitude must be between -180.0 and 180.0."
        )
    return value


# ---------------------------------------------------------------------------
# Create serializer
# ---------------------------------------------------------------------------

class FoodReportCreateSerializer(serializers.Serializer):
    """
    POST /api/v1/reports/

    Accepted fields: restaurant, title, description, image,
                     location_lat (optional), location_lng (optional).
    Rejected from client: customer, status, priority, timestamps.

    location_lat and location_lng are both optional (nullable). They must
    be supplied together — supplying only one is a validation error.
    Latitude range: −90 to 90.  Longitude range: −180 to 180.
    """

    restaurant   = serializers.PrimaryKeyRelatedField(queryset=Restaurant.objects.all())
    title        = serializers.CharField(max_length=255)
    description  = serializers.CharField()
    image        = serializers.ImageField(required=False, allow_null=True)
    location_lat = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        required=False, allow_null=True,
    )
    location_lng = serializers.DecimalField(
        max_digits=10, decimal_places=6,
        required=False, allow_null=True,
    )

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

    def validate_location_lat(self, value):
        return _validate_lat(value)

    def validate_location_lng(self, value):
        return _validate_lng(value)

    def validate(self, attrs):
        lat = attrs.get("location_lat")
        lng = attrs.get("location_lng")
        # Both must be provided together or both omitted/null
        if (lat is None) != (lng is None):
            raise serializers.ValidationError(
                "location_lat and location_lng must both be provided or both omitted."
            )
        return attrs

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
            location_lat=validated_data.get("location_lat"),
            location_lng=validated_data.get("location_lng"),
            status=FoodReport.Status.DRAFT,
            priority=FoodReport.Priority.LOW,
        )


# ---------------------------------------------------------------------------
# Update serializer
# ---------------------------------------------------------------------------

class FoodReportUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /api/v1/reports/<id>/

    Customers may update title, description, restaurant, image,
    location_lat, location_lng — only while the report is DRAFT.

    Rejected from client: customer, status, priority, timestamps.
    """

    restaurant   = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.filter(is_active=True),
        required=False,
    )
    image        = serializers.ImageField(required=False, allow_null=True)
    location_lat = serializers.DecimalField(
        max_digits=9, decimal_places=6,
        required=False, allow_null=True,
    )
    location_lng = serializers.DecimalField(
        max_digits=10, decimal_places=6,
        required=False, allow_null=True,
    )

    class Meta:
        model  = FoodReport
        fields = ["title", "description", "restaurant", "image", "location_lat", "location_lng"]

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

    def validate_location_lat(self, value):
        return _validate_lat(value)

    def validate_location_lng(self, value):
        return _validate_lng(value)

    def validate(self, attrs):
        # If only one coordinate is being patched, check the other on the
        # existing instance so they remain consistent.
        instance = self.instance
        lat = attrs.get("location_lat", getattr(instance, "location_lat", None))
        lng = attrs.get("location_lng", getattr(instance, "location_lng", None))
        if (lat is None) != (lng is None):
            raise serializers.ValidationError(
                "location_lat and location_lng must both be provided or both be null."
            )
        return attrs

    def update(self, instance: FoodReport, validated_data: dict) -> FoodReport:
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
