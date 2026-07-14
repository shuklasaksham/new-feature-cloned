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
                  &#123; bracket &middot; project started &#125;
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
                  Bracket &middot; Decisions for designers
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
    {{ bracket &middot; {chip_label.lower()} }}
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
    &#123; bracket &middot; {chip.lower()} &#125;
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
    Bracket &middot; Decisions for designers
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
            "— Bracket\nDecisions for designers"
        )
    return (
        f"Hi {signer},\n\n"
        f"We received your concerns on {pname}. Here's what you sent:\n\n"
        f"{(review.get('concerns') or '').strip()}\n\n"
        f"The project owner will respond via the same review link:\n{share_url}\n\n"
        "— Bracket\nDecisions for designers"
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
