"""URL configuration for the project."""
from django.urls import include, path

urlpatterns = [
    path("api/trip/", include("trip.urls")),
    path("trip/", include("trip.urls")),
]
