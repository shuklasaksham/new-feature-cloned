"""Stripe billing routes using emergentintegrations hosted Checkout.
Treats upgrades as a 30-day access extension. Polling-based status check.
"""
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

from models import CheckoutRequest, BillingStatus, _uuid, _now_iso
from auth import get_current_user


# Fixed pricing table — server side only.
PRICING = {
    "pro": {"USD": 19.00, "INR": 1499.00},
    "studio": {"USD": 59.00, "INR": 4999.00},
}


def build_billing_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter()

    async def user_dep(request: Request):
        return await get_current_user(request, db)

    def _client(request: Request) -> StripeCheckout:
        host = str(request.base_url).rstrip("/")
        webhook_url = f"{host}/api/webhook/stripe"
        return StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=webhook_url)

    @router.post("/billing/checkout")
    async def create_checkout(
        body: CheckoutRequest, request: Request, user: dict = Depends(user_dep)
    ):
        if body.tier not in PRICING:
            raise HTTPException(status_code=400, detail="Invalid tier.")
        currency = body.currency.upper()
        if currency not in PRICING[body.tier]:
            raise HTTPException(status_code=400, detail="Invalid currency.")
        amount = float(PRICING[body.tier][currency])

        origin = body.origin_url.rstrip("/")
        success_url = f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin}/pricing?billing=cancelled"

        metadata = {
            "user_id": user["id"],
            "email": user["email"],
            "tier": body.tier,
            "currency": currency,
        }
        client = _client(request)
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency=currency.lower(),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
        )
        session = await client.create_checkout_session(checkout_request)

        await db.payment_transactions.insert_one(
            {
                "id": _uuid(),
                "user_id": user["id"],
                "email": user["email"],
                "tier": body.tier,
                "amount": amount,
                "currency": currency,
                "session_id": session.session_id,
                "payment_status": "pending",
                "status": "initiated",
                "metadata": metadata,
                "created_at": _now_iso(),
                "processed_at": None,
            }
        )
        return {"url": session.url, "session_id": session.session_id}

    @router.get("/billing/status/{session_id}")
    async def check_status(
        session_id: str, request: Request, user: dict = Depends(user_dep)
    ):
        txn = await db.payment_transactions.find_one(
            {"session_id": session_id, "user_id": user["id"]}, {"_id": 0}
        )
        if not txn:
            raise HTTPException(status_code=404, detail="Session not found.")
        # Already processed → return as-is (idempotent)
        if txn.get("payment_status") == "paid" and txn.get("status") == "complete":
            return {
                "payment_status": "paid",
                "status": "complete",
                "tier": txn.get("tier"),
            }

        client = _client(request)
        status = await client.get_checkout_status(session_id)

        updates = {
            "payment_status": status.payment_status,
            "status": status.status,
            "processed_at": _now_iso(),
        }
        await db.payment_transactions.update_one(
            {"session_id": session_id}, {"$set": updates}
        )

        if status.payment_status == "paid" and txn.get("payment_status") != "paid":
            # Grant tier. 30 days of access.
            tier = txn["tier"]
            active_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            await db.users.update_one(
                {"id": user["id"]},
                {
                    "$set": {
                        "tier": tier,
                        "active_until": active_until,
                        "last_session_id": session_id,
                    }
                },
            )
        return {
            "payment_status": status.payment_status,
            "status": status.status,
            "tier": txn.get("tier"),
        }

    @router.get("/billing/me", response_model=BillingStatus)
    async def my_status(user: dict = Depends(user_dep)):
        u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        tier = u.get("tier", "free")
        active_until = u.get("active_until")
        # Expire if past due
        if active_until:
            try:
                if datetime.fromisoformat(active_until) < datetime.now(timezone.utc):
                    tier = "free"
            except Exception:
                pass
        return {
            "tier": tier,
            "active_until": active_until,
            "last_session_id": u.get("last_session_id"),
        }

    @router.post("/webhook/stripe")
    async def stripe_webhook(request: Request):
        body = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        try:
            client = _client(request)
            event = await client.handle_webhook(body, sig)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook error: {e}")
        if event.session_id:
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {
                    "$set": {
                        "payment_status": event.payment_status,
                        "webhook_event": event.event_type,
                        "processed_at": _now_iso(),
                    }
                },
            )
            if event.payment_status == "paid" and event.metadata:
                user_id = event.metadata.get("user_id")
                tier = event.metadata.get("tier")
                if user_id and tier:
                    active_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                    await db.users.update_one(
                        {"id": user_id},
                        {"$set": {"tier": tier, "active_until": active_until, "last_session_id": event.session_id}},
                    )
        return {"ok": True}

    return router
