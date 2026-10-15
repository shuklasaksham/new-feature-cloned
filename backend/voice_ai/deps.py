"""Dependencies for the Voice AI router.

Kept as FastAPI dependencies (not module-level imports) so the router reuses
the app's shared Mongo client and session auth in production, and tests can
override both without importing the rest of the backend.
"""
from fastapi import Depends, Request


def get_db():
    from connectors import db  # shared Motor client, same as demo.py

    return db


async def get_user(request: Request, db=Depends(get_db)) -> dict:
    from auth import current_user

    return await current_user(request, db)
