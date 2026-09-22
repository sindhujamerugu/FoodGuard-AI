from django.contrib import admin

from restaurants.models import Restaurant


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "city",
        "state",
        "is_verified",
        "is_active",
        "created_at",
    )
    list_filter = ("is_verified", "is_active", "state", "city")
    search_fields = ("name", "owner__email", "city", "state")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
