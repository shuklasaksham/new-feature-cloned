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


def _thanks_html(name: str, project_name: str) -> str:
    display_name = (name or "").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
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
                  &#123; bracket &middot; project started &#125;
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <h1 style="margin:0;font-size:36px;line-height:1.05;font-weight:900;letter-spacing:-0.02em;color:#0A0A0A;">
                  Thanks for trying<br/>
                  <span style="color:#0033FF;">Bracket.</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#0A0A0A;">
                  Hi {display_name} &mdash; you just kicked off a new Bracket project: <strong>{pname}</strong>.
                </p>
                <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#0A0A0A;">
                  Move through the five steps at your own pace. When you lock the decision, you'll have scope, a client message, assumptions, and risk flags ready to send.
                </p>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#0A0A0A;">
                  It's free during early access. No account needed. We're a one-line reply away if anything feels off.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#525252;border-top:1px solid #D4D4D0;padding-top:20px;">
                  Bracket &middot; Decisions for designers
                </p>
                <p style="margin:8px 0 0 0;font-size:13px;color:#525252;">
                  If this wasn't you, ignore this email &mdash; we won't follow up.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _thanks_text(name: str, project_name: str) -> str:
    display_name = (name or "").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
    return (
        f"Hi {display_name},\n\n"
        f"Thanks for trying Bracket. You just kicked off a new project: {pname}.\n\n"
        "Move through the five steps at your own pace. When you lock the decision, "
        "you'll have scope, a client message, assumptions, and risk flags ready to send.\n\n"
        "It's free during early access. No account needed.\n\n"
        "— Bracket\n"
        "Decisions for designers"
    )


async def send_thanks_email(to_email: str, name: str, project_name: str) -> bool:
    """Fire-and-forget thanks email. Returns True on success, False on failure
    (never raises — project creation must not fail because email failed)."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping thanks email")
        return False
    resend.api_key = api_key
    params = {
        "from": _sender(),
        "to": [to_email],
        "subject": "Thanks for trying Bracket.",
        "html": _thanks_html(name, project_name),
        "text": _thanks_text(name, project_name),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"thanks email sent to {to_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"thanks email failed for {to_email}: {e}")
        return False


# --- REVIEW OUTCOME EMAIL --------------------------------------------------
def _review_outcome_html(
    owner_name: str,
    project_name: str,
    review: dict,
    document_url: str,
) -> str:
    is_accept = review.get("type") == "accept"
    display_name = (owner_name or "").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
    signer = (review.get("signature_name") or "Your client").strip()
    role = (review.get("role") or "").strip()
    signer_line = f"{signer}{', ' + role if role else ''}"

    headline = (
        "Your client signed it off."
        if is_accept
        else "Your client raised concerns."
    )
    accent = "#0033FF" if is_accept else "#D02620"
    chip_label = "ACCEPTED" if is_accept else "CONCERNS RAISED"

    body_blocks = []
    if is_accept:
        count = review.get("accepted_count", 0)
        total = review.get("total_items", 0)
        body_blocks.append(
            f"<p style='margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#0A0A0A;'>"
            f"<strong>{signer_line}</strong> checked off "
            f"<strong>{count}/{total}</strong> items and signed the document for "
            f"<strong>{pname}</strong>. Go do the work."
            f"</p>"
        )
    else:
        concerns = (review.get("concerns") or "").strip()
        body_blocks.append(
            f"<p style='margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#0A0A0A;'>"
            f"<strong>{signer_line}</strong> sent back concerns on <strong>{pname}</strong>. "
            f"Bracket has already drafted three suggestions you can use to respond."
            f"</p>"
        )
        if concerns:
            safe = concerns.replace("<", "&lt;").replace(">", "&gt;")
            body_blocks.append(
                f"<div style='margin:14px 0;padding:14px;border-left:3px solid #0A0A0A;background:#F4F4F0;"
                f"font-size:14px;line-height:1.55;color:#525252;white-space:pre-wrap;'>"
                f"{safe}</div>"
            )

    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#F4F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0A0A0A;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F0;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #0A0A0A;">
<tr><td style="padding:32px 32px 0 32px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{accent};">
    {{ bracket &middot; {chip_label.lower()} }}
  </p>
</td></tr>
<tr><td style="padding:20px 32px 0 32px;">
  <h1 style="margin:0;font-size:30px;line-height:1.1;font-weight:900;letter-spacing:-0.02em;color:#0A0A0A;">
    Hi {display_name} &mdash;<br/>
    <span style="color:{accent};">{headline}</span>
  </h1>
</td></tr>
<tr><td style="padding:20px 32px 0 32px;">
  {''.join(body_blocks)}
  <p style="margin:0 0 18px 0;font-size:16px;line-height:1.6;color:#0A0A0A;">
    Open the document in Bracket to see the full response and (if relevant) the AI-drafted suggestions.
  </p>
  <a href="{document_url}" style="display:inline-block;padding:14px 22px;background:#0A0A0A;color:#ffffff;text-decoration:none;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;border:1px solid #0A0A0A;">
    Open the document &rarr;
  </a>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#525252;border-top:1px solid #D4D4D0;padding-top:20px;">
    Bracket &middot; Decisions for designers
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def _review_outcome_text(
    owner_name: str,
    project_name: str,
    review: dict,
    document_url: str,
) -> str:
    is_accept = review.get("type") == "accept"
    display_name = (owner_name or "").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
    signer = (review.get("signature_name") or "Your client").strip()
    role = (review.get("role") or "").strip()
    signer_line = f"{signer}{(', ' + role) if role else ''}"
    if is_accept:
        count = review.get("accepted_count", 0)
        total = review.get("total_items", 0)
        return (
            f"Hi {display_name},\n\n"
            f"{signer_line} just signed off on {pname}. They checked {count}/{total} items.\n\n"
            f"Open the document: {document_url}\n\n"
            "— Bracket\nDecisions for designers"
        )
    return (
        f"Hi {display_name},\n\n"
        f"{signer_line} raised concerns on {pname}. Bracket already drafted three suggestions you can use to respond.\n\n"
        f"Concerns:\n{(review.get('concerns') or '').strip()}\n\n"
        f"Open the document: {document_url}\n\n"
        "— Bracket\nDecisions for designers"
    )


async def send_review_outcome_email(
    owner_email: str,
    owner_name: str,
    project_name: str,
    project_id: str,
    review: dict,
    public_base_url: str = "",
) -> bool:
    """Notify the project owner when a client accepts or rejects their document.
    Fire-and-forget — never raises."""
    if not owner_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping review-outcome email")
        return False
    resend.api_key = api_key
    base = (public_base_url or os.environ.get("PUBLIC_BASE_URL", "https://use-bracket.com")).rstrip("/")
    document_url = f"{base}/project/{project_id}/document"
    is_accept = review.get("type") == "accept"
    subject = (
        f"Signed: {project_name} — client accepted"
        if is_accept
        else f"Concerns raised on {project_name}"
    )
    params = {
        "from": _sender(),
        "to": [owner_email],
        "subject": subject,
        "html": _review_outcome_html(owner_name, project_name, review, document_url),
        "text": _review_outcome_text(owner_name, project_name, review, document_url),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(
            f"review-outcome email sent to {owner_email}: "
            f"{result.get('id') if isinstance(result, dict) else result}"
        )
        return True
    except Exception as e:
        logger.exception(f"review-outcome email failed for {owner_email}: {e}")
        return False
