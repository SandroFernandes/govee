from django.db import models


class H5075Measurement(models.Model):
    address = models.CharField(max_length=17, db_index=True)
    name = models.CharField(max_length=128, blank=True)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2)
    humidity_pct = models.DecimalField(max_digits=5, decimal_places=2)
    battery_pct = models.PositiveSmallIntegerField()
    error = models.BooleanField(default=False)
    # RSSI (Received Signal Strength Indicator): Bluetooth signal strength in dBm; higher (less negative) is stronger.
    rssi = models.SmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name or 'H5075'} {self.address} @ {self.created_at.isoformat()}"


class H5075AdvertisementSnapshot(models.Model):
    address = models.CharField(max_length=17, db_index=True)
    name = models.CharField(max_length=128, blank=True)
    manufacturer_id = models.PositiveIntegerField()
    payload_hex = models.CharField(max_length=64)
    service_uuids = models.JSONField(default=list, blank=True)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2)
    humidity_pct = models.DecimalField(max_digits=5, decimal_places=2)
    battery_pct = models.PositiveSmallIntegerField()
    error = models.BooleanField(default=False)
    rssi = models.SmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["address", "manufacturer_id", "payload_hex"],
                name="uniq_h5075_snapshot_payload",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name or 'H5075'} {self.address} payload={self.payload_hex}"
