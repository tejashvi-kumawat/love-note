"""
Notification utility functions for sending push notifications
"""
from django.conf import settings
from .models import PushSubscription, UserProfile
import json
import logging
import base64

logger = logging.getLogger(__name__)

try:
    from pywebpush import webpush, WebPushException
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.backends import default_backend
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    logger.warning('pywebpush not installed. Web Push notifications will not work.')


def _convert_vapid_private_key(base64url_key):
    """
    Convert VAPID private key from base64url string to PEM format
    that pywebpush can use
    """
    try:
        # Add padding if needed
        padding_length = (4 - len(base64url_key) % 4) % 4
        padding = '=' * padding_length
        base64_key = (base64url_key + padding).replace('-', '+').replace('_', '/')
        
        # Decode base64 to get raw 32-byte private key
        private_key_bytes = base64.b64decode(base64_key)
        
        # Convert to integer (private scalar)
        private_key_int = int.from_bytes(private_key_bytes, 'big')
        
        # Create EC private key using SECP256R1 curve
        curve = ec.SECP256R1()
        backend = default_backend()
        
        # Create private key using derive_private_key
        # This is the correct way to create a private key from raw integer
        private_key = ec.derive_private_key(private_key_int, curve, backend)
        
        # Serialize to PEM format (what pywebpush expects)
        pem_key = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        return pem_key.decode('utf-8')
    except Exception as e:
        logger.error(f'Error converting VAPID private key: {e}', exc_info=True)
        raise


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
        
        # Convert VAPID private key from base64url to PEM format
        vapid_private_key_pem = _convert_vapid_private_key(settings.VAPID_PRIVATE_KEY)
        
        # Create notification payload
        # For Safari/Chrome compatibility, we send the payload as JSON string
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
        
        # Send push notification
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=vapid_private_key_pem,
            vapid_claims=vapid_claims,
            ttl=86400  # 24 hours TTL for push notifications
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
        logger.error(f'Error sending push notification: {e}', exc_info=True)
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
        
        # Send push notification to all subscriptions if they exist
        if subscriptions.exists():
            data = {}
            if note_id:
                data['note_id'] = note_id
            if journal_date:
                data['journal_date'] = journal_date
            
            sent_count = 0
            for subscription in subscriptions:
                if send_push_notification(subscription, title, body, data):
                    sent_count += 1
            
            logger.info(f'Notification "{title}" sent to {sent_count}/{subscriptions.count()} subscriptions for {user.partner.username}')
        else:
            logger.warning(f'No push subscriptions found for {user.partner.username}. Notification "{title}" not sent.')
        
    except Exception as e:
        logger.error(f'Error sending notification to partner: {e}', exc_info=True)

