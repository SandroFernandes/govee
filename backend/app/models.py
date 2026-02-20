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


class H5075HistoricalMeasurement(models.Model):
    address = models.CharField(max_length=17, db_index=True)
    name = models.CharField(max_length=128, blank=True)
    measured_at = models.DateTimeField(db_index=True)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2)
    humidity_pct = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-measured_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["address", "measured_at"],
                name="uniq_h5075_history_address_timestamp",
            )
        ]

    def __str__(self) -> str:
        return f"{self.name or 'H5075'} {self.address} @ {self.measured_at.isoformat()}"


class H5075DeviceAlias(models.Model):
    address = models.CharField(max_length=17, unique=True)
    alias = models.CharField(max_length=128, blank=True)
    detected_name = models.CharField(max_length=128, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["alias", "address"]

    def save(self, *args, **kwargs):
        self.address = (self.address or "").strip().lower()
        self.alias = (self.alias or "").strip()
        self.detected_name = (self.detected_name or "").strip()
        return super().save(*args, **kwargs)

    @property
    def display_name(self) -> str:
        return self.alias or self.detected_name or self.address

    def __str__(self) -> str:
        return f"{self.display_name} [{self.address}]"


class H5075HistorySyncState(models.Model):
    job_name = models.CharField(max_length=64, unique=True)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=16, default="never")
    last_error = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["job_name"]

    def __str__(self) -> str:
        return f"{self.job_name} ({self.last_status})"
