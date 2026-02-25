# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite for advocates built with React, FastAPI, and MongoDB.

## Core Features Implemented

### Security
- Enterprise-grade JWT authentication with HttpOnly cookies
- Full CSRF protection

### Practice Management Dashboard
- Analytics dashboard with charts (Cases by Status, Cases by Type, Revenue Trend)
- Tab-based navigation: Dashboard, Clients, Cases, Documents, Calendar, Tasks, Invoices, Templates, Messages

### Document Suite
- **Document Generator**: Create PDFs from templates
- **Document Vault**: Table/Card view toggle, upload, download, share, delete
  - "Demo" badges for seed data documents
  - Proper error handling for demo document downloads
- Digital signatures and QR stamping
- **Batch Stamping** (Feb 25, 2026): Stamp up to 25 documents at once
- **Stamp Ledger** (NEW - Feb 25, 2026): Regulatory-grade stamp management with audit trail

### Calendar & Events (Enhanced Feb 22, 2026)
- Dual view: List and Calendar widget
- Event creation modal with date/time picker
- Actions: View, Edit, Duplicate, Mark Complete, Set Reminder, Delete
- Event status tracking (scheduled, completed, cancelled)

### Notification System (Feb 23, 2026) ✅
- **In-App Notifications**: Bell icon in header, dropdown with notification list
- **Email Notifications**: Event reminders via Resend email integration
- **User-Configurable Preferences**: Toggle in-app/email for reminders, calendar, tasks, system
- **Reminder Timing**: Configurable (5min, 15min, 30min, 1hr, 2hr, 1day, 2days)
- **Background Scheduler**: Checks for upcoming events every 5 minutes

### Cases Management (Enhanced Feb 22, 2026)
- Table/Card view toggle
- Status Actions: Set Active, Set Pending, Put On Hold, Close Case, Delete
- Status change via dedicated PATCH endpoint

### Seed Data
- `/api/dev/seed` endpoint populates database with demo data

## Recent Changes

### Feb 25, 2026 - Bulk Revoke (Admin Safety Control) - COMPLETE ✅
**Regulatory-grade bulk stamp invalidation for compliance:**
- **Super Admin Only**: Regular admins cannot access this feature
- **Use Cases**: License suspended, disbarred, account compromised
- **Safety Controls**:
  - Confirmation text required ("REVOKE" or advocate's full name)
  - Reason must be at least 10 characters
  - Irreversible action
- **Audit Logging**:
  - Individual `STAMP_REVOKED` event per stamp with `bulk=true`, `batch_revoke_id`
  - `ADVOCATE_BULK_REVOKE` system audit event with full details
- **API Endpoints**:
  - `GET /api/admin/advocates/{id}/stamp-summary` - Active/revoked/expired counts
  - `POST /api/admin/advocates/{id}/bulk-revoke` - Execute bulk revoke
  - `GET /api/admin/bulk-revoke-history` - Audit history
- **Frontend**: "Super Admin Actions" section in Manage Advocate dialog with confirmation modal
- **Test Report**: `/app/test_reports/iteration_55.json` - 100% pass rate (15/15 backend, all frontend)

### Feb 25, 2026 - Advocate Stamp Ledger - COMPLETE ✅
**Regulatory-grade stamp management for compliance:**
- **Frontend**: `/stamp-ledger` route with full management UI
- **Features**:
  - Paginated stamp list with filters (status, search, date range)
  - Stats cards: Total/Valid/Revoked/Expired counts
  - Stamp detail modal with verification URL, document hash
  - Revoke stamp with reason (audit logged)
  - Audit trail timeline (STAMP_ISSUED, STAMP_VERIFIED, STAMP_REVOKED)
  - CSV export with filters applied
- **API Endpoints**:
  - `GET /api/stamps` - Paginated list with filters
  - `GET /api/stamps/{id}` - Full stamp details
  - `POST /api/stamps/{id}/revoke` - Revoke with reason
  - `GET /api/stamps/{id}/events` - Audit trail
  - `GET /api/stamps/export.csv` - CSV download
  - `GET /api/admin/stamps` - Admin view (all advocates)
- **Test Report**: `/app/test_reports/iteration_54.json` - 100% pass rate (18/18 backend, all frontend)

### Feb 25, 2026 - Batch Stamping Feature - COMPLETE ✅
**New feature for high-volume advocates:**
- **Endpoint**: `POST /api/documents/batch-stamp`
- **Limits**: 25 files max, 10MB each, 200MB total, 50 pages per PDF
- **Features**:
  - Each document gets unique stamp_id, QR code, SHA256 hash binding
  - Anchor-based positioning (7 options: bottom_right default)
  - Page mode: First page only OR all pages
  - Returns ZIP with stamped PDFs + batch_summary.csv
- **Frontend**: New `/batch-stamp` route with drag-drop upload
- **Test Report**: `/app/test_reports/iteration_53.json` - 100% pass rate

**Backend Services Refactored:**
```
backend/services/
├── __init__.py
├── stamp_image_service.py    # PIL stamp image generation
├── pdf_overlay_service.py    # PDF embedding with anchor positioning
└── stamping_service.py       # Orchestration for single & batch stamping
```

### Feb 25, 2026 - Layout & Margin Fixes ✅
**Fixed two user-reported issues:**
1. **Layout Not Applied**: Removed misleading layout options from "My Stamps" since TLS uses a single standardized stamp design
   - Replaced 5 layout options with 3 size presets (Small/Medium/Large)
   - Updated completion steps: Name → Color → Size
   - Shape options simplified to Rectangle only (official TLS design)
2. **Margin Now Functional**: "Safe Margin" slider now properly constrains stamp placement
   - Frontend clamps drag position to stay within margin from page edges
   - Backend verifies and applies same clamping: `x in [margin, pageWidth - stampWidth - margin]`
   - Margin value shown in PDF points (pt) for clarity

### Feb 25, 2026 - Bug Fixes for Digital Signature & PDF Download ✅
**Fixed two user-reported issues:**
1. **Digital Signature Preview Issue**: When selecting "Use Digital Signature" mode without a saved signature, the stamp preview was disappearing.
   - **Root Cause**: Logic incorrectly determined `showPlaceholder` when digital mode selected but no signature saved
   - **Fix**: Updated `hasDigitalSignature` check to properly handle the case and show placeholder when needed
2. **PDF Download Issue**: Downloaded PDFs couldn't be opened outside the system
   - **Root Cause**: Using data URLs for large PDFs caused browser compatibility issues
   - **Fix**: Changed download functions to use Blob URLs with proper cleanup for better browser support

### Feb 25, 2026 - Stamp Architecture E2E VERIFIED ✅
**Complete stamping feature verification after SSOT architecture overhaul:**
- **Testing Agent Results**: 10/10 backend tests passed, all frontend flows verified
- **Verified Features**:
  1. ✅ Upload + Preview: PDF upload works, stamp preview visible on canvas (compact card design)
  2. ✅ Placement Coordinates: 4 corners + center tested, no Y-flip issues, no drift
  3. ✅ Generate Stamped PDF: Stamp correctly sized (240x128 pt), not blurry, opens in browser
  4. ✅ QR + Verification: `/api/verify/stamp/{id}` returns valid=true with full details
  5. ✅ Digital Signature Mode: Both certification (with sig) and notarization (no sig) working
- **Stamp Spec Locked**:
  - Fixed size: 240x128 PDF points (compact card ratio 560:300)
  - Only `border_color` is user-configurable (TLS green branding is fixed)
  - One canonical template for both preview and PDF
- **Test Report**: `/app/test_reports/pytest/stamp_ssot_arch_results.xml`

### Feb 25, 2026 - Stamp Preview Single Source of Truth - COMPLETE ✅
**Achieved pixel-perfect stamp preview by unifying rendering engines:**
- **Problem**: Frontend CSS preview didn't match backend PIL stamp - two different rendering engines
- **Root Cause Found**: Template loading was resetting stamp size to 150x150 instead of 350x310
- **Solution**:
  1. Created `/api/documents/stamp-preview` endpoint that generates stamp using PIL (same as PDF)
  2. Frontend fetches and displays this backend image - no more CSS-based preview
  3. Fixed stamp size reset bugs in `applyTemplate()` and `clearForm()`
- **Result**: Preview and PDF now use IDENTICAL rendering → pixel-perfect match
- **Test Verified**: Stamp visible on PDF at 350x340px, backend-generated image loads correctly

### Feb 25, 2026 - Document Stamp Size Fix COMPLETE ✅
**Fixed stamp readability issue where text was too small:**
- **Root Cause**: Frontend was dividing stamp dimensions by `pdfRenderScale` (1.5x) before sending to backend
- **Result**: Stamps were 233x207 points instead of intended 350x310 points
- **Fix**: Modified `DocumentStampPage.jsx` lines 834-835 to send `stampSize.width` and `stampSize.height` directly
- **Verification**: Backend logs confirm "Generated 1000x1060, Target 350x310"
- **Testing**: 100% pass rate on both frontend and backend tests
- **Test Report**: `/app/test_reports/iteration_52.json`

### Feb 23, 2026 - Notification Settings UI COMPLETE ✅
**User-configurable notification preferences:**
- Created `ReminderSettings.jsx` component with comprehensive UI
- Added to Profile page under new "Notifications" tab
- Profile page now has 4 tabs: Basic Info, Public Profile, Notifications, Security
- Features:
  - In-App Notifications: 4 toggles (Event Reminders, Calendar Updates, Task Alerts, System)
  - Email Notifications: 4 toggles (Event Reminders, Calendar Updates, Task Due Dates, System Emails)
  - Reminder Timing: 7 options (5min, 15min, 30min, 1hr, 2hr, 1day, 2days)
  - Save/Reset functionality with unsaved changes warning

### Feb 23, 2026 - Notification System IMPLEMENTED ✅
**Event reminder notifications with in-app and email support:**
- Created `/app/backend/routes/notifications.py` with full notification management
- Added `NotificationBell.jsx` component with dropdown
- Integrated bell icon into dashboard header
- Background scheduler for automatic reminder sending
- User preferences stored in `reminder_preferences` field on advocate documents

### Feb 23, 2026 - Frontend Refactoring COMPLETED ✅
**Major refactoring of PracticeManagementPage.jsx completed:**
- Reduced from 3,860 lines to ~130 lines
- Extracted 10 tab components to modular files
- All tabs tested and working (100% success rate)

### Feb 22, 2026 - Backend API Endpoints
- `PATCH /api/practice/events/{id}/status` - Mark event as completed/cancelled
- `PATCH /api/practice/events/{id}/reminder` - Set event reminders
- `POST /api/practice/events/{id}/duplicate` - Duplicate an event
- `PATCH /api/practice/cases/{id}/status` - Update case status

## Architecture

### Frontend Structure (REFACTORED Feb 23, 2026)
```
frontend/src/
├── components/
│   ├── NotificationBell.jsx      # NEW: Bell icon with dropdown ✅
│   ├── practice-management/      # COMPLETE: Modular tab components
│   │   ├── index.js              # Re-exports all components
│   │   ├── shared.js             # Charts, utilities, constants
│   │   ├── ClientsTab.jsx        # Client management ✅
│   │   ├── CasesTab.jsx          # Case management ✅
│   │   ├── DashboardTab.jsx      # Analytics dashboard ✅
│   │   ├── DocumentsTab.jsx      # Document vault ✅
│   │   ├── CalendarTab.jsx       # Calendar & events ✅
│   │   ├── TasksTab.jsx          # Task management ✅
│   │   ├── InvoicesTab.jsx       # Invoice management ✅
│   │   ├── MessagesTab.jsx       # Messaging ✅
│   │   ├── TemplatesTab.jsx      # Document templates ✅
│   │   └── DocumentGeneratorTab.jsx # PDF generation ✅
│   └── ui/                       # Shadcn UI components
├── pages/
│   └── PracticeManagementPage.jsx  # Main container (~130 lines)
└── context/
    └── AuthContext.js            # Auth state management
```

### Backend Structure
```
backend/
├── routes/
│   ├── notifications.py          # Notification system ✅
│   └── auth.py                   # Auth routes module ✅ (REFACTORED Feb 23, 2026)
├── practice_management.py        # Practice management APIs
└── server.py                     # Main app (~6700 lines, continues to be modularized)
```

## Auth Module (REFACTORED Feb 23, 2026) ✅
**Routes extracted from server.py to backend/routes/auth.py:**
- `POST /api/auth/register` - User registration with email verification
- `POST /api/auth/login` - Login with JWT tokens, CSRF protection, HttpOnly cookies
- `GET /api/auth/me` - Get current authenticated user
- `POST /api/auth/logout` - Clear session and cookies
- `GET /api/auth/verify-email/{token}` - Email verification
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/password-rules` - Get password validation rules

**Module features:**
- `setup_auth_routes()` function for dependency injection
- Helper functions attached to router (hash_password, verify_password, etc.)
- Email templates for verification, welcome, password reset
- Login attempt logging for security auditing

## API Endpoints Summary
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/practice/events` | GET/POST | List/Create events |
| `/api/practice/events/{id}` | PUT/DELETE | Update/Delete event |
| `/api/practice/events/{id}/status` | PATCH | Update event status |
| `/api/practice/events/{id}/reminder` | PATCH | Set event reminders |
| `/api/practice/events/{id}/duplicate` | POST | Duplicate event |
| `/api/practice/cases` | GET/POST | List/Create cases |
| `/api/practice/cases/{id}/status` | PATCH | Update case status |
| `/api/practice/documents` | GET/POST | List/Upload documents |
| `/api/practice/documents/{id}/download` | GET | Download document |
| `/api/documents/batch-stamp` | POST | Batch stamp multiple PDFs |
| `/api/documents/batch-stamps` | GET | Get batch stamping history |
| `/api/stamps` | GET | Paginated stamp ledger with filters |
| `/api/stamps/{id}` | GET | Stamp detail with verification URL |
| `/api/stamps/{id}/revoke` | POST | Revoke stamp with reason |
| `/api/stamps/{id}/events` | GET | Audit trail for stamp |
| `/api/stamps/export.csv` | GET | Export stamps as CSV |
| `/api/admin/stamps` | GET | Admin view of all stamps |
| `/api/admin/advocates/{id}/stamp-summary` | GET | Stamp counts for advocate (NEW) |
| `/api/admin/advocates/{id}/bulk-revoke` | POST | Bulk revoke all active stamps (NEW) |
| `/api/admin/bulk-revoke-history` | GET | Bulk revoke audit history (NEW) |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |
| TLS Admin | admin@tls.or.tz | TLS@Admin2024 |
| Super Admin | superadmin@idc.co.tz | IDC@SuperAdmin2024 |

## Tech Stack
- Frontend: React 18, Shadcn UI, TailwindCSS
- Backend: FastAPI, MongoDB
- Libraries: react-day-picker, faker, reportlab, resend, PIL, qrcode

## Known Limitations
- Demo documents cannot be downloaded (intentional - no file data)
- KwikPay payment integration is mocked

## Backlog
- P1: Real file upload testing with scanned, rotated, mixed-size PDFs
- P2: Backend Profile Module - Extract profile routes to backend/routes/profile.py
- P2: Continue backend modularization (Stamps, Orders, Admin routes)
- P2: Connect "Set Reminder" calendar action to notification backend
- P2: Clean up dead code from server.py (commented auth routes)
- P3: Performance optimization for large datasets
- P3: Cryptographic signature layer (beyond visual stamp overlay)
