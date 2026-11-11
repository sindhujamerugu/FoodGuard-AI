from django.urls import path

from restaurants.views import (
    RestaurantApproveClaimView,
    RestaurantClaimView,
    RestaurantDetailView,
    RestaurantListCreateView,
    RestaurantRejectClaimView,
)
from feedback.views import RestaurantRatingView

app_name = "restaurants"

urlpatterns = [
    path("", RestaurantListCreateView.as_view(), name="list-create"),
    path("<int:pk>/", RestaurantDetailView.as_view(), name="detail"),
    path("<int:pk>/claim/", RestaurantClaimView.as_view(), name="claim"),
    path("<int:pk>/approve-claim/", RestaurantApproveClaimView.as_view(), name="approve-claim"),
    path("<int:pk>/reject-claim/", RestaurantRejectClaimView.as_view(), name="reject-claim"),
    path("<int:restaurant_id>/rating/", RestaurantRatingView.as_view(), name="rating"),
]
