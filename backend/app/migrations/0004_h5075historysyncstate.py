from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0003_h5075historicalmeasurement"),
    ]

    operations = [
        migrations.CreateModel(
            name="H5075HistorySyncState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("job_name", models.CharField(max_length=64, unique=True)),
                ("last_attempt_at", models.DateTimeField(blank=True, null=True)),
                ("last_success_at", models.DateTimeField(blank=True, null=True)),
                ("last_status", models.CharField(default="never", max_length=16)),
                ("last_error", models.TextField(blank=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["job_name"],
            },
        ),
    ]
