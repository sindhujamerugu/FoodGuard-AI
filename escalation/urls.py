from django.urls import path

from escalation.views import EscalationDetailView, EscalationListCreateView

app_name = "escalation"

urlpatterns = [
    path("", EscalationListCreateView.as_view(), name="list-create"),
    path("<int:pk>/", EscalationDetailView.as_view(), name="detail"),
]
