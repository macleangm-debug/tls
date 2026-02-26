# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB.

## Recent Fixes (Feb 26, 2026) - Document Stamping UX Polish

### A) Backend: Signature Box Alignment (FIXED)
- **Problem**: Digital signature was pasting at different coordinates than the placeholder line
- **Solution**: Defined single `SIG_BOX` using same coordinates for both:
  - `sig_area_x = pad + int(60 * scale)` 
  - `sig_area_w = (W - pad - int(60 * scale)) - sig_area_x`
- **Result**: Signature always lands inside exact placeholder region

### B) Frontend: Signature Canvas Sizing (FIXED)
- **Problem**: Canvas was hard-coded 280x100 but CSS used `w-full`, causing lag and cutoff
- **Solution**: 
  - Added `sigWrapRef` and `sigCanvasSize` state
  - ResizeObserver dynamically sets canvas width to match container
  - Added `touch-none` class to prevent scroll interference
- **Result**: No more lag or clipping when drawing signatures

### C) Position Persistence (FIXED)
- **Problem**: Stamp re-centered when switching between Certification/Notarization
- **Solution**: 
  - Store ONE position per page (not per type)
  - On type switch: CLAMP existing position to new bounds (don't recenter)
  - Only center if no position exists yet
- **Result**: Stamp stays in place when switching types

### D) Loading Feel Eliminated (FIXED)
- **Problem**: Full spinner replaced stamp during loading, making UI feel slow
- **Solution**:
  - Keep previous `stampPreviewImage` visible while loading new one
  - Show tiny "Updating" badge in corner only when loading
  - Full spinner only shown if no image exists yet
- **Result**: Switching feels instant

### E) Stamp Sizes (Reduced)
- Compact (Notarization): 140 × 75 PT
- Certification (with signature): 150 × 95 PT

## Core Features

### Document Stamping - Rock-Solid UX ✅
- **WYSIWYG Preview**: Backend renders exact stamp PNG via `/stamps/render-image`
- **Race Condition Guard**: `previewReqIdRef` ignores stale responses
- **Blob URL Lifecycle**: `stampBlobUrlRef` for safe memory management
- **State Normalization**: Notarization forces `signatureMode="none"`
- **SIG_BOX Alignment**: Signature pastes into exact placeholder region

### Signature Options
- `Use Digital Signature`: Embeds saved signature (certification only)
- `Sign After Printing`: Shows placeholder line for physical signature

### Page Selection
- First Page, Last Page, All Pages, Custom selection

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
- P1: Real-world PDF stress testing (30-50 diverse documents)
- P1: Audit Practice Management modules
- P2: Personal recurring events
- P2: Backend monolith refactoring
- P2: Google Calendar sync
