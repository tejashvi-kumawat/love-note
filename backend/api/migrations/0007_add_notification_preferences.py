# Generated migration for notification preferences

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_notelike'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='notifications_enabled',
            field=models.BooleanField(default=False, help_text='Enable browser notifications'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_note_created',
            field=models.BooleanField(default=True, help_text='Notify when partner creates a note'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_note_updated',
            field=models.BooleanField(default=True, help_text='Notify when partner updates a note'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_note_liked',
            field=models.BooleanField(default=True, help_text='Notify when partner likes a note'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_journal_created',
            field=models.BooleanField(default=True, help_text='Notify when partner creates a journal entry'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_journal_updated',
            field=models.BooleanField(default=True, help_text='Notify when partner updates a journal entry'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='notify_journal_reminder',
            field=models.BooleanField(default=True, help_text='Enable nightly journal reminder notifications'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='journal_reminder_time',
            field=models.TimeField(default='21:00:00', help_text='Time for nightly journal reminder (24-hour format)'),
        ),
    ]

