# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_pushsubscription'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='notify_note_deletion_requested',
            field=models.BooleanField(default=True, help_text='Notify when partner requests to delete a note'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_journal_deletion_requested',
            field=models.BooleanField(default=True, help_text='Notify when partner requests to delete a journal entry'),
        ),
    ]

