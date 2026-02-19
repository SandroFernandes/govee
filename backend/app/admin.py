from django.contrib import admin

from app.models import H5075Measurement


@admin.register(H5075Measurement)
class H5075MeasurementAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "address", "temperature_c", "humidity_pct", "battery_pct", "rssi", "error")
    list_filter = ("error", "created_at")
    search_fields = ("address", "name")
