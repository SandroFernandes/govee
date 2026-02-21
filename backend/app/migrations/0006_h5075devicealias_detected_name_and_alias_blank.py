from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0005_h5075devicealias"),
    ]

    operations = [
        migrations.AddField(
            model_name="h5075devicealias",
            name="detected_name",
            field=models.CharField(blank=True, max_length=128),
        ),
        migrations.AlterField(
            model_name="h5075devicealias",
            name="alias",
            field=models.CharField(blank=True, max_length=128),
        ),
    ]
