"""Seed data for the Voice AI workspace.

Every user gets their own copy of this workspace the first time they open
Voice AI. It mirrors the "Fintech Landing Page Redesign" project used across
the Figma designs so the full journey — ask, call, summary, memory review —
works end to end before real telephony and project memory are wired in.
"""
from copy import deepcopy

PROJECT = {
    "id": "fintech-landing",
    "name": "Fintech Landing Page Redesign",
    "client": "Acme Finance",
    "memory_count": 39,
    "sources": ["Gmail", "Slack", "Notes"],
    "summary": (
        "Acme Finance is redesigning its website to improve trust and conversions. "
        "Desktop and mobile are agreed; tablet scope and the launch date are still open."
    ),
    "launch_date": "Fri Oct 17",
    "launch_status": "at_risk",
    "updated_from_call": False,
}

CONTACTS = [
    {
        "id": "sarah-chen",
        "name": "Sarah Chen",
        "first_name": "Sarah",
        "initials": "SC",
        "role": "Client lead · approves scope",
        "company": "Acme Finance",
        "phone": "+1 (415) 555-0142",
        "email": "sarah.chen@acmefinance.com",
        "best_time": "Weekdays 9–12 PT (from past replies)",
        "last_contact": "Email · Oct 8 · no reply",
        "authorized": True,
    },
    {
        "id": "james-park",
        "name": "James Park",
        "first_name": "James",
        "initials": "JP",
        "role": "Engineering lead",
        "company": "Acme Finance",
        "phone": "+1 (415) 555-0178",
        "email": "james.park@acmefinance.com",
        "best_time": "Afternoons PT",
        "last_contact": "Call · Oct 6",
        "authorized": True,
    },
    {
        "id": "priya-nair",
        "name": "Priya Nair",
        "first_name": "Priya",
        "initials": "PN",
        "role": "Marketing director",
        "company": "Acme Finance",
        "phone": "+1 (628) 555-0113",
        "email": "priya.nair@acmefinance.com",
        "best_time": "Mornings PT",
        "last_contact": "Slack · Oct 2",
        "authorized": True,
    },
]

MEMORY = [
    {"id": "scope", "category": "Scope", "statement": "Desktop and mobile layouts are included.",
     "source": "Gmail · Agreed Sep 12"},
    {"id": "launch", "category": "Commitments", "statement": "Launch two weeks after kickoff — Oct 17.",
     "source": "Kickoff call notes · Oct 3"},
    {"id": "people-sarah", "category": "People", "statement": "Sarah Chen — client lead.",
     "source": "Gmail · Sep 2"},
    {"id": "direction", "category": "Decisions", "statement": "Homepage uses an editorial, story-led direction.",
     "source": "Gmail · Oct 6"},
    {"id": "hosting", "category": "Decisions",
     "statement": "Studio North hands over Webflow hosting after launch; Acme keeps DNS and the domain.",
     "source": "Call with James Park · Oct 6"},
    {"id": "testimonials", "category": "Requirements", "statement": "Add client testimonials to the homepage.",
     "source": "Slack · Oct 6"},
]

BLOCKERS = [
    {"id": "tablet-approval", "title": "Approval of tablet scope",
     "meta": "Sarah Chen · requested Oct 7 · waiting 8 days", "badge": "Pending client", "tone": "warning",
     "contact_id": "sarah-chen", "resolved": False},
    {"id": "brand-assets", "title": "Brand assets (logos, fonts)",
     "meta": "Sarah Chen · promised “early next week” · Sep 29", "badge": "Overdue", "tone": "danger",
     "contact_id": "sarah-chen", "resolved": False},
]

APPROVALS = [
    {"id": "approve-tablet", "title": "Approve tablet layouts in scope", "meta": "Sarah Chen · since Oct 7",
     "status": "pending"},
    {"id": "new-date", "title": "New launch date if scope grows", "meta": "Depends on the approval above",
     "status": "open"},
]

DELIVERABLES = [
    {"id": "brand-assets", "title": "Brand assets (logos, fonts)", "meta": "From Acme · promised Sep 29",
     "badge": "Overdue", "tone": "danger"},
    {"id": "mobile-screens", "title": "Mobile screens to Sarah", "meta": "From you · due Fri Oct 10",
     "badge": "In 3 days", "tone": "info"},
]

CONVERSATIONS = [
    {"provider": "gmail", "title": "Re: Homepage direction + next steps", "meta": "Sarah Chen · Oct 7 · asks to add tablet"},
    {"provider": "slack", "title": "#acme-redesign — “Oct 17 is firm on our side”", "meta": "James Park · Oct 8"},
    {"provider": "gmail", "title": "Brand assets — follow-up", "meta": "You · Oct 8 · no reply"},
]

COMMITMENTS = [
    {"id": "mobile-screens", "date": "Fri Oct 10", "title": "Mobile screens to Sarah", "note": "You → Acme Finance",
     "badge": "In 3 days", "tone": "info"},
    {"id": "launch", "date": "Fri Oct 17", "title": "Launch", "note": "Agreed at kickoff",
     "badge": "At risk", "tone": "danger"},
    {"id": "editorial-review", "date": "No date", "title": "Editorial homepage review with Sarah",
     "note": "You → Acme Finance", "badge": None, "tone": None},
]

SETTINGS = {
    "voice_enabled": True,
    "calling_enabled": True,
    "captions": True,
    "voice": "aria",
    "language": "English (US)",
    "also_understands": "Spanish, French",
    "opening_line": "Hi {first_name}, this is Bracket, Maya’s AI assistant at Studio North. This call is recorded.",
    "on_behalf_of": "Maya Rao · Studio North",
    "caller_id": "+1 (628) 555-0199",
    "confirm_before_call": True,  # locked on — never configurable
    "only_authorized": True,
    "voicemail": False,
    "agree_dates_pricing": False,
    "calling_hours": "Weekdays 9:00–18:00, client’s time zone",
    "record_calls": True,
    "retention_days": 90,
    "max_minutes": 10,
}

VOICES = [
    {"id": "aria", "name": "Aria", "description": "Warm, mid-pitch · recommended for client calls"},
    {"id": "kai", "name": "Kai", "description": "Calm, lower pitch"},
    {"id": "noor", "name": "Noor", "description": "Bright and clear"},
]


def initial_workspace(user_id: str) -> dict:
    return {
        "user_id": user_id,
        "project": deepcopy(PROJECT),
        "contacts": deepcopy(CONTACTS),
        "memory": deepcopy(MEMORY),
        "blockers": deepcopy(BLOCKERS),
        "approvals": deepcopy(APPROVALS),
        "deliverables": deepcopy(DELIVERABLES),
        "conversations": deepcopy(CONVERSATIONS),
        "commitments": deepcopy(COMMITMENTS),
        "settings": deepcopy(SETTINGS),
        "action_items": [],
        "activity": [],
    }
