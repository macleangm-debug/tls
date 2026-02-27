# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB.

## Recent Updates

### Unified Document Preparation Pipeline (Feb 27, 2026) ✅

**New Endpoint:** `POST /api/documents/prepare`

Accepts any supported file and returns a normalized PDF:
- **PDF**: Validates and returns as-is
- **PNG/JPG/JPEG**: Converts to single-page A4 PDF with margins
- **DOC/DOCX**: Returns friendly error (Gotenberg integration ready)

**Response Headers:**
- `X-Prepared-Original-Type`: pdf|image|docx
- `X-Prepared-Pages`: number of pages
- `X-Prepared-Filename`: original filename
- `X-Prepared-Source`: upload|camera

**Benefits:**
- Unified preview pipeline (everything becomes PDF)
- Consistent coordinate space for stamping
- Camera capture ready (mobile-friendly)
- Future-proof for Gotenberg DOCX conversion

### Document Stamping UX Fixes (Feb 26-27, 2026) ✅

1. **Z-index stacking** - Overlay plane z-[999], Rnd z-[1000]
2. **Backend signature_data** - Added Form parameter with DB fallback
3. **Content-Type fix** - Removed manual header breaking FormData
4. **Position string keys** - Consistent JSON serialization
5. **Safe blob URL revoke** - Revokes in next tick after state update
6. **80ms debounce** - Near-instant switching feel
7. **Change Document button** - resetDocument() with fileInputKey

## Core Features

### Document Stamping ✅
- **WYSIWYG Preview**: Backend renders exact stamp PNG
- **Race Condition Guard**: Ignores stale responses
- **Unified Pipeline**: All files converted to PDF first
- **Signature Options**: Digital signature or sign-after-printing

### Stamp Sizes
- Compact (Notarization): 140 × 75 PT
- Certification (with signature): 150 × 95 PT

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/prepare` | POST | Convert any file to PDF |
| `/api/documents/stamp` | POST | Generate final stamped PDF |
| `/api/stamps/render-image` | POST | Generate stamp PNG preview |

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
| DOC/DOCX | ⏳ Pending Gotenberg |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |

## Gotenberg Integration (Future)

When ready to add DOCX support:

```yaml
# Docker Compose
services:
  gotenberg:
    image: gotenberg/gotenberg:8
    ports:
      - "3000:3000"
```

Set environment variable:
```
GOTENBERG_URL=http://gotenberg:3000
```

The `/documents/prepare` endpoint will automatically use Gotenberg for DOC/DOCX files.

## Recent Bug Fixes (Feb 27, 2026) ✅

### Critical Fix #1: Document Stamping Failure
**Root Cause:** The `File` import from lucide-react was shadowing JavaScript's native `File` constructor.

**Symptom:** When clicking "Generate Verified Stamp", the error "Failed to stamp" occurred with console showing `lucide_react__WEBPACK_IMPORTED_MODULE_35___.default is not a constructor`.

**Fix Applied:**
1. Renamed import from `File` to `FileIcon` in lucide-react imports
2. Updated `DOCUMENT_TYPES` array to use `FileIcon` instead of `File`
3. Fixed the `handleStampDocument` function to properly convert `fileData.document_data` (base64) back to a native `File` object

**Files Modified:** `/app/frontend/src/pages/DocumentStampPage.jsx`

**Verification:** Complete stamping flow tested end-to-end with stamp ID `TLS-20260227-496C9175` generated successfully.

### Critical Fix #2: Stamp Overlay Not Visible
**Root Cause:** Multiple code paths were setting stamp position to top-center (y=50) before document dimensions were known.

**Symptom:** After uploading a document, the stamp overlay was positioned outside the visible preview area.

**Fix Applied:**
1. Changed default stamp position from center to **bottom-right** (common for legal documents)
2. Added `isFirstDocLoad` flag to force bottom-right positioning when document is first loaded
3. Updated all position initialization code paths (renderPage, applyTemplate, useEffect hooks)

**Files Modified:** `/app/frontend/src/pages/DocumentStampPage.jsx`

**Verification:** Stamp now appears at bottom-right corner of document preview immediately after upload.

### Critical Fix #3: Stamp Disappears During Drag (Microsoft Edge)
**Root Cause:** The Rnd component's controlled `position` prop caused visual glitches during drag as React re-renders tried to reset position.

**Symptom:** On Microsoft Edge, when dragging the stamp to reposition it, the stamp would disappear during the drag motion.

**Fix Applied:**
1. Added `onDragStart` and `onDrag` handlers to properly manage dragging state
2. Added `isDragging` state flag to prevent render conflicts during drag
3. Added GPU rendering optimizations (`will-change: transform`, `backfaceVisibility: hidden`)
4. Added `touchAction: 'none'` for better touch/pointer event handling
5. Added visual feedback with `cursor-grabbing` during drag

**Files Modified:** `/app/frontend/src/pages/DocumentStampPage.jsx`

**Verification:** Stamp remains visible throughout drag operation on all browsers.

## Backlog
- ✅ ~~P0: Fix stamping failure~~ (COMPLETED)
- ✅ ~~P1: Fix stamp visibility~~ (COMPLETED)
- ✅ ~~P1: Fix stamp drag disappearing~~ (COMPLETED)
- P1: Real-world PDF stress testing (use `/api/admin/pdf/validate`)
- P1: Add UI dropdown for scan mode selection (gray/color/bw)
- P2: Deploy Gotenberg for DOCX support
- P2: Personal recurring events
- P2: Backend monolith refactoring
- P2: Google Calendar sync
- P2: KwikPay payment integration
