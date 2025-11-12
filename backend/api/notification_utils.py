"""
Notification utility functions for sending push notifications
"""
from django.conf import settings
from .models import PushSubscription, UserProfile
import json
import logging
import base64

logger = logging.getLogger(__name__)

# Fix for pywebpush 1.14.0 bug with cryptography >=43.0.0
# The bug is in pywebpush/__init__.py line 203: ec.generate_private_key(ec.SECP256R1, ...)
# Should be: ec.generate_private_key(ec.SECP256R1(), ...)
# We'll monkey patch the problematic function
try:
    import pywebpush
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.backends import default_backend
    
    # Monkey patch the buggy line in pywebpush
    # The bug is in WebPusher.encode() method
    if hasattr(pywebpush, 'WebPusher'):
        WebPusher = pywebpush.WebPusher
        original_encode = WebPusher.encode
        
        def patched_encode(self, data, content_encoding='aesgcm'):
            """Patched encode method to fix ec.SECP256R1 bug"""
            # Import the modules needed
            from cryptography.hazmat.primitives.asymmetric import ec as ec_module
            from cryptography.hazmat.backends import default_backend as backend_module
            
            # Monkey patch ec.generate_private_key to fix the bug
            original_generate = ec_module.generate_private_key
            
            def fixed_generate_private_key(curve, backend=None):
                # If curve is a class instead of instance, instantiate it
                if isinstance(curve, type):
                    curve = curve()
                return original_generate(curve, backend)
            
            # Temporarily replace the function
            ec_module.generate_private_key = fixed_generate_private_key
            
            try:
                result = original_encode(self, data, content_encoding)
                return result
            finally:
                # Restore original function
                ec_module.generate_private_key = original_generate
        
        # Replace the encode method
        WebPusher.encode = patched_encode
except Exception as e:
    # If patching fails, log and continue
    logger.warning(f'Could not patch pywebpush: {e}')

try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    logger.warning('pywebpush not installed. Web Push notifications will not work.')

try:
    from py_vapid import Vapid
    VAPID_AVAILABLE = True
except ImportError:
    VAPID_AVAILABLE = False
    Vapid = None
    logger.warning('py-vapid not installed. VAPID key handling may not work correctly.')


def _get_vapid_object():
    """
    Create Vapid object from VAPID keys for pywebpush
    pywebpush can accept Vapid object directly
    """
    if not VAPID_AVAILABLE or Vapid is None:
        raise ImportError('py-vapid not available. Install it with: pip install py-vapid')
    
    try:
        # py-vapid's from_string() only needs private_key
        # Public key is derived from private key automatically
        vapid = Vapid.from_string(private_key=settings.VAPID_PRIVATE_KEY)
        return vapid
    except Exception as e:
        logger.error(f'Error creating Vapid object: {e}', exc_info=True)
        raise


def send_push_notification(subscription, title, body, data=None, notification_type=None):
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
        
        # Create notification payload
        # For Safari/Chrome compatibility, we send the payload as JSON string
        # Use unique tag per notification to allow multiple consecutive notifications
        note_id_from_data = data.get('note_id') if data else None
        tag_suffix = f"-{note_id_from_data}-{subscription.id}" if note_id_from_data else f"-{subscription.id}"
        tag = f"love-notes-{notification_type or 'default'}{tag_suffix}"
        payload = {
            "title": title,
            "body": body,
            "icon": "/icon-192.svg",
            "badge": "/icon-192.svg",
            "tag": tag,
            "requireInteraction": False,
        }
        
        if data:
            payload["data"] = data
        
        # Send push notification
        # Try passing private key as string first (base64url format)
        # pywebpush should handle base64url format directly
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims=vapid_claims,
            ttl=86400  # 24 hours TTL for push notifications
        )
        
        endpoint_type = 'Apple' if 'apple.com' in subscription.endpoint else 'Google' if 'googleapis.com' in subscription.endpoint else 'Other'
        logger.info(f'Push notification sent successfully to {endpoint_type} endpoint for {subscription.user.username}: {subscription.endpoint[:50]}...')
        return True
        
    except WebPushException as e:
        logger.error(f'Web Push error: {e}')
        # If subscription is invalid, delete it
        if e.response and e.response.status_code == 410:
            logger.info(f'Deleting invalid subscription for {subscription.user.username}')
            subscription.delete()
        return False
    except Exception as e:
        endpoint_type = 'Apple' if 'apple.com' in subscription.endpoint else 'Google' if 'googleapis.com' in subscription.endpoint else 'Other'
        logger.error(f'Error sending push notification to {endpoint_type} endpoint ({subscription.endpoint[:50]}...): {e}', exc_info=True)
        return False


def send_notification_to_partner(user, notification_type, title, body, note_id=None, journal_date=None, recipient_user=None):
    """
    Send notification to user's partner if they have notifications enabled
    
    Args:
        user: User who triggered the notification (author) - used to find partner
        notification_type: Type of notification ('note_created', 'note_updated', 'note_liked', 'journal_created', 'journal_updated')
        title: Notification title
        body: Notification body
        note_id: Optional note ID
        journal_date: Optional journal date
        recipient_user: Optional - if provided, send to this user instead of user.partner
                       Used for like notifications where we want to notify note author
    """
    # If recipient_user is provided, use it; otherwise use user.partner
    target_user = recipient_user if recipient_user else user.partner
    
    if not target_user:
        logger.warning(f'No target user found for notification "{title}" from {user.username}')
        return
    
    try:
        partner_profile = UserProfile.objects.filter(user=target_user).first()
        if not partner_profile:
            logger.warning(f'No profile found for target user {target_user.username} for notification "{title}"')
            return
        if not partner_profile.notifications_enabled:
            logger.info(f'Notifications disabled for {target_user.username}, skipping notification "{title}"')
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
        
        logger.info(f'Notification check for {target_user.username}: type={notification_type}, enabled={notification_enabled}, notify_note_liked={partner_profile.notify_note_liked}')
        
        if not notification_enabled:
            logger.info(f'Notification type {notification_type} disabled for {target_user.username}, skipping')
            return
        
        # Get target user's push subscriptions
        subscriptions = PushSubscription.objects.filter(user=target_user)
        
        # Log for debugging - show all subscriptions
        logger.info(f'Sending notification "{title}" to {target_user.username} (triggered by {user.username}), found {subscriptions.count()} subscriptions')
        
        # Log each subscription endpoint for debugging
        for idx, sub in enumerate(subscriptions, 1):
            endpoint_type = 'Apple' if 'apple.com' in sub.endpoint else 'Google' if 'googleapis.com' in sub.endpoint else 'Other'
            logger.info(f'  Subscription {idx}: {endpoint_type} - {sub.endpoint[:60]}...')
        
        # Send push notification to all subscriptions if they exist
        if subscriptions.exists():
            data = {}
            if note_id:
                data['note_id'] = note_id
            if journal_date:
                data['journal_date'] = journal_date
            
            sent_count = 0
            failed_count = 0
            for idx, subscription in enumerate(subscriptions, 1):
                endpoint_type = 'Apple' if 'apple.com' in subscription.endpoint else 'Google' if 'googleapis.com' in subscription.endpoint else 'Other'
                logger.info(f'  Attempting to send to subscription {idx} ({endpoint_type})...')
                
                if send_push_notification(subscription, title, body, data, notification_type=notification_type):
                    sent_count += 1
                    logger.info(f'  ✅ Successfully sent to subscription {idx} ({endpoint_type})')
                else:
                    failed_count += 1
                    logger.warning(f'  ❌ Failed to send to subscription {idx} ({endpoint_type})')
            
            logger.info(f'Notification "{title}" sent to {sent_count}/{subscriptions.count()} subscriptions for {target_user.username} (failed: {failed_count})')
        else:
            logger.warning(f'No push subscriptions found for {target_user.username}. Notification "{title}" not sent.')
        
    except Exception as e:
        logger.error(f'Error sending notification to partner: {e}', exc_info=True)

