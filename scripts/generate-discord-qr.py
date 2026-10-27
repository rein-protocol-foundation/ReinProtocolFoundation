"""Regenerate the shared Discord QR PNG with qrcode[pil]==8.2 (build-time only)."""

import json
from pathlib import Path

import qrcode

root = Path(__file__).resolve().parent.parent
config = json.loads((root / "lib/community-invites.json").read_text())
qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=4)
qr.add_data(config["discordInviteUrl"])
qr.make(fit=True)
destination = root / "public" / config["discordQrCodePath"].lstrip("/")
qr.make_image(fill_color="black", back_color="white").convert("RGB").save(destination)
print(f"Generated {destination.relative_to(root)}")
