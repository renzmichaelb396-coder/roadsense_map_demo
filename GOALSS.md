# GOALSS — RoadSense PH LGU Master Scope (LOCKED v1)

## Purpose
RoadSense PH is an LGU-first road hazard intelligence system designed for
field operations, prioritization, accountability, and reporting.

## System Components

### Mobile App (Field Operations)
- Structured hazard capture using center-pin placement
- Severity levels: HIGH / MED / LOW
- Hazard type selection
- Local-first storage (AsyncStorage)
- Resolve and delete flows with accountability
- Designed for speed and reliability in the field

### LGU Dashboard (Office Operations)
- Read-only dashboard for LGU staff
- Displays all reported hazards with:
  - Location
  - Severity
  - Type
  - Status (Active / Resolved)
- Severity-based prioritization
- Historical visibility of resolved hazards
- Printable reports for meetings, audits, and documentation

### Data Flow
- Mobile app pushes hazard data to Supabase (fire-and-forget)
- Dashboard reads from Supabase only
- No realtime synchronization
- No public write access

## Explicitly Out of Scope (v1)
- Barangay or district aggregation
- Consumer navigation features
- Public reporting portals
- Realtime updates or subscriptions
- Predictive analytics or AI
- Any redesign of the LGU map UX

## Product Philosophy
- LGU-first, operations-focused
- Preserve solved work
- Avoid feature creep
- Optimize for adoption, not novelty
- Ship stable, pitch fast

This document defines the locked scope of GOALSS v1.
Any changes require explicit scope revision.
