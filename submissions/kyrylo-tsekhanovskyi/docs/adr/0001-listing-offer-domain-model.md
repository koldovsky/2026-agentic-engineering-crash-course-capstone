# 0001. Listing + Offer domain model

- Status: accepted · Date: 2026-09-27 · Decided by: human (after a diagram comparison in planning)

## Context
One ad often sells several parts (a "bundle": inverter + battery). Negotiation happens per ad and per
seller, but whether the part fits, and its price, is per part.

## Decision
- Project 1–N Item; Project 1–N Listing; Item 1–N Offer N–1 Listing. A bundle ad is one Listing with
  several Offers.
- The status is split three ways: **negotiation** status on Listing
  (`Found → Contacted → Negotiating → Agreed → Purchased → Received | NotResponding | Declined | Scam`),
  **fit** on Offer (`Unverified | Fits | NotQuiteRight | WrongItem`), and **sourcing** on Item
  (`Needed | Sourcing | Ordered | Received`).
- An Offer's Item and Listing belong to the same Project. There is at most one chosen Offer per Item,
  and an Item cannot be linked to the same Listing twice. Deleting a Listing deletes its Offers.
- Any Listing status transition is allowed in MVP-1.

## Consequences
- Bundles are modelled without duplicating the seller conversation.
- There is no Seller entity yet, so a scammer flag cannot follow a seller across ads. That is a later change.
- Status history is deferred; only `statusChangedAt` is stored.
