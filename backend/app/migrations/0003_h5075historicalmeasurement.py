from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0002_h5075advertisementsnapshot"),
    ]

    operations = [
        migrations.CreateModel(
            name="H5075HistoricalMeasurement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("address", models.CharField(db_index=True, max_length=17)),
                ("name", models.CharField(blank=True, max_length=128)),
                ("measured_at", models.DateTimeField(db_index=True)),
                ("temperature_c", models.DecimalField(decimal_places=2, max_digits=5)),
                ("humidity_pct", models.DecimalField(decimal_places=2, max_digits=5)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={"ordering": ["-measured_at"]},
        ),
        migrations.AddConstraint(
            model_name="h5075historicalmeasurement",
            constraint=models.UniqueConstraint(
                fields=("address", "measured_at"),
                name="uniq_h5075_history_address_timestamp",
            ),
        ),
    ]
