# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB.

## Recent Updates

### E2E Testing Complete (Feb 27, 2026) ✅

**Full E2E Testing Results:**
- Backend: 100% (8/8 tests passed)
- Frontend: 100% (all UI flows verified)

**Features Verified:**
| Test | Result |
|------|--------|
| Upload PDF document | ✅ PASS |
| Stamp appears on preview | ✅ PASS |
| Drag stamp (slow + fast) | ✅ PASS - Stamp stays visible |
| Switch stamp type | ✅ PASS - Position preserved |
| Preview Stamped PDF | ✅ PASS |
| Generate Verified Document | ✅ PASS |
| Scan Doc button | ✅ PASS - Visible and styled |
| Multi-page scan flow | ✅ PASS - Backend API verified |
| Certification + Print mode | ✅ PASS - Placeholder shown |
| Certification + Digital mode | ✅ PASS - Signature embedded |
| Notarization mode | ✅ PASS - No signature section |
| Change Document button | ✅ PASS - Visible and styled |
| Auto-cropped badge | ✅ PASS - Header returned |
| Document preview container | ✅ PASS - No clipping |

### Unified Document Preparation Pipeline (Feb 27, 2026) ✅

**New Endpoint:** `POST /api/documents/prepare`

Accepts any supported file and returns a normalized PDF:
- **PDF**: Validates and returns as-is
- **PNG/JPG/JPEG**: Converts to single-page A4 PDF with margins
- **Multi-image scan**: Merges all pages with auto-crop

**Response Headers:**
- `X-Prepared-Original-Type`: pdf|image|scan_multi
- `X-Prepared-Pages`: number of pages
- `X-Prepared-Filename`: original filename
- `X-Auto-Crop`: true|false
- `X-Crop-Confidence`: 0.0-1.0
- `X-Pages-Cropped`: number of pages auto-cropped

### Document Stamping UX Fixes (Feb 26-27, 2026) ✅

1. **Z-index stacking** - Overlay plane z-[999], Rnd z-[1000]
2. **Backend signature_data** - Added Form parameter with DB fallback
3. **Content-Type fix** - Removed manual header breaking FormData
4. **Position string keys** - Consistent JSON serialization
5. **Safe blob URL revoke** - Revokes in next tick after state update
6. **80ms debounce** - Near-instant switching feel
7. **Change Document button** - resetDocument() with fileInputKey
8. **Stamp drag fix** - Controlled Rnd with onDrag handler
9. **Bottom-right default position** - Stamp visible immediately

## Core Features

### Document Stamping ✅
- **WYSIWYG Preview**: Backend renders exact stamp PNG
- **Race Condition Guard**: Ignores stale responses
- **Unified Pipeline**: All files converted to PDF first
- **Signature Options**: Digital signature or sign-after-printing

### CamScanner-style Scanning ✅
- **Multi-page capture**: Add multiple scanned pages
- **Auto-crop**: OpenCV-based edge detection and perspective warp
- **Enhancement modes**: Document (gray), Color, Black & White
- **PDF merge**: All pages combined into single PDF

### Stamp Sizes
- Compact (Notarization): 140 × 75 PT
- Certification (with signature): 150 × 95 PT

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/prepare` | POST | Convert any file to PDF with auto-crop |
| `/api/documents/stamp` | POST | Generate final stamped PDF |
| `/api/stamps/render-image` | POST | Generate stamp PNG preview |
| `/api/verify/stamp/{id}` | GET | Verify stamp authenticity |

## Architecture

### Document Flow
```
User Upload → /prepare → PDF → pdf.js render → Stamp overlay → /stamp → Final PDF
```

### Supported File Types
| Type | Status |
|------|--------|
| PDF | ✅ Direct |
| PNG/JPG/JPEG | ✅ Converted to PDF |
| Camera | ✅ Converted to PDF |
| Multi-image Scan | ✅ Merged with auto-crop |
| DOC/DOCX | ⏳ Pending Gotenberg |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |

## Bug Fix History

### Critical Fix #1: Document Stamping Failure (RESOLVED) ✅
**Root Cause:** The `File` import from lucide-react was shadowing JavaScript's native `File` constructor.

### Critical Fix #2: Stamp Overlay Not Visible (RESOLVED) ✅
**Root Cause:** Multiple code paths were setting stamp position to top-center before document dimensions were known.

### Critical Fix #3: Stamp Disappears During Drag (RESOLVED) ✅
**Root Cause:** The Rnd component's controlled `position` prop caused visual glitches during drag.
**User Verification:** PENDING - User should verify on Microsoft Edge

## Backlog

### P0 (Critical) - COMPLETED ✅
- ~~Fix stamping failure~~ (COMPLETED)
- ~~Fix stamp visibility~~ (COMPLETED)
- ~~Fix stamp drag disappearing~~ (COMPLETED)
- ~~E2E testing of full stamp flow~~ (COMPLETED)

### P1 (High Priority)
- Real-world PDF stress testing (use `/api/admin/pdf/validate`)
- Add UI dropdown for scan mode selection (gray/color/bw)
- Finalize signature placement inside stamp placeholder
- Harden "Failed to stamp document" error handling with better logging

### P2 (Medium Priority)
- Deploy Gotenberg for DOCX support
- Backend monolith refactoring (break down server.py)
- Sticky "Stamp Controls" bar above preview
- Audit Practice Management modules

### P3 (Future)
- Google Calendar sync
- KwikPay payment integration
- Personal recurring events
