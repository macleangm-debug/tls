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

## Backlog
- P1: Test full stamping flow end-to-end
- P1: Real-world PDF stress testing
- P2: Deploy Gotenberg for DOCX support
- P2: Personal recurring events
- P2: Backend monolith refactoring
