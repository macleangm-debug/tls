# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB. The platform has evolved into a certification authority-grade trust infrastructure with cryptographic signing, tamper-proof verification, and regulatory-grade audit trails.

## Go-Live System Packet
**Full documentation available at:** `/app/GO_LIVE_SYSTEM_PACKET.md`

## Core Features Implemented

### Security
- Enterprise-grade JWT authentication with HttpOnly cookies
- Full CSRF protection

### Membership Billing System (Feb 26, 2026) ✅
- **IDC Control Panel** at `/super-admin/membership` for Super Admins
- **Policy Configuration**: Enable/disable billing, set pricing, choose billing mode (fixed/subscription)
- **Enforcement Modes**: warn_only, block_stamping, block_all
- **Grace Period**: Configurable 0-30 days after membership expiry
- **Advocate Status Banners**: Grace period warning (amber), Blocked state (red)
- **Stamping Disabled** when blocked: Buttons show lock icon, "Membership Required" text

### Document Stamping - Rock-Solid UX (Feb 26, 2026) ✅ 
- **WYSIWYG Preview via `/stamps/render-image`**: Frontend uses exact PNG from backend
- **Race Condition Guard**: `previewReqIdRef` ignores stale API responses during rapid toggling
- **Blob URL Lifecycle**: `stampBlobUrlRef` safely manages blob URLs (revoke before create)
- **State Normalization**: Notarization forces `signatureMode="none"` automatically
- **Reduced Stamp Sizes** (quarter-page feel):
  - Compact (Notarization): 140 × 75 PT
  - Certification (with signature): 150 × 95 PT
- **Signature Options**:
  - `Use Digital Signature`: Embeds saved signature (certification only)
  - `Sign After Printing`: Shows placeholder line for physical signature
- **Strict Signature Rules**:
  - `includeSignature`: certification + digital mode + has saved signature
  - `showPlaceholder`: certification + print mode (NOT based on "!includeSignature")
  - Notarization: ALWAYS forced to no signature (backend + frontend normalization)
- **Stamp Centering**: Auto-centers on PDF load, re-centers on dimension change
- **Page Selection**: First Page, Last Page, All Pages, Custom selection

### Calendar & Events (Feb 26, 2026) ✅
- **FullCalendar Widget**: Professional month/week/day views
- **Professional Actions**: Mark Complete, Cancel, Reschedule, Create Task
- **Drag-and-Drop**: Quick event rescheduling
- **TLS Global Events**: Organization-wide events on all advocate calendars

### Notification System (Feb 23, 2026) ✅
- **In-App Notifications**: Bell icon with dropdown
- **Email Notifications**: Event reminders via Resend
- **User-Configurable Preferences**: Toggle in-app/email

## Recent Changes

### Feb 26, 2026 - Document Stamping UX Stability Fix - COMPLETE ✅
**Fixed the "stamp disappears after toggling" bug:**

**Root Causes Identified:**
1. Race conditions from multiple `fetchStampPreview()` calls returning out-of-order
2. Blob URLs being revoked prematurely while React still rendering
3. State not normalized for notarization (signature artifacts appearing)
4. Double-scaling in coordinate calculations

**Fixes Implemented:**
1. **Race Condition Guard (`previewReqIdRef`)**: Increment before each request, ignore response if `reqId !== current`
2. **Blob URL Management (`stampBlobUrlRef`)**: Store URL in ref, revoke only when replaced or on unmount
3. **State Normalization**: `useEffect` forces `signatureMode="none"` when `selectedType === "notarization"`
4. **Coordinate System Fix**: Use unscaled coordinates for Rnd, scale only for display
5. **Stamp Size Reduction**: Per user request, reduced PT sizes for quarter-page feel
6. **Signature Toggle UX**: Toast message if clicking "Use Digital Signature" without saved signature

**Files Modified:**
- `frontend/src/pages/DocumentStampPage.jsx`: Major refactor of `fetchStampPreview`, Rnd coordinates, state management
- `backend/server.py`: Updated `render-image` endpoint with new stamp sizes (140x75, 150x95)

**Test Report:** `/app/test_reports/iteration_61.json` - 100% pass rate (backend + frontend)

## Architecture

### Frontend Structure
```
frontend/src/
├── components/
│   ├── NotificationBell.jsx
│   ├── MembershipStatusBanner.jsx
│   ├── practice-management/
│   └── ui/
├── pages/
│   ├── DocumentStampPage.jsx     # Rock-solid stamping with race condition fixes
│   ├── BatchStampPage.jsx
│   └── ...
└── context/
    └── AuthContext.js
```

### Backend Structure
```
backend/
├── routes/
│   ├── notifications.py
│   ├── auth.py
│   ├── tls_events.py
│   └── membership.py
├── services/
│   ├── stamp_image_service.py
│   ├── pdf_overlay_service.py
│   └── stamping_service.py
└── server.py
```

## Key API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/stamp` | POST | Generate final stamped PDF |
| `/api/documents/stamp-preview-pdf` | POST | Preview stamped PDF (watermarked) |
| `/api/stamps/render-image` | POST | Generate stamp PNG for WYSIWYG preview |
| `/api/stamps` | GET | Paginated stamp ledger |
| `/api/stamps/{id}/revoke` | POST | Revoke stamp with reason |
| `/api/verify/stamp/{id}` | GET | Public verification |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |
| TLS Admin | admin@tls.or.tz | TLS@Admin2024 |
| Super Admin | superadmin@idc.co.tz | IDC@SuperAdmin2024 |

## Tech Stack
- Frontend: React 18, Shadcn UI, TailwindCSS, react-rnd
- Backend: FastAPI, MongoDB
- Libraries: PIL, qrcode, cryptography (ECDSA), pdf.js, resend

## Known Limitations
- KwikPay payment integration is mocked

## Backlog
- P1: Real-world PDF stress testing (30-50 diverse documents)
- P1: Audit Practice Management modules (Clients, Cases, Invoices)
- P2: Personal recurring events for advocate calendars
- P2: Backend monolith refactoring (`server.py` → `routes/`)
- P2: Google Calendar sync
- P2: CPD Compliance module
- P3: Key rotation mechanism for crypto signing
