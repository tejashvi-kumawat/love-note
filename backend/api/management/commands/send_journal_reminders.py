"""
Management command to send journal reminder notifications
Run this via cron job every minute: python manage.py send_journal_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import UserProfile, PushSubscription
from api.notification_utils import send_push_notification
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send journal reminder notifications to users whose reminder time matches current time'

    def handle(self, *args, **options):
        now = timezone.now()
        current_time = now.time()
        
        # Get all users who have journal reminders enabled
        profiles = UserProfile.objects.filter(
            notifications_enabled=True,
            notify_journal_reminder=True
        )
        
        sent_count = 0
        skipped_count = 0
        
        for profile in profiles:
            # Check if reminder time matches current time (within 1 minute window)
            reminder_time = profile.journal_reminder_time
            time_diff = abs(
                (current_time.hour * 60 + current_time.minute) - 
                (reminder_time.hour * 60 + reminder_time.minute)
            )
            
            # Send reminder if time matches (within 1 minute window)
            if time_diff <= 1:
                # Get user's push subscriptions
                subscriptions = PushSubscription.objects.filter(user=profile.user)
                
                if subscriptions.exists():
                    title = '📔 Time to Write Your Journal'
                    body = "Don't forget to add today's journal entry! 💕"
                    
                    for subscription in subscriptions:
                        if send_push_notification(
                            subscription,
                            title,
                            body,
                            data={'reminder_type': 'journal'},
                            notification_type='journal_reminder'
                        ):
                            sent_count += 1
                            logger.info(f'Journal reminder sent to {profile.user.username}')
                else:
                    skipped_count += 1
                    logger.debug(f'No push subscriptions for {profile.user.username}, skipping reminder')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Journal reminders: {sent_count} sent, {skipped_count} skipped (no subscriptions)'
            )
        )

