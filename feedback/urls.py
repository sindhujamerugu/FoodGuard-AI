from django.urls import path

from feedback.views import FeedbackDetailView, FeedbackListCreateView

app_name = "feedback"

urlpatterns = [
    path("", FeedbackListCreateView.as_view(), name="list-create"),
    path("<int:pk>/", FeedbackDetailView.as_view(), name="detail"),
]
