"""
Notification utility functions for sending push notifications
"""
from .models import PushSubscription, UserProfile
import json
import logging

logger = logging.getLogger(__name__)


def send_notification_to_partner(user, notification_type, title, body, note_id=None, journal_date=None):
    """
    Send notification to user's partner if they have notifications enabled
    
    Args:
        user: User who triggered the notification (author)
        notification_type: Type of notification ('note_created', 'note_updated', 'note_liked', 'journal_created', 'journal_updated')
        title: Notification title
        body: Notification body
        note_id: Optional note ID
        journal_date: Optional journal date
    """
    if not user.partner:
        return
    
    try:
        partner_profile = UserProfile.objects.filter(user=user.partner).first()
        if not partner_profile or not partner_profile.notifications_enabled:
            return
        
        # Check if this notification type is enabled
        notification_enabled = {
            'note_created': partner_profile.notify_note_created,
            'note_updated': partner_profile.notify_note_updated,
            'note_liked': partner_profile.notify_note_liked,
            'journal_created': partner_profile.notify_journal_created,
            'journal_updated': partner_profile.notify_journal_updated,
        }.get(notification_type, True)
        
        if not notification_enabled:
            return
        
        # Get partner's push subscriptions
        subscriptions = PushSubscription.objects.filter(user=user.partner)
        
        if subscriptions.exists():
            # Send push notification via Web Push API
            # This will be implemented when Web Push is fully set up
            logger.info(f'Would send push notification to {user.partner.username}: {title}')
            # TODO: Implement Web Push API sending here
        
    except Exception as e:
        logger.error(f'Error sending notification to partner: {e}')

