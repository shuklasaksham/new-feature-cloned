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
  <body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
      <tr>
        <td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
            <tr>
              <td style="padding:32px 36px 0 36px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5E6AD2;">
                  &lt; bracket &middot; project started &gt;
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 0 36px;">
                <h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">
                  Thanks for trying<br/>
                  <span style="color:#5E6AD2;">Bracket.</span>
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 36px 0 36px;">
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">
                  Hi {display_name} &mdash; you just kicked off a new Bracket project: <strong style="color:#F4F5F7;">{pname}</strong>.
                </p>
                <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">
                  Move through the five steps at your own pace. When you lock the decision, you'll have scope, a client message, assumptions, and risk flags ready to send.
                </p>
                <p style="margin:0;font-size:15px;line-height:1.65;color:#B9BFC9;">
                  It's free during early access. No account needed. We're a one-line reply away if anything feels off.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 36px 28px 36px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">
                  Bracket &middot; The AI decision workspace for client projects
                </p>
                <p style="margin:8px 0 0 0;font-size:12.5px;color:#6E7480;">
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
        "The AI decision workspace for client projects"
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
    accent = "#22C55E" if is_accept else "#EF4444"
    chip_label = "ACCEPTED" if is_accept else "CONCERNS RAISED"

    body_blocks = []
    if is_accept:
        count = review.get("accepted_count", 0)
        total = review.get("total_items", 0)
        body_blocks.append(
            f"<p style='margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;'>"
            f"<strong style='color:#F4F5F7;'>{signer_line}</strong> checked off "
            f"<strong style='color:#F4F5F7;'>{count}/{total}</strong> items and signed the document for "
            f"<strong style='color:#F4F5F7;'>{pname}</strong>. Go do the work."
            f"</p>"
        )
    else:
        concerns = (review.get("concerns") or "").strip()
        body_blocks.append(
            f"<p style='margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;'>"
            f"<strong style='color:#F4F5F7;'>{signer_line}</strong> sent back concerns on <strong style='color:#F4F5F7;'>{pname}</strong>. "
            f"Bracket has already drafted three suggestions you can use to respond."
            f"</p>"
        )
        if concerns:
            safe = concerns.replace("<", "&lt;").replace(">", "&gt;")
            body_blocks.append(
                f"<div style='margin:14px 0;padding:14px 16px;border-left:3px solid {accent};background:#16181D;"
                f"border-radius:0 10px 10px 0;font-size:13.5px;line-height:1.6;color:#B9BFC9;white-space:pre-wrap;'>"
                f"{safe}</div>"
            )

    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{accent};">
    &lt; bracket &middot; {chip_label.lower()} &gt;
  </p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">
    Hi {display_name} &mdash;<br/>
    <span style="color:{accent};">{headline}</span>
  </h1>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  {''.join(body_blocks)}
  <p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">
    Open the document in Bracket to see the full response and (if relevant) the AI-drafted suggestions.
  </p>
  <a href="{document_url}" style="display:inline-block;padding:13px 24px;background:#5E6AD2;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:600;letter-spacing:0.01em;border-radius:10px;">
    Open the document &rarr;
  </a>
</td></tr>
<tr><td style="padding:30px 36px 28px 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">
    Bracket &middot; The AI decision workspace for client projects
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
            "— Bracket\nThe AI decision workspace for client projects"
        )
    return (
        f"Hi {display_name},\n\n"
        f"{signer_line} raised concerns on {pname}. Bracket already drafted three suggestions you can use to respond.\n\n"
        f"Concerns:\n{(review.get('concerns') or '').strip()}\n\n"
        f"Open the document: {document_url}\n\n"
        "— Bracket\nThe AI decision workspace for client projects"
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


# --- CLIENT RECEIPT EMAIL --------------------------------------------------
def _client_receipt_html(project_name: str, review: dict, share_url: str) -> str:
    is_accept = review.get("type") == "accept"
    pname = (project_name or "the project").strip() or "the project"
    signer = (review.get("signature_name") or "there").strip()
    role = (review.get("role") or "").strip()
    signer_line = f"{signer}{', ' + role if role else ''}"
    accent = "#22C55E" if is_accept else "#EF4444"
    chip = "SIGN-OFF CONFIRMED" if is_accept else "CONCERNS RECEIVED"
    headline = (
        "You signed the sign-off." if is_accept else "We received your concerns."
    )
    if is_accept:
        count = review.get("accepted_count", 0)
        total = review.get("total_items", 0)
        body_block = (
            f"<p style='margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;'>"
            f"Hi {signer_line} — you signed off on <strong style='color:#F4F5F7;'>{pname}</strong> "
            f"and confirmed <strong style='color:#F4F5F7;'>{count}/{total}</strong> items. We've attached "
            f"the signed PDF for your records."
            f"</p>"
            f"<p style='margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;'>"
            f"The project owner has also been notified — expect their next update soon."
            f"</p>"
        )
    else:
        concerns = (review.get("concerns") or "").strip()
        safe = concerns.replace("<", "&lt;").replace(">", "&gt;")
        body_block = (
            f"<p style='margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;'>"
            f"Hi {signer_line} — thanks for taking the time on <strong style='color:#F4F5F7;'>{pname}</strong>. "
            f"Here's a copy of what you sent back so you have it on record:"
            f"</p>"
            f"<div style='margin:14px 0;padding:14px 16px;border-left:3px solid {accent};background:#16181D;"
            f"border-radius:0 10px 10px 0;font-size:13.5px;line-height:1.6;color:#B9BFC9;white-space:pre-wrap;'>"
            f"{safe}</div>"
            f"<p style='margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;'>"
            f"The project owner has been notified and will respond via the same review link."
            f"</p>"
        )
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{accent};">
    &lt; bracket &middot; {chip.lower()} &gt;
  </p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:{accent};">
    {headline}
  </h1>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  {body_block}
  <a href="{share_url}" style="display:inline-block;padding:13px 24px;background:#5E6AD2;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:600;letter-spacing:0.01em;border-radius:10px;">
    View the document &rarr;
  </a>
</td></tr>
<tr><td style="padding:30px 36px 28px 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">
    Bracket &middot; The AI decision workspace for client projects
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def _client_receipt_text(project_name: str, review: dict, share_url: str) -> str:
    is_accept = review.get("type") == "accept"
    pname = (project_name or "the project").strip() or "the project"
    signer = (review.get("signature_name") or "there").strip()
    if is_accept:
        count = review.get("accepted_count", 0)
        total = review.get("total_items", 0)
        return (
            f"Hi {signer},\n\n"
            f"You signed off on {pname}. {count}/{total} items confirmed.\n"
            f"The signed PDF is attached for your records.\n\n"
            f"View the document: {share_url}\n\n"
            "— Bracket\nThe AI decision workspace for client projects"
        )
    return (
        f"Hi {signer},\n\n"
        f"We received your concerns on {pname}. Here's what you sent:\n\n"
        f"{(review.get('concerns') or '').strip()}\n\n"
        f"The project owner will respond via the same review link:\n{share_url}\n\n"
        "— Bracket\nThe AI decision workspace for client projects"
    )


async def send_client_receipt_email(
    client_email: str,
    project_name: str,
    review: dict,
    share_url: str,
    pdf_bytes: bytes = b"",
    pdf_filename: str = "sign-off.pdf",
) -> bool:
    """Send the client a receipt of their action.
    - Accept: attach the signed PDF.
    - Reject: echo their concerns back as a paper trail.
    Fire-and-forget — never raises."""
    if not client_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping client-receipt email")
        return False
    resend.api_key = api_key
    is_accept = review.get("type") == "accept"
    subject = (
        f"Signed: {project_name} — copy for your records"
        if is_accept
        else f"Concerns received: {project_name}"
    )
    params = {
        "from": _sender(),
        "to": [client_email],
        "subject": subject,
        "html": _client_receipt_html(project_name, review, share_url),
        "text": _client_receipt_text(project_name, review, share_url),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    if is_accept and pdf_bytes:
        # Resend accepts base64-encoded attachments.
        import base64
        params["attachments"] = [{
            "filename": pdf_filename,
            "content": base64.b64encode(pdf_bytes).decode("ascii"),
        }]
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(
            f"client-receipt email sent to {client_email}: "
            f"{result.get('id') if isinstance(result, dict) else result}"
        )
        return True
    except Exception as e:
        logger.exception(f"client-receipt email failed for {client_email}: {e}")
        return False


def _owner_reply_html(client_name: str, owner_name: str, project_name: str, reply_text: str, share_url: str) -> str:
    who = (client_name or "there").strip() or "there"
    owner = (owner_name or "The project owner").strip() or "The project owner"
    pname = (project_name or "your project").strip() or "your project"
    safe = (reply_text or "").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5E6AD2;">&lt; bracket &middot; reply to your concerns &gt;</p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">{owner} replied.</h1>
</td></tr>
<tr><td style="padding:16px 36px 0 36px;">
  <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">Hi {who} &mdash; here's the response to the concerns you raised on <strong style="color:#F4F5F7;">{pname}</strong>:</p>
  <div style="margin:14px 0;padding:14px 16px;border-left:3px solid #5E6AD2;background:#16181D;border-radius:0 10px 10px 0;font-size:13.5px;line-height:1.6;color:#B9BFC9;white-space:pre-wrap;">{safe}</div>
  <p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">Open the document to review and continue the conversation.</p>
  <a href="{share_url}" style="display:inline-block;padding:13px 24px;background:#5E6AD2;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:600;letter-spacing:0.01em;border-radius:10px;">Open the document &rarr;</a>
</td></tr>
<tr><td style="padding:30px 36px 28px 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">Bracket &middot; The AI decision workspace for client projects</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


async def send_owner_reply_email(
    client_email: str,
    client_name: str,
    owner_name: str,
    project_name: str,
    reply_text: str,
    share_url: str,
) -> bool:
    """Notify the client that the owner responded to their concerns.
    Fire-and-forget — never raises."""
    if not client_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping owner-reply email")
        return False
    resend.api_key = api_key
    params = {
        "from": _sender(),
        "to": [client_email],
        "subject": f"Reply to your concerns — {project_name}",
        "html": _owner_reply_html(client_name, owner_name, project_name, reply_text, share_url),
        "text": f"{owner_name} replied to your concerns on {project_name}:\n\n{reply_text}\n\nOpen the document: {share_url}",
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"owner-reply email sent to {client_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"owner-reply email failed for {client_email}: {e}")
        return False


def _document_updated_html(client_name: str, owner_name: str, project_name: str, change_note: str, share_url: str) -> str:
    who = (client_name or "there").strip() or "there"
    owner = (owner_name or "The project owner").strip() or "The project owner"
    pname = (project_name or "your project").strip() or "your project"
    safe = (change_note or "").replace("<", "&lt;").replace(">", "&gt;")
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5E6AD2;">&lt; bracket &middot; document updated &gt;</p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">Your requested changes are in.</h1>
</td></tr>
<tr><td style="padding:16px 36px 0 36px;">
  <p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">Hi {who} &mdash; {owner} updated <strong style="color:#F4F5F7;">{pname}</strong> based on your feedback. Here's what changed:</p>
  <div style="margin:14px 0;padding:14px 16px;border-left:3px solid #4BE39B;background:#16181D;border-radius:0 10px 10px 0;font-size:13.5px;line-height:1.6;color:#B9BFC9;white-space:pre-wrap;">{safe}</div>
  <p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">Take another look and sign off when it feels right.</p>
  <a href="{share_url}" style="display:inline-block;padding:13px 24px;background:#5E6AD2;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:600;letter-spacing:0.01em;border-radius:10px;">Re-review the document &rarr;</a>
</td></tr>
<tr><td style="padding:30px 36px 28px 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">Bracket &middot; The AI decision workspace for client projects</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


async def send_document_updated_email(
    client_email: str,
    client_name: str,
    owner_name: str,
    project_name: str,
    change_note: str,
    share_url: str,
) -> bool:
    """Notify the client that the document was updated with their requested
    changes, including a "here's what changed" note. Fire-and-forget."""
    if not client_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping document-updated email")
        return False
    resend.api_key = api_key
    params = {
        "from": _sender(),
        "to": [client_email],
        "subject": f"Updated for you — {project_name}",
        "html": _document_updated_html(client_name, owner_name, project_name, change_note, share_url),
        "text": f"{owner_name} updated {project_name} based on your feedback.\n\nWhat changed:\n{change_note}\n\nRe-review the document: {share_url}",
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"document-updated email sent to {client_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"document-updated email failed for {client_email}: {e}")
        return False


# =====================================================================
# NPS SURVEY EMAIL
# One-tap 0-10 rating buttons. Each button links to
#   {public_base_url}/api/nps/submit?u={user_id}&s={score}&t={token}
# which records the score and lands the user on a thank-you page
# with an optional free-text comment field.
# =====================================================================
def _nps_button_cell(score: int, url: str) -> str:
    """One 0-10 rating cell — bold border, hover-friendly, tap target ≥ 40px.
    Colored by detractor (0-6) / passive (7-8) / promoter (9-10) tone."""
    if score <= 6:
        border = "#EF4444"; text = "#FCA5A5"
    elif score <= 8:
        border = "#F59E0B"; text = "#FCD34D"
    else:
        border = "#22C55E"; text = "#86EFAC"
    return (
        f'<td align="center" style="padding:0 3px;">'
        f'<a href="{url}" '
        f'style="display:inline-block;min-width:38px;padding:12px 6px;text-align:center;'
        f'background:#0F1114;border:1.5px solid {border};border-radius:10px;'
        f'font-family:\'Poppins\',\'Segoe UI\',sans-serif;font-size:16px;font-weight:600;'
        f'color:{text};text-decoration:none;letter-spacing:-0.01em;">'
        f'{score}'
        f'</a>'
        f'</td>'
    )


def _nps_survey_html(name: str, base_url: str, user_id: str, token: str, logo_url: str) -> str:
    display_name = (name or "").strip() or "there"
    # Build one 11-cell row of 0-10 rating buttons.
    row_cells = "".join(
        _nps_button_cell(s, f"{base_url}/api/nps/submit?u={user_id}&s={s}&t={token}")
        for s in range(11)
    )
    return f"""<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
      <tr>
        <td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
            <!-- Logo row -->
            <tr>
              <td align="center" style="padding:34px 36px 0 36px;">
                <img src="{logo_url}" alt="Bracket" width="44" height="44" style="display:block;width:44px;height:44px;border:0;outline:none;" />
              </td>
            </tr>
            <!-- Chip -->
            <tr>
              <td align="center" style="padding:18px 36px 0 36px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#5E6AD2;">
                  &lt; bracket &middot; one question &gt;
                </p>
              </td>
            </tr>
            <!-- Headline -->
            <tr>
              <td style="padding:14px 36px 0 36px;" align="center">
                <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;text-align:center;">
                  How likely are you to<br/>
                  recommend <span style="color:#5E6AD2;">Bracket</span> to a friend?
                </h1>
              </td>
            </tr>
            <!-- Personal note -->
            <tr>
              <td style="padding:18px 36px 0 36px;">
                <p style="margin:0 0 8px 0;font-size:15px;line-height:1.65;color:#B9BFC9;text-align:center;">
                  Hi {display_name} — one tap, one number. Your honest read
                  helps us shape what Bracket becomes next.
                </p>
              </td>
            </tr>
            <!-- Rating row -->
            <tr>
              <td style="padding:26px 20px 6px 20px;" align="center">
                <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>{row_cells}</tr>
                </table>
              </td>
            </tr>
            <!-- Legend -->
            <tr>
              <td style="padding:6px 36px 0 36px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
                  <tr>
                    <td style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#6E7480;">Not likely</td>
                    <td align="right" style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#6E7480;">Extremely likely</td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Why it matters -->
            <tr>
              <td style="padding:26px 36px 0 36px;">
                <p style="margin:0;font-size:13.5px;line-height:1.7;color:#8A93A0;text-align:center;">
                  Tapping a number is enough. If you have ~30 seconds, the
                  next page has a small text box where you can tell us why —
                  we read every single one.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:30px 36px 30px 36px;">
                <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;text-align:center;">
                  Bracket &middot; The AI decision workspace for client projects
                </p>
                <p style="margin:8px 0 0 0;font-size:12px;color:#6E7480;text-align:center;">
                  You're receiving this because you signed up at use-bracket.com. This is a one-time survey — no follow-ups.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def _nps_survey_text(name: str, base_url: str, user_id: str, token: str) -> str:
    display_name = (name or "").strip() or "there"
    lines = [f"Hi {display_name},", "",
             "One question — how likely are you to recommend Bracket to a friend? (0 = not likely, 10 = extremely likely)",
             ""]
    for s in range(11):
        lines.append(f"  {s} — {base_url}/api/nps/submit?u={user_id}&s={s}&t={token}")
    lines += ["",
              "Tapping a number is enough. The next page has a small text box if you want to tell us why.",
              "",
              "— Bracket",
              "The AI decision workspace for client projects"]
    return "\n".join(lines)


async def send_nps_survey_email(
    to_email: str,
    name: str,
    user_id: str,
    token: str,
    public_base_url: str,
    logo_url: str,
) -> bool:
    """Fire-and-forget NPS survey. Returns True on success, False on failure."""
    if not to_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping NPS survey email")
        return False
    resend.api_key = api_key
    base = (public_base_url or "https://use-bracket.com").rstrip("/")
    params = {
        "from": _sender(),
        "to": [to_email],
        "subject": "One tap · how likely are you to recommend Bracket?",
        "html": _nps_survey_html(name, base, user_id, token, logo_url),
        "text": _nps_survey_text(name, base, user_id, token),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"nps-survey email sent to {to_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"nps-survey email failed for {to_email}: {e}")
        return False



# --- SCOPE-CREEP ALERT EMAIL ----------------------------------------------
def _scope_alert_html(owner_name: str, project_name: str, client_name: str,
                      items: list, project_url: str) -> str:
    display_name = (owner_name or "").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
    who = (client_name or "The client").strip() or "The client"
    accent = "#F59E0B"
    rows = []
    for it in items[:8]:
        title = str(it.get("title") or "").replace("<", "&lt;").replace(">", "&gt;")
        detail = str(it.get("detail") or "").replace("<", "&lt;").replace(">", "&gt;")
        rows.append(
            f"<tr><td style='padding:14px 16px;border:1px solid #26282D;border-radius:10px;"
            f"background:#16181D;'>"
            f"<p style='margin:0;font-size:14px;font-weight:600;color:#F4F5F7;'>{title}</p>"
            + (f"<p style='margin:6px 0 0 0;font-size:13px;line-height:1.55;color:#B9BFC9;'>{detail}</p>" if detail else "")
            + "</td></tr><tr><td style='height:10px;line-height:10px;'>&nbsp;</td></tr>"
        )
    n = len(items)
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{accent};">
    &lt; bracket &middot; scope alert &gt;
  </p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:25px;line-height:1.22;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">
    Heads up &mdash;<br/><span style="color:{accent};">{who} asked for something new.</span>
  </h1>
</td></tr>
<tr><td style="padding:16px 36px 0 36px;">
  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">
    Hi {display_name} &mdash; Bracket spotted <strong style="color:#F4F5F7;">{n}</strong> request{'s' if n != 1 else ''} on
    <strong style="color:#F4F5F7;">{pname}</strong> that look{'s' if n == 1 else ''} like they expand the scope. Review before you commit:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0">{''.join(rows)}</table>
  <a href="{project_url}" style="display:inline-block;margin-top:6px;padding:13px 24px;background:#F4F5F7;color:#08090A;text-decoration:none;font-size:13.5px;font-weight:600;letter-spacing:0.01em;border-radius:10px;">
    Review in Bracket &rarr;
  </a>
</td></tr>
<tr><td style="padding:28px 36px 28px 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">
    Bracket &middot; The AI decision workspace for client projects
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def _scope_alert_text(owner_name: str, project_name: str, client_name: str,
                      items: list, project_url: str) -> str:
    display_name = (owner_name or "").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
    who = (client_name or "The client").strip() or "The client"
    lines = [f"Hi {display_name},", "",
             f"Bracket spotted {len(items)} request(s) on {pname} that look like they expand the scope "
             f"({who}). Review before you commit:", ""]
    for it in items[:8]:
        t = str(it.get("title") or "").strip()
        d = str(it.get("detail") or "").strip()
        lines.append(f"  • {t}" + (f" — {d}" if d else ""))
    lines += ["", f"Review in Bracket: {project_url}", "",
              "— Bracket", "The AI decision workspace for client projects"]
    return "\n".join(lines)


async def send_scope_creep_alert(
    owner_email: str,
    owner_name: str,
    project_name: str,
    project_id: str,
    client_name: str,
    items: list,
    public_base_url: str = "",
) -> bool:
    """Alert the project owner when Bracket detects client requests that expand
    scope during a sync. Batched — one email per sync. Fire-and-forget."""
    if not owner_email or not items:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping scope-creep alert")
        return False
    resend.api_key = api_key
    base = (public_base_url or os.environ.get("PUBLIC_BASE_URL", "https://use-bracket.com")).rstrip("/")
    project_url = f"{base}/project/{project_id}"
    n = len(items)
    subject = f"Scope alert: {project_name} — {n} new request{'s' if n != 1 else ''}"
    params = {
        "from": _sender(),
        "to": [owner_email],
        "subject": subject,
        "html": _scope_alert_html(owner_name, project_name, client_name, items, project_url),
        "text": _scope_alert_text(owner_name, project_name, client_name, items, project_url),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"scope-creep alert sent to {owner_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"scope-creep alert failed for {owner_email}: {e}")
        return False


# --- PAYMENT RECEIPT EMAIL -------------------------------------------------
def _fmt_amount(amount, currency: str) -> str:
    sym = "₹" if (currency or "").lower() == "inr" else "$"
    try:
        a = float(amount)
    except (TypeError, ValueError):
        return f"{sym}{amount}"
    if (currency or "").lower() == "inr":
        return f"{sym}{int(round(a)):,}"
    return f"{sym}{a:.2f}".rstrip("0").rstrip(".")


def _receipt_html(name: str, plan_label: str, amount_str: str, recurring: bool,
                  date_str: str, ref: str, app_url: str) -> str:
    display_name = (name or "").strip() or "there"
    accent = "#22C55E"
    billing = "Monthly subscription" if recurring else "One-time payment"
    what = ("Up to 10 active projects, unlimited connected tools and live project memory."
            if recurring else
            "One project, active for 60 days, with unlimited connected tools and live project memory.")
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{accent};">
    &lt; bracket &middot; payment confirmed &gt;
  </p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">
    You're all set, {display_name}.
  </h1>
</td></tr>
<tr><td style="padding:16px 36px 0 36px;">
  <p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#B9BFC9;">
    Thanks for your payment. Here's your receipt for <strong style="color:#F4F5F7;">{plan_label}</strong>.
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#16181D;border:1px solid #26282D;border-radius:12px;">
    <tr><td style="padding:16px 18px;border-bottom:1px solid #22242A;">
      <table width="100%"><tr>
        <td style="font-size:13px;color:#8A93A0;">Plan</td>
        <td align="right" style="font-size:13.5px;color:#F4F5F7;font-weight:600;">{plan_label}</td>
      </tr></table></td></tr>
    <tr><td style="padding:16px 18px;border-bottom:1px solid #22242A;">
      <table width="100%"><tr>
        <td style="font-size:13px;color:#8A93A0;">Billing</td>
        <td align="right" style="font-size:13.5px;color:#F4F5F7;">{billing}</td>
      </tr></table></td></tr>
    <tr><td style="padding:16px 18px;border-bottom:1px solid #22242A;">
      <table width="100%"><tr>
        <td style="font-size:13px;color:#8A93A0;">Date</td>
        <td align="right" style="font-size:13.5px;color:#F4F5F7;">{date_str}</td>
      </tr></table></td></tr>
    <tr><td style="padding:18px 18px;">
      <table width="100%"><tr>
        <td style="font-size:14px;color:#F4F5F7;font-weight:600;">Total paid</td>
        <td align="right" style="font-size:20px;color:{accent};font-weight:700;letter-spacing:-0.01em;">{amount_str}</td>
      </tr></table></td></tr>
  </table>
  <p style="margin:18px 0 18px 0;font-size:14px;line-height:1.6;color:#B9BFC9;">{what}</p>
  <a href="{app_url}" style="display:inline-block;padding:13px 24px;background:#F4F5F7;color:#08090A;text-decoration:none;font-size:13.5px;font-weight:600;letter-spacing:0.01em;border-radius:10px;">
    Open Bracket &rarr;
  </a>
</td></tr>
<tr><td style="padding:28px 36px 28px 36px;">
  <p style="margin:0 0 6px 0;font-size:12px;color:#6E7480;">Reference: {ref}</p>
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">
    Bracket &middot; The AI decision workspace for client projects
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def _receipt_text(name: str, plan_label: str, amount_str: str, recurring: bool,
                  date_str: str, ref: str, app_url: str) -> str:
    display_name = (name or "").strip() or "there"
    billing = "Monthly subscription" if recurring else "One-time payment"
    return (
        f"Hi {display_name},\n\n"
        f"Thanks for your payment. Here's your receipt:\n\n"
        f"  Plan:    {plan_label}\n"
        f"  Billing: {billing}\n"
        f"  Date:    {date_str}\n"
        f"  Total:   {amount_str}\n\n"
        f"Open Bracket: {app_url}\n"
        f"Reference: {ref}\n\n"
        "— Bracket\nThe AI decision workspace for client projects"
    )


async def send_payment_receipt(
    to_email: str,
    name: str,
    plan_label: str,
    amount,
    currency: str,
    recurring: bool,
    session_id: str = "",
    public_base_url: str = "",
) -> bool:
    """Branded receipt after a successful payment. Fire-and-forget — never raises."""
    if not to_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping payment receipt")
        return False
    resend.api_key = api_key
    import datetime as _dt
    base = (public_base_url or os.environ.get("PUBLIC_BASE_URL", "https://use-bracket.com")).rstrip("/")
    app_url = f"{base}/app"
    amount_str = _fmt_amount(amount, currency)
    date_str = _dt.datetime.now(_dt.timezone.utc).strftime("%d %b %Y")
    ref = (session_id or "")[-16:] or "—"
    plan_label = plan_label or "Bracket"
    params = {
        "from": _sender(),
        "to": [to_email],
        "subject": f"Receipt: {plan_label} — {amount_str}",
        "html": _receipt_html(name, plan_label, amount_str, recurring, date_str, ref, app_url),
        "text": _receipt_text(name, plan_label, amount_str, recurring, date_str, ref, app_url),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"payment receipt sent to {to_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"payment receipt failed for {to_email}: {e}")
        return False



# --- DAILY SCOPE-ALERT DIGEST ---------------------------------------------
def _scope_digest_html(owner_name: str, groups: list, base: str) -> str:
    display_name = (owner_name or "").strip() or "there"
    accent = "#F59E0B"
    total = sum(len(g.get("items") or []) for g in groups)
    blocks = []
    for g in groups:
        items = g.get("items") or []
        if not items:
            continue
        purl = f"{base}/project/{g.get('project_id')}"
        rows = "".join(
            f"<tr><td style='padding:10px 14px;border-bottom:1px solid #22242A;'>"
            f"<span style='font-size:13.5px;color:#F4F5F7;font-weight:600;'>{(it.get('title') or '')[:160]}</span>"
            + (f"<br/><span style='font-size:12.5px;color:#9AA1AC;line-height:1.5;'>{(it.get('detail') or '')[:220]}</span>" if it.get('detail') else "")
            + "</td></tr>"
            for it in items[:12]
        )
        blocks.append(
            f"<p style='margin:22px 0 8px 0;font-size:13px;color:#8A93A0;'>"
            f"<strong style='color:#F4F5F7;'>{(g.get('project_name') or 'your project')}</strong> &middot; {len(items)} new</p>"
            f"<table width='100%' cellpadding='0' cellspacing='0' style='background:#16181D;border:1px solid #26282D;border-radius:12px;'>{rows}</table>"
            f"<a href='{purl}' style='display:inline-block;margin-top:10px;font-size:12.5px;color:{accent};text-decoration:none;'>Review in Bracket &rarr;</a>"
        )
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#08090A;font-family:'Poppins','Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;color:#E8EAF0;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08090A;padding:44px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F1114;border:1px solid #26282D;border-radius:16px;">
<tr><td style="padding:32px 36px 0 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:{accent};">
    &lt; bracket &middot; daily scope digest &gt;
  </p>
</td></tr>
<tr><td style="padding:18px 36px 0 36px;">
  <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:#F4F5F7;">
    Hi {display_name} &mdash;<br/><span style="color:{accent};">{total} new client request{'s' if total != 1 else ''} to review</span>
  </h1>
</td></tr>
<tr><td style="padding:8px 36px 0 36px;">
  <p style="margin:0 0 4px 0;font-size:14px;line-height:1.6;color:#B9BFC9;">Here's everything new across your projects since your last digest.</p>
  {''.join(blocks)}
</td></tr>
<tr><td style="padding:30px 36px 28px 36px;">
  <p style="margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;color:#6E7480;border-top:1px solid #26282D;padding-top:20px;">
    Bracket &middot; project memory for client work
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""


def _scope_digest_text(owner_name: str, groups: list, base: str) -> str:
    display_name = (owner_name or "").strip() or "there"
    lines = [f"Hi {display_name},", "", "New client requests to review since your last digest:", ""]
    for g in groups:
        items = g.get("items") or []
        if not items:
            continue
        lines.append(f"{g.get('project_name') or 'your project'} ({len(items)} new):")
        for it in items[:12]:
            d = f" — {it.get('detail')}" if it.get("detail") else ""
            lines.append(f"  - {it.get('title', '')}{d}")
        lines.append(f"  Review: {base}/project/{g.get('project_id')}")
        lines.append("")
    lines.append("— Bracket")
    return "\n".join(lines)


async def send_scope_digest(owner_email: str, owner_name: str, groups: list, public_base_url: str = "") -> bool:
    """One batched daily digest of new scope asks across an owner's projects."""
    groups = [g for g in (groups or []) if (g.get("items"))]
    if not owner_email or not groups:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set; skipping scope digest")
        return False
    resend.api_key = api_key
    base = (public_base_url or os.environ.get("PUBLIC_BASE_URL", "https://use-bracket.com")).rstrip("/")
    total = sum(len(g.get("items") or []) for g in groups)
    params = {
        "from": _sender(),
        "to": [owner_email],
        "subject": f"Scope digest: {total} new client request{'s' if total != 1 else ''}",
        "html": _scope_digest_html(owner_name, groups, base),
        "text": _scope_digest_text(owner_name, groups, base),
        "reply_to": os.environ.get("SENDER_EMAIL", ""),
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"scope digest sent to {owner_email}: {result.get('id') if isinstance(result, dict) else result}")
        return True
    except Exception as e:
        logger.exception(f"scope digest failed for {owner_email}: {e}")
        return False


# ───────────────────────── Light templates (v2) ─────────────────────────
def _light_shell(body_html: str, footer_to: str = "") -> str:
    foot = f"You're receiving this because you use Bracket at {footer_to}." if footer_to else "You're receiving this because you use Bracket."
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181B;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;padding:40px 16px;">
<tr><td align="center">
<table role="presentation" width="600" style="max-width:600px;background:#FFFFFF;border-radius:14px;border:1px solid #E6E6E8;">
<tr><td style="padding:28px 32px 0 32px;"><img src="https://customer-assets-lqy194kg.emergentagent.net/job_design-decided/artifacts/f63aa7a9eea0f56c_logo-new.png" width="24" height="24" alt="Bracket" style="vertical-align:middle;border:0;display:inline-block;"/> <span style="font-size:16px;font-weight:700;color:#18181B;letter-spacing:-0.01em;vertical-align:middle;padding-left:2px;">Bracket</span></td></tr>
{body_html}
<tr><td style="padding:8px 32px 28px 32px;">
<p style="margin:20px 0 0 0;font-size:12px;line-height:1.6;color:#A1A1AA;border-top:1px solid #EFEFF1;padding-top:16px;">{foot}<br/>
<a href="https://use-bracket.com/settings/notifications" style="color:#71717A;text-decoration:none;">Notification settings</a> · <a href="https://use-bracket.com/settings/notifications" style="color:#71717A;text-decoration:none;">Unsubscribe from digests</a> · Bracket Inc · support@use-bracket.com</p>
</td></tr></table></td></tr></table></body></html>"""


_DIGEST_COLORS = {"scope change": "#B45309", "conflict": "#B91C1C", "waiting": "#71717A",
                  "coming up": "#71717A", "decision": "#4338CA", "memory updated": "#71717A"}


def _digest_section(eyebrow: str, items: list) -> str:
    if not items:
        return ""
    color = _DIGEST_COLORS.get(eyebrow.lower().split(" ·")[0], "#71717A")
    rows = ""
    for it in items:
        sub = it.get("sub", "")
        rows += (f'<p style="margin:0 0 2px 0;font-size:15px;line-height:1.45;color:#18181B;font-weight:500;">{it.get("title","")}</p>'
                 + (f'<p style="margin:0 0 14px 0;font-size:13px;line-height:1.45;color:#A1A1AA;">{sub}</p>' if sub else '<div style="height:12px"></div>'))
    return (f'<tr><td style="padding:18px 32px 0 32px;">'
            f'<p style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:{color};border-top:1px solid #EFEFF1;padding-top:16px;">{eyebrow}</p>'
            f'{rows}</td></tr>')


def _daily_digest_html(name: str, needs_count: int, sections: list, open_url: str, footer_to: str) -> str:
    display = (name or "there").strip() or "there"
    secs = "".join(_digest_section(s["eyebrow"], s["items"]) for s in sections)
    body = (f'<tr><td style="padding:22px 32px 0 32px;">'
            f'<h1 style="margin:0;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:#18181B;">Good morning, {display}</h1>'
            f'<p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#52525B;">Here\'s what changed across your workspaces since yesterday.</p>'
            f'</td></tr>'
            f'{secs}'
            f'<tr><td style="padding:24px 32px 4px 32px;">'
            f'<a href="{open_url}" style="display:inline-block;background:#18181B;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:500;padding:11px 22px;border-radius:9px;">Open Bracket</a>'
            f'</td></tr>')
    return _light_shell(body, footer_to)


async def send_daily_digest(to_email: str, name: str, needs_count: int, sections: list, open_url: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning(f"[DIGEST DEV] would send to {to_email}: {needs_count} items")
        return False
    resend.api_key = api_key
    subject = f"Your Bracket digest: {needs_count} need{'s' if needs_count == 1 else ''} you" if needs_count else "Your Bracket digest"
    text_lines = [f"Good morning, {name or 'there'}", ""]
    for s in sections:
        for it in s["items"]:
            text_lines.append(f"[{s['eyebrow']}] {it.get('title','')}" + (f" — {it.get('sub')}" if it.get("sub") else ""))
    text_lines += ["", f"Open Bracket: {open_url}"]
    params = {
        "from": _sender(), "to": [to_email], "subject": subject,
        "html": _daily_digest_html(name, needs_count, sections, open_url, to_email),
        "text": "\n".join(text_lines),
        "headers": {
            "List-Unsubscribe": f"<mailto:{os.environ.get('SENDER_EMAIL','support@use-bracket.com')}?subject=unsubscribe>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        "tags": [{"name": "category", "value": "digest"}],
    }
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        return True
    except Exception as e:
        logger.exception(f"Daily digest failed for {to_email}: {e}")
        return False



# ───────── Light transactional templates (v2 light shell) ─────────
def _esc(s) -> str:
    return str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _light_body(eyebrow, eyebrow_color, heading, paragraphs,
                button_label="", button_url="", extra_html="") -> str:
    """Compose the inner <tr> rows for a light-shell transactional email."""
    rows = ""
    if eyebrow:
        rows += (f'<tr><td style="padding:22px 32px 0 32px;">'
                 f'<p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;'
                 f'font-weight:600;color:{eyebrow_color};">{_esc(eyebrow)}</p></td></tr>')
    rows += (f'<tr><td style="padding:{"10px" if eyebrow else "22px"} 32px 0 32px;">'
             f'<h1 style="margin:0;font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-0.02em;color:#18181B;">{_esc(heading)}</h1>')
    for p in paragraphs:
        rows += f'<p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#52525B;">{p}</p>'
    rows += "</td></tr>"
    if extra_html:
        rows += f'<tr><td style="padding:18px 32px 0 32px;">{extra_html}</td></tr>'
    if button_label and button_url:
        rows += (f'<tr><td style="padding:22px 32px 4px 32px;">'
                 f'<a href="{button_url}" style="display:inline-block;background:#18181B;color:#FFFFFF;'
                 f'text-decoration:none;font-size:14px;font-weight:500;padding:11px 22px;border-radius:9px;">{_esc(button_label)}</a>'
                 f'</td></tr>')
    return rows


def _callout(title, detail="", accent="#71717A") -> str:
    """A bordered highlight block for a single item (attention alerts, etc.)."""
    sub = (f'<p style="margin:6px 0 0 0;font-size:13px;line-height:1.5;color:#71717A;">{_esc(detail)}</p>'
           if detail else "")
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
            f'style="background:#FAFAFA;border:1px solid #E6E6E8;border-left:3px solid {accent};border-radius:10px;">'
            f'<tr><td style="padding:14px 16px;">'
            f'<p style="margin:0;font-size:15px;line-height:1.45;color:#18181B;font-weight:600;">{_esc(title)}</p>'
            f'{sub}</td></tr></table>')


async def _send_light(to_email: str, subject: str, html: str, text: str,
                      category: str = "transactional", footer_to: str = "") -> bool:
    if not to_email:
        return False
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning(f"[{category.upper()} DEV] would send to {to_email}: {subject}")
        return False
    resend.api_key = api_key
    params = {
        "from": _sender(),
        "to": [to_email],
        "subject": subject,
        "html": _light_shell(html, footer_to or to_email),
        "text": text,
        "headers": {
            "List-Unsubscribe": f"<mailto:{os.environ.get('SENDER_EMAIL', 'support@use-bracket.com')}?subject=unsubscribe>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        "tags": [{"name": "category", "value": category}],
    }
    sender_email = os.environ.get("SENDER_EMAIL", "").strip()
    if sender_email:
        params["reply_to"] = sender_email
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"{category} email sent to {to_email}")
        return True
    except Exception as e:
        logger.exception(f"{category} email failed for {to_email}: {e}")
        return False


# --- 1. PASSWORD RESET -----------------------------------------------------
async def send_password_reset_email(to_email: str, name: str, reset_url: str) -> bool:
    display = (name or "there").strip() or "there"
    body = _light_body(
        "Sign-in & security", "#4338CA", "Reset your password",
        [f"Hi {_esc(display)}, we got a request to reset your Bracket password. "
         "Tap the button below to choose a new one — the link expires in 30 minutes.",
         "If you didn't ask for this, you can safely ignore this email. Your password won't change."],
        "Reset password", reset_url)
    text = (f"Hi {display},\n\nReset your Bracket password using this link (expires in 30 minutes):\n"
            f"{reset_url}\n\nIf you didn't request this, ignore this email.\n\n— Bracket")
    return await _send_light(to_email, "Reset your Bracket password", body, text, "auth")


# --- 2. TEAM INVITE --------------------------------------------------------
async def send_invite_email(to_email: str, inviter_name: str, workspace_name: str, accept_url: str) -> bool:
    inviter = (inviter_name or "A teammate").strip() or "A teammate"
    ws = (workspace_name or "a workspace").strip() or "a workspace"
    body = _light_body(
        "Workspace invite", "#4338CA", f"{_esc(inviter)} invited you to Bracket",
        [f"You've been invited to join <strong style=\"color:#18181B;\">{_esc(ws)}</strong> on Bracket — "
         "the project memory for client work. Accept to see the scope, decisions and timeline.",
         "This invite is tied to your email, so sign in with this address to join."],
        "Accept invite", accept_url)
    text = (f"{inviter} invited you to join {ws} on Bracket.\n\nAccept the invite:\n{accept_url}\n\n— Bracket")
    return await _send_light(to_email, f"{inviter} invited you to {ws}", body, text, "invite")


# --- 3. ATTENTION ALERT (single high-impact item) --------------------------
async def send_attention_alert_email(to_email: str, name: str, project_name: str,
                                      item_title: str, item_detail: str = "",
                                      source_label: str = "", project_url: str = "") -> bool:
    display = (name or "there").strip() or "there"
    pname = (project_name or "your project").strip() or "your project"
    src = f" · {_esc(source_label)}" if source_label else ""
    callout = _callout(item_title, item_detail, accent="#B45309")
    body = _light_body(
        f"Needs your attention{src}", "#B45309",
        "One thing needs a decision",
        [f"Hi {_esc(display)}, Bracket spotted a high-impact change on "
         f"<strong style=\"color:#18181B;\">{_esc(pname)}</strong> that's worth a look before you move on."],
        "Review in Bracket", project_url, extra_html=callout)
    text = (f"Hi {display},\n\nBracket spotted a high-impact change on {pname}:\n\n"
            f"  {item_title}" + (f"\n  {item_detail}" if item_detail else "") +
            f"\n\nReview in Bracket: {project_url}\n\n— Bracket")
    return await _send_light(to_email, f"Needs your attention: {pname}", body, text, "attention")


# --- 4. SOURCE DISCONNECTED ------------------------------------------------
async def send_source_disconnected_email(to_email: str, name: str, source_label: str,
                                         project_name: str, reconnect_url: str) -> bool:
    display = (name or "there").strip() or "there"
    src = (source_label or "A source").strip() or "A source"
    pname = (project_name or "your project").strip() or "your project"
    body = _light_body(
        "Connection lost", "#B91C1C", f"{_esc(src)} stopped syncing",
        [f"Hi {_esc(display)}, Bracket can no longer reach <strong style=\"color:#18181B;\">{_esc(src)}</strong> "
         f"on <strong style=\"color:#18181B;\">{_esc(pname)}</strong>. New messages and changes from this source "
         "won't appear until you reconnect.",
         "Your existing memory and timeline are untouched — this only affects new updates."],
        "Reconnect source", reconnect_url)
    text = (f"Hi {display},\n\n{src} stopped syncing on {pname}. New updates won't appear until you reconnect.\n\n"
            f"Reconnect: {reconnect_url}\n\n— Bracket")
    return await _send_light(to_email, f"{src} disconnected — reconnect to keep syncing", body, text, "source")


# --- 5. TRIAL ENDING -------------------------------------------------------
async def send_trial_ending_email(to_email: str, name: str, days_left: int, upgrade_url: str) -> bool:
    display = (name or "there").strip() or "there"
    d = max(0, int(days_left or 0))
    when = "today" if d == 0 else ("tomorrow" if d == 1 else f"in {d} days")
    body = _light_body(
        "Trial ending", "#B45309", f"Your Bracket trial ends {when}",
        [f"Hi {_esc(display)}, your free trial wraps up {when}. Pick a plan to keep your sources syncing "
         "and your project memory live — nothing is deleted if you wait, but syncing pauses.",
         "Upgrade in under a minute and pick up right where you left off."],
        "Choose a plan", upgrade_url)
    text = (f"Hi {display},\n\nYour Bracket trial ends {when}. Choose a plan to keep syncing:\n{upgrade_url}\n\n"
            "Nothing is deleted if you wait, but syncing pauses.\n\n— Bracket")
    return await _send_light(to_email, f"Your Bracket trial ends {when}", body, text, "trial")


# --- 6. PAYMENT FAILED -----------------------------------------------------
async def send_payment_failed_email(to_email: str, name: str, plan_label: str,
                                     amount_str: str, update_url: str) -> bool:
    display = (name or "there").strip() or "there"
    plan = (plan_label or "your Bracket plan").strip() or "your Bracket plan"
    amt = f" of {_esc(amount_str)}" if amount_str else ""
    body = _light_body(
        "Payment issue", "#B91C1C", "We couldn't process your payment",
        [f"Hi {_esc(display)}, the payment{amt} for <strong style=\"color:#18181B;\">{_esc(plan)}</strong> didn't go "
         "through. This usually means an expired card or a temporary bank decline.",
         "Update your payment method and we'll retry automatically. Your workspaces stay readable in the meantime."],
        "Update payment", update_url)
    text = (f"Hi {display},\n\nWe couldn't process your payment for {plan}. "
            "Update your payment method and we'll retry:\n"
            f"{update_url}\n\nYour workspaces stay readable in the meantime.\n\n— Bracket")
    return await _send_light(to_email, "Action needed: your Bracket payment failed", body, text, "billing")
