from django.urls import path

from notifications.views import (
    NotificationDetailView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
)

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("unread-count/", NotificationUnreadCountView.as_view(), name="unread_count"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="mark_all_read"),
    path("<int:pk>/", NotificationDetailView.as_view(), name="detail"),
]
