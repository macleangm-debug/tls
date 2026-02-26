# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB.

## Recent Fixes (Feb 26, 2026) - Document Stamping UX Polish - FINAL

### A) Backend: Signature Box Alignment (SIG_BOX) ✅
- **Problem**: Digital signature pasting at different coordinates than placeholder line
- **Solution**: Single `SIG_BOX` with shared `sig_area_x`, `sig_area_y`, `sig_area_w`, `sig_area_height`
- **Result**: Signature always lands inside exact placeholder region

### B) Frontend: Race Condition Guard ✅
- **Problem**: Stamp preview disappearing when rapidly toggling options
- **Solution**: 
  - `previewReqIdRef` to ignore stale API responses
  - Safe blob URL revoke (revoke AFTER state update in next tick)
  - 80ms debounce (feels instant)
- **Result**: Rapid toggling no longer breaks the stamp

### C) Frontend: Signature Validation ✅
- **Problem**: Invalid signature data breaking preview
- **Solution**: `hasValidSig` guard checks length > 100 and base64 format
- **Result**: Prevents "digital signature breaks preview" case

### D) Frontend: Position Persistence ✅
- **Problem**: Stamp re-centering when switching types
- **Solution**: 
  - Removed page-change recenter effect
  - Clamp effect only clamps, never recenters
  - `getStampPosition()` centers by default if missing
- **Result**: Stamp stays in place when switching types

### E) Frontend: Change Document Button ✅
- **Problem**: User couldn't easily upload a different document
- **Solution**: 
  - Added `resetDocument()` function
  - "Change" button next to filename
  - `fileInputKey` for input remount
- **Result**: Users can easily swap documents

### F) Frontend: Signature Canvas Sizing ✅
- **Problem**: Canvas lag and cutoff
- **Solution**: 
  - `sigWrapRef` + `sigCanvasSize` state
  - ResizeObserver for dynamic sizing
  - `touch-none` class
- **Result**: No lag or clipping

## Core Features

### Document Stamping ✅
- **WYSIWYG Preview**: Backend renders exact stamp PNG via `/stamps/render-image`
- **Race Condition Guard**: Ignores stale responses during rapid toggling
- **Blob URL Safety**: Revoke after state update, not before
- **State Normalization**: Notarization forces `signatureMode="none"`

### Stamp Sizes (Reduced for quarter-page feel)
- Compact (Notarization): 140 × 75 PT
- Certification (with signature): 150 × 95 PT

### Signature Options
- `Use Digital Signature`: Embeds saved signature (certification only)
- `Sign After Printing`: Shows placeholder line for physical signature

## Key API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/stamp` | POST | Generate final stamped PDF |
| `/api/stamps/render-image` | POST | Generate stamp PNG for preview |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |

## Tech Stack
- Frontend: React 18, Shadcn UI, TailwindCSS, react-rnd, react-signature-canvas
- Backend: FastAPI, MongoDB, PIL

## Backlog
- P1: Real-world PDF stress testing
- P1: Audit Practice Management modules
- P2: Personal recurring events
- P2: Backend monolith refactoring
- P2: Google Calendar sync
