"""Bracket Voice AI — voice mode, AI client calls, call intelligence and memory review.

Mounted by server.py at /api/voice. Everything for the feature lives in this package.
"""
from .router import router

__all__ = ["router"]
