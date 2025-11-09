"""
Notification utility functions for sending push notifications
"""
from django.conf import settings
from .models import PushSubscription, UserProfile
import json
import logging

logger = logging.getLogger(__name__)

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    logger.warning('pywebpush not installed. Web Push notifications will not work.')


def send_push_notification(subscription, title, body, data=None):
    """
    Send a push notification using Web Push API
    
    Args:
        subscription: PushSubscription object
        title: Notification title
        body: Notification body
        data: Optional data payload
    """
    if not WEBPUSH_AVAILABLE:
        logger.warning('Web Push not available - pywebpush not installed')
        return False
    
    if not settings.VAPID_PUBLIC_KEY or not settings.VAPID_PRIVATE_KEY:
        logger.warning('VAPID keys not configured')
        return False
    
    try:
        subscription_info = {
            "endpoint": subscription.endpoint,
            "keys": {
                "p256dh": subscription.p256dh,
                "auth": subscription.auth
            }
        }
        
        vapid_claims = {
            "sub": settings.VAPID_CLAIM_EMAIL
        }
        
        payload = {
            "title": title,
            "body": body,
            "icon": "/icon-192.svg",
            "badge": "/icon-192.svg",
            "tag": "love-notes",
            "requireInteraction": False,
        }
        
        if data:
            payload["data"] = data
        
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims=vapid_claims
        )
        
        logger.info(f'Push notification sent successfully to {subscription.user.username}')
        return True
        
    except WebPushException as e:
        logger.error(f'Web Push error: {e}')
        # If subscription is invalid, delete it
        if e.response and e.response.status_code == 410:
            logger.info(f'Deleting invalid subscription for {subscription.user.username}')
            subscription.delete()
        return False
    except Exception as e:
        logger.error(f'Error sending push notification: {e}')
        return False


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
            'note_deletion_requested': partner_profile.notify_note_deletion_requested,
            'journal_created': partner_profile.notify_journal_created,
            'journal_updated': partner_profile.notify_journal_updated,
            'journal_deletion_requested': partner_profile.notify_journal_deletion_requested,
        }.get(notification_type, True)
        
        if not notification_enabled:
            return
        
        # Get partner's push subscriptions
        subscriptions = PushSubscription.objects.filter(user=user.partner)
        
        if subscriptions.exists():
            # Send push notification to all subscriptions
            data = {}
            if note_id:
                data['note_id'] = note_id
            if journal_date:
                data['journal_date'] = journal_date
            
            for subscription in subscriptions:
                send_push_notification(subscription, title, body, data)
        
    except Exception as e:
        logger.error(f'Error sending notification to partner: {e}')

