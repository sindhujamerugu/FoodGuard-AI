import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from restaurants.models import Restaurant

User = get_user_model()

# Pincode: 4–10 alphanumeric characters (covers Indian 6-digit pincodes
# and other formats).
_PINCODE_RE = re.compile(r"^[A-Za-z0-9]{4,10}$")

# Phone: optional leading +, then 7–15 digits, optional spaces/dashes.
_PHONE_RE = re.compile(r"^\+?[\d\s\-]{7,20}$")


class OwnerMinimalSerializer(serializers.ModelSerializer):
    """Minimal owner representation — never exposes password."""

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role"]
        read_only_fields = fields


class RestaurantReadSerializer(serializers.ModelSerializer):
    """
    Full read-only representation returned to all authenticated callers.
    Owner is embedded as a minimal nested object.
    """

    owner = OwnerMinimalSerializer(read_only=True)

    class Meta:
        model = Restaurant
        fields = [
            "id",
            "name",
            "description",
            "address",
            "city",
            "state",
            "pincode",
            "contact_email",
            "contact_phone",
            "owner",
            "is_verified",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class RestaurantCreateSerializer(serializers.ModelSerializer):
    """
    Used for POST /api/v1/restaurants/

    - owner is never accepted from the client; it is injected by the view
      from request.user.
    - is_verified is never accepted from the client.
    """

    class Meta:
        model = Restaurant
        fields = [
            "name",
            "description",
            "address",
            "city",
            "state",
            "pincode",
            "contact_email",
            "contact_phone",
            "is_active",
        ]

    # ------------------------------------------------------------------
    # Field-level validation
    # ------------------------------------------------------------------

    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Restaurant name cannot be blank.")
        return value.strip()

    def validate_city(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("City cannot be blank.")
        return value.strip()

    def validate_state(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("State cannot be blank.")
        return value.strip()

    def validate_pincode(self, value: str) -> str:
        cleaned = value.strip()
        if not _PINCODE_RE.match(cleaned):
            raise serializers.ValidationError(
                "Pincode must be 4–10 alphanumeric characters (e.g. 500001)."
            )
        return cleaned

    def validate_contact_phone(self, value: str) -> str:
        if value and not _PHONE_RE.match(value.strip()):
            raise serializers.ValidationError(
                "Enter a valid phone number (7–20 digits, optional +/spaces/dashes)."
            )
        return value.strip()

    def validate_contact_email(self, value: str) -> str:
        # EmailField already validates format; just strip whitespace.
        return value.strip()

    def create(self, validated_data: dict) -> Restaurant:
        # owner is injected by the view — never from client payload
        owner = self.context["request"].user
        return Restaurant.objects.create(owner=owner, **validated_data)


class RestaurantUpdateSerializer(serializers.ModelSerializer):
    """
    Used for PATCH /api/v1/restaurants/<id>/

    - owner is never accepted.
    - is_verified is never accepted from RESTAURANT_USER callers;
      REVIEWER/ADMIN callers are permitted to change it (enforced in view).
    """

    # Expose is_verified as writable here; the view/permission layer
    # controls WHO may set it.
    is_verified = serializers.BooleanField(required=False)

    class Meta:
        model = Restaurant
        fields = [
            "name",
            "description",
            "address",
            "city",
            "state",
            "pincode",
            "contact_email",
            "contact_phone",
            "is_active",
            "is_verified",
        ]

    # Re-use the same validators as create
    def validate_name(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("Restaurant name cannot be blank.")
        return value.strip()

    def validate_city(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("City cannot be blank.")
        return value.strip()

    def validate_state(self, value: str) -> str:
        if not value.strip():
            raise serializers.ValidationError("State cannot be blank.")
        return value.strip()

    def validate_pincode(self, value: str) -> str:
        cleaned = value.strip()
        if not _PINCODE_RE.match(cleaned):
            raise serializers.ValidationError(
                "Pincode must be 4–10 alphanumeric characters."
            )
        return cleaned

    def validate_contact_phone(self, value: str) -> str:
        if value and not _PHONE_RE.match(value.strip()):
            raise serializers.ValidationError(
                "Enter a valid phone number (7–20 digits, optional +/spaces/dashes)."
            )
        return value.strip()

    def validate_contact_email(self, value: str) -> str:
        return value.strip()

    def update(self, instance: Restaurant, validated_data: dict) -> Restaurant:
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
