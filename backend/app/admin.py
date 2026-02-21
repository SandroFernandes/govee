from django.contrib import admin

from app.models import (
    H5075AdvertisementSnapshot,
    H5075DeviceAlias,
    H5075HistoricalMeasurement,
    H5075HistorySyncState,
    H5075Measurement,
)


@admin.register(H5075Measurement)
class H5075MeasurementAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "address", "temperature_c", "humidity_pct", "battery_pct", "rssi", "error")
    list_filter = ("error", "created_at")
    search_fields = ("address", "name")


@admin.register(H5075AdvertisementSnapshot)
class H5075AdvertisementSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "name",
        "address",
        "manufacturer_id",
        "temperature_c",
        "humidity_pct",
        "battery_pct",
        "rssi",
        "error",
    )
    list_filter = ("error", "manufacturer_id", "created_at")
    search_fields = ("address", "name", "payload_hex")


@admin.register(H5075HistoricalMeasurement)
class H5075HistoricalMeasurementAdmin(admin.ModelAdmin):
    list_display = ("measured_at", "name", "address", "temperature_c", "humidity_pct")
    list_filter = ("measured_at",)
    search_fields = ("address", "name")


@admin.register(H5075HistorySyncState)
class H5075HistorySyncStateAdmin(admin.ModelAdmin):
    list_display = ("job_name", "last_status", "last_attempt_at", "last_success_at", "updated_at")
    list_filter = ("last_status", "updated_at")
    search_fields = ("job_name",)


@admin.register(H5075DeviceAlias)
class H5075DeviceAliasAdmin(admin.ModelAdmin):
    list_display = ("display_name", "alias", "detected_name", "address", "updated_at")
    search_fields = ("alias", "detected_name", "address")
