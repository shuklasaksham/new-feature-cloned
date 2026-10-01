# Plan: Product Hunt badge on the homepage hero

## Goal
Add the official Product Hunt "Featured" badge to the Bracket homepage, in the hero section, directly below the existing **Get started** / **See pricing** buttons.

## What will be added
The badge, used exactly as provided (no theme or wording changes):
- Links to the Bracket Product Hunt page, opens in a new tab, with safe `rel="noopener noreferrer"`.
- Renders the official Product Hunt "Featured" image (250×54), light theme.

## Placement and behavior
- Sits in the hero, just under the two call-to-action buttons.
- Left-aligned to match the existing hero layout (not centered), with comfortable spacing above it so it reads as a distinct launch badge, not a third button.
- No change to the hero copy, the existing buttons, or any other section.
- Desktop-only app already, so no separate mobile treatment is needed.

## Notes
- The badge is an external image served by Product Hunt; it loads from their domain as intended by the embed.
- This is a static, presentational addition — no backend, data, or tracking changes.

## Out of scope
- No changes to the existing Product Hunt launch ribbon/offer logic already in the app.
- No theme restyle of the badge (kept light per request).
