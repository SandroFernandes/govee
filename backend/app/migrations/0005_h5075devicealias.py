from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0004_h5075historysyncstate"),
    ]

    operations = [
        migrations.CreateModel(
            name="H5075DeviceAlias",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("address", models.CharField(max_length=17, unique=True)),
                ("alias", models.CharField(max_length=128)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["alias", "address"],
            },
        ),
    ]
