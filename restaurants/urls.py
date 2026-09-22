from django.urls import path

from restaurants.views import RestaurantDetailView, RestaurantListCreateView

app_name = "restaurants"

urlpatterns = [
    path("", RestaurantListCreateView.as_view(), name="list-create"),
    path("<int:pk>/", RestaurantDetailView.as_view(), name="detail"),
]
