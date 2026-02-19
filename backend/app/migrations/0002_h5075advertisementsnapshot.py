from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="H5075AdvertisementSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("address", models.CharField(db_index=True, max_length=17)),
                ("name", models.CharField(blank=True, max_length=128)),
                ("manufacturer_id", models.PositiveIntegerField()),
                ("payload_hex", models.CharField(max_length=64)),
                ("service_uuids", models.JSONField(blank=True, default=list)),
                ("temperature_c", models.DecimalField(decimal_places=2, max_digits=5)),
                ("humidity_pct", models.DecimalField(decimal_places=2, max_digits=5)),
                ("battery_pct", models.PositiveSmallIntegerField()),
                ("error", models.BooleanField(default=False)),
                ("rssi", models.SmallIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="h5075advertisementsnapshot",
            constraint=models.UniqueConstraint(
                fields=("address", "manufacturer_id", "payload_hex"),
                name="uniq_h5075_snapshot_payload",
            ),
        ),
    ]
