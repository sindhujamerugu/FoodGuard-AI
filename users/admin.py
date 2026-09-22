from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from users.models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Django admin configuration for the custom User model.
    Extends Django's built-in UserAdmin for full password management.
    """

    # ------------------------------------------------------------------
    # List view
    # ------------------------------------------------------------------

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "preferred_language",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("role", "preferred_language", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("-date_joined",)

    # ------------------------------------------------------------------
    # Detail / edit view
    # ------------------------------------------------------------------

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {"fields": ("first_name", "last_name", "phone")},
        ),
        (
            "FoodGuard settings",
            {"fields": ("role", "preferred_language")},
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "date_joined")},
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "phone",
                    "role",
                    "preferred_language",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    readonly_fields = ("date_joined", "last_login")

    # username is removed from the model — override the base UserAdmin
    # which references it in a few places.
    filter_horizontal = ("groups", "user_permissions")
