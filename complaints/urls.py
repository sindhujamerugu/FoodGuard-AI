from django.urls import path

from complaints.views import ComplaintDetailView, ComplaintListCreateView

app_name = "complaints"

urlpatterns = [
    path("", ComplaintListCreateView.as_view(), name="list-create"),
    path("<int:pk>/", ComplaintDetailView.as_view(), name="detail"),
]
