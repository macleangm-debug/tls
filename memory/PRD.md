# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB.

## Recent Updates

### Presentation Fixes and Local Images (Mar 4, 2026) ✅

**Issues Fixed:**
- Fixed "Objects are not valid as React child" error when navigating through slides
- Fixed capabilities rendering (objects with {title, desc} were being rendered as strings)
- Added null guard for undefined slide data
- Created comprehensive default handler for unhandled slide types

**Local Image Integration:**
- Generated 8 custom images using AI image generation for offline/print support
- Images stored in `/frontend/public/images/presentation/`:
  - legal_professional.png, document_signing.png, digital_security.png
  - qr_verification.png, stamp_seal.png, legal_team.png
  - tanzania_business.png, legal_documents.png
- Replaced external Unsplash/Pexels URLs with local paths
- All 28 slides now navigate without errors

### Product Presentation Feature (Mar 4, 2026) ✅

**In-App Product Presentation Complete:**
- 28-slide comprehensive presentation for TLS stakeholders
- Accessible via SuperAdmin Dashboard → Documents → Product Presentation
- Route: `/super-admin/presentation`
- Features:
  - Auto-play mode with configurable slide duration
  - Manual navigation (Previous/Next/Direct slide selection)
  - Fullscreen presentation mode
  - **Export to PDF** functionality with progress indicator
- Each slide contains detailed descriptions covering:
  - Platform overview and executive summary
  - Problems being solved with impact metrics
  - Technical implementation (stamping workflow, security)
  - Revenue model and pricing structure
  - Benefits for Advocates, TLS, and the Public
  - Implementation roadmap and success metrics
  - Support and training programs

**Files:**
- `frontend/src/pages/ProductPresentation.jsx` (1858 lines)

### Feature Completion (Mar 1, 2026) ✅

**Four Features Verified:**
1. **Batch Stamping Fix** - Fixed endpoint URL and axios headers. CSRF exemption added for batch-stamp endpoint.
2. **Case Hearings/To-Do Calendar Sync** - Fixed endpoint for calendar sync (`/api/practice/events`)
3. **Test Profile Content** - Populated test user's public profile with full professional content
4. **Scan Mode Dropdown** - Already implemented in DocumentStampPage (Gray/Color/B&W options)

**Gotenberg Integration (Mar 1, 2026) ✅**
- Created `backend/services/gotenberg_service.py` for DOCX/DOC to PDF conversion
- Supports LibreOffice endpoint (`/forms/libreoffice/convert`)
- Falls back to python-docx when Gotenberg unavailable
- Admin endpoint `/api/admin/services/status` to check Gotenberg health
- Environment variable: `GOTENBERG_URL` (e.g., `http://gotenberg:3000`)

**LibreOffice Integration (Mar 2, 2026) ✅**
- Installed LibreOffice Writer and Calc in the container
- Created `backend/services/libreoffice_service.py` for local document conversion
- **Supported Input Formats**: 
  - Documents: PDF, DOCX, DOC, ODT, RTF
  - Spreadsheets: XLSX, XLS, ODS  
  - Presentations: PPTX, PPT, ODP
  - Images: PNG, JPG (direct upload)
  - Text: TXT, HTML
- **Document Scanning**: Multi-page scanning with auto-crop and enhancement
- Full formatting preservation (tables, images, fonts, styling)
- Conversion priority: LibreOffice (local) > Gotenberg (remote) > python-docx (fallback)

**Backend Refactoring (Mar 3, 2026) ✅**
- Created modular structure with `models/`, `utils/`, `routes/`, `services/` directories
- Extracted 40+ Pydantic models to `models/schemas.py`
- Extracted helper functions to `utils/helpers.py` (ID generators, QR codes, validators)
- **New Route Modules Created:**
  - `routes/verification.py` (269 lines) - Public stamp verification
  - `routes/profile.py` (272 lines) - Advocate profile management
  - `routes/orders.py` (306 lines) - Stamp and physical orders
  - `routes/auth.py` (739 lines) - Authentication (existing)
  - `routes/membership.py` (207 lines) - Membership management (existing)
  - `routes/notifications.py` (385 lines) - Push notifications (existing)
  - `routes/tls_events.py` (780 lines) - TLS events (existing)
- Total extracted: ~3000+ lines into organized modules
- server.py remains at ~8700 lines (further extraction possible)

### Security Features & UI Improvements (Mar 1, 2026) ✅

**Features Implemented:**
1. **Confirmation Modal System** - Global confirmation modal provider for critical actions
   - Sign Out button now shows confirmation dialog
   - Reusable `useConfirmation()` hook for any component
   - Supports danger/warning/success/info variants

2. **PIN Lock Security Feature** - Full PIN-based security system
   - `/pin-settings` page for PIN management
   - Setup, change, and disable PIN flows
   - Auto-lock after inactivity (configurable 1-30 minutes)
   - Per-page locking (Practice Management, Stamp Ledger, Profile)
   - PIN stored in localStorage for device-level protection

3. **Sidebar Navigation Updated**
   - Added "PIN & Security" link under Account section
   - All navigation groups visible with scrollable sidebar

4. **Profile Photo Upload Fix**
   - Removed manual Content-Type header that caused CSRF errors
   - FormData now correctly handled by browser

**Files Created/Modified:**
- `frontend/src/components/SecurityModals.jsx` - ConfirmationProvider, PinLockProvider, PageLockGuard
- `frontend/src/pages/PinSettingsPage.jsx` - PIN settings UI
- `frontend/src/App.js` - Added providers and routes
- `frontend/src/pages/AdvocateDashboard.jsx` - Sign out confirmation, sidebar nav

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
| DOCX/DOC | ✅ LibreOffice conversion |
| XLSX/XLS | ✅ LibreOffice conversion |
| PPTX/PPT | ✅ LibreOffice conversion |
| ODT/ODS/ODP | ✅ LibreOffice conversion |
| RTF | ✅ LibreOffice conversion |

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
- ~~Product Presentation with PDF Export~~ (COMPLETED - Mar 4, 2026)

### P1 (High Priority)
- Real-world PDF stress testing (use `/api/admin/pdf/validate`)
- Harden "Failed to stamp document" error handling with better logging

### P2 (Medium Priority)
- Google Calendar sync (paused - requires user's Google API credentials)
- Continue Backend monolith refactoring (extract remaining routes from server.py)
- KwikPay payment integration
- Auto-updating Help Center mechanism

### P3 (Future)
- Sticky "Stamp Controls" bar above preview
- Personal recurring events
- E-filing integration
