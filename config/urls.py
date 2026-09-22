"""
FoodGuard AI — root URL configuration.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # Auth endpoints: /api/v1/auth/
    path("api/v1/auth/", include("users.urls", namespace="users")),

    # Restaurant endpoints: /api/v1/restaurants/
    path("api/v1/restaurants/", include("restaurants.urls", namespace="restaurants")),

    # Food report endpoints: /api/v1/reports/
    path("api/v1/reports/", include("food_reports.urls", namespace="food_reports")),

    # AI analysis endpoints: /api/v1/reports/<id>/analyze/ and /analysis/
    path("api/v1/reports/", include("ai_analysis.urls", namespace="ai_analysis")),

    # Complaint endpoints: /api/v1/complaints/
    path("api/v1/complaints/", include("complaints.urls", namespace="complaints")),
]

# Serve uploaded media files during development (DEBUG=True only)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
