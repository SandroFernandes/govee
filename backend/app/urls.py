from django.contrib import admin
from django.urls import path
from app import views


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", views.health),
    path("api/health/", views.health),
    path("api/auth/session/", views.auth_session),
    path("api/auth/csrf/", views.auth_csrf),
    path("api/auth/login/", views.auth_login),
    path("api/auth/logout/", views.auth_logout),
    path("api/history/", views.history_values),
    path("api/devices/", views.devices),
]
