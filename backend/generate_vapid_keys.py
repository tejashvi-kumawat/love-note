#!/usr/bin/env python3
"""
Generate VAPID keys for Web Push API
Run this once to generate keys, then add them to settings.py
"""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

# Generate new VAPID keys using cryptography library directly
# Use SECP256R1 curve (same as P-256)
curve = ec.SECP256R1()
private_key = ec.generate_private_key(curve)
public_key = private_key.public_key()

# Get public key in raw format (uncompressed point)
public_key_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

# Remove the first byte (0x04) which indicates uncompressed format
# VAPID public key is 65 bytes (0x04 + 64 bytes), we need 64 bytes
public_key_raw = public_key_bytes[1:]

# Get private key numbers and extract raw 32-byte value
private_numbers = private_key.private_numbers()
private_key_raw = private_numbers.private_value.to_bytes(32, 'big')

# Encode to base64url (Web Push format) - remove padding
public_key_b64 = base64.urlsafe_b64encode(public_key_raw).decode('utf-8').rstrip('=')
private_key_b64 = base64.urlsafe_b64encode(private_key_raw).decode('utf-8').rstrip('=')

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

