"""Email utilities for Bracket. Uses Resend."""
import os
import asyncio
import logging
import resend

logger = logging.getLogger("bracket.email")


def _sender() -> str:
    name = os.environ.get("SENDER_NAME", "Bracket").strip()
    email = os.environ.get("SENDER_EMAIL", "").strip()
    if not email:
        return "Bracket <onboarding@resend.dev>"
    return f"{name} <{email}>" if name else email


def _waitlist_html(name: str, position: int) -> str:
    display_name = (name or "").strip() or "there"
    pos = str(position).zfill(4)
    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F4F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0A0A0A;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F0;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #0A0A0A;">
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#525252;">
                  &#123; bracket &middot; rsvp received &#125;
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <h1 style="margin:0;font-size:36px;line-height:1.05;font-weight:900;letter-spacing:-0.02em;color:#0A0A0A;">
                  Hi {display_name}.<br/>
                  <span style="color:#0033FF;">You're in.</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#0A0A0A;">
                  Thanks for reserving a seat in the first Bracket cohort. We're building this quietly with a small group of designers &mdash; no launch confetti, no feature list, no fake scarcity.
                </p>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#0A0A0A;">
                  When the first version opens, you'll hear from this email before anyone else. Founder pricing, dedicated feedback loop, and a direct line to the team &mdash; that's the whole deal.
                </p>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#0A0A0A;">
                  Until then: no follow-ups, no spam. Just one email when the door opens.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #0A0A0A;">
                  <tr>
                    <td style="padding:12px 18px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#525252;border-right:1px solid #0A0A0A;">POSITION</td>
                    <td style="padding:12px 18px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:14px;color:#0033FF;font-weight:700;">#{pos}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#525252;border-top:1px solid #D4D4D0;padding-top:20px;">
                  Bracket &middot; Decisions for designers
                </p>
                <p style="margin:8px 0 0 0;font-size:13px;color:#525252;">
                  If this wasn't you, just ignore this email &mdash; you won't hear from us again.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _waitlist_text(name: str, position: int) -> str:
    display_name = (name or "").strip() or "there"
    return (
        f"Hi {display_name}.\n\n"
        "You're in.\n\n"
        "Thanks for reserving a seat in the first Bracket cohort. "
        "We're building this quietly with a small group of designers — no launch confetti, no feature list, no fake scarcity.\n\n"
        "When the first version opens, you'll hear from this email before anyone else. "
        "Founder pricing, dedicated feedback loop, and a direct line to the team.\n\n"
        f"Your position: #{str(position).zfill(4)}\n\n"
        "Until then: no follow-ups, no spam. Just one email when the door opens.\n\n"
        "— Bracket\n"
        "Decisions for designers"
    )


async def send_waitlist_welcome(to_email: str, name: str, position: int) -> bool:
    """Fire-and-forget welcome email. Returns True on success, False on failure
    (never raises — waitlist signup must not fail because email failed)."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping waitlist email")
        return False
    resend.api_key = api_key
    params = {
        "from": _sender(),
        "to": [to_email],
        "subject": "You're in. Bracket — first cohort.",
        "html": _waitlist_html(name, position),
        "text": _waitlist_text(name, position),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"waitlist email sent to {to_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"waitlist email failed for {to_email}: {e}")
        return False
