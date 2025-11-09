#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push API
Run this once to generate keys, then add them to settings.py
"""
from py_vapid import Vapid01
import base64
import json

# Generate new VAPID keys
vapid = Vapid01()
vapid.generate_keys()

# Get public and private keys
public_key = vapid.public_key.public_bytes_raw
private_key = vapid.private_key.private_bytes_raw

# Encode to base64url (Web Push format)
public_key_b64 = base64.urlsafe_b64encode(public_key).decode('utf-8').rstrip('=')
private_key_b64 = base64.urlsafe_b64encode(private_key).decode('utf-8').rstrip('=')

print("=" * 60)
print("VAPID Keys Generated Successfully!")
print("=" * 60)
print(f"\nPublic Key (VAPID_PUBLIC_KEY):")
print(public_key_b64)
print(f"\nPrivate Key (VAPID_PRIVATE_KEY):")
print(private_key_b64)
print("\n" + "=" * 60)
print("Add these to your settings.py or environment variables:")
print("VAPID_PUBLIC_KEY=" + public_key_b64)
print("VAPID_PRIVATE_KEY=" + private_key_b64)
print("=" * 60)

