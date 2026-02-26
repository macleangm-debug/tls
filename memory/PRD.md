# TLS PDF Stamping Tool - Product Requirements Document

## Overview
A comprehensive Practice Management Suite and Digital Certification Platform for advocates built with React, FastAPI, and MongoDB. The platform has evolved into a certification authority-grade trust infrastructure with cryptographic signing, tamper-proof verification, and regulatory-grade audit trails.

## Go-Live System Packet
**Full documentation available at:** `/app/GO_LIVE_SYSTEM_PACKET.md`

## Core Features Implemented

### Security
- Enterprise-grade JWT authentication with HttpOnly cookies
- Full CSRF protection

### Membership Billing System (NEW - Feb 26, 2026) ✅
- **IDC Control Panel** at `/super-admin/membership` for Super Admins
- **Policy Configuration**: Enable/disable billing, set pricing, choose billing mode (fixed/subscription)
- **Enforcement Modes**: warn_only, block_stamping, block_all
- **Grace Period**: Configurable 0-30 days after membership expiry
- **Advocate Status Banners**: 
  - Grace period warning (amber) with days remaining
  - Blocked state (red) when membership expired
  - Dismiss/Remind Later options
- **Stamping Disabled** when blocked: Buttons show lock icon, "Membership Required" text
- **Backend Endpoints**:
  - `GET /api/admin/membership/settings` - Get policy (super_admin)
  - `PATCH /api/admin/membership/settings` - Update policy (super_admin)
  - `GET /api/admin/membership/stats` - Get membership statistics (admin)
  - `GET /api/admin/membership/payments` - List payments (admin)
  - `POST /api/admin/membership/manual-payment` - Create manual payment (admin)
  - `GET /api/membership/status` - Get advocate's membership status
- **MongoDB Collections**:
  - `membership_billing_settings` - Singleton policy document
  - `membership_payments` - Payment records
- **Enforcement Integration**: Stamping endpoints (`/api/documents/stamp`, `/api/documents/batch-stamp`) check membership status before processing

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

### Calendar & Events (Enhanced Feb 26, 2026) ✅
- **FullCalendar Widget**: Professional month/week/day views with event display
- **Professional Actions**: Mark Complete (with outcome), Cancel (with reason), Reschedule (with new datetime), Create Follow-up Task
- **Drag-and-Drop**: Quick event rescheduling via drag-and-drop
- **Event Types**: Court Hearing (red), Meeting (blue), Deadline (amber), Appointment (green), Reminder (purple)
- **Priority Support**: High/Medium/Low priority with color indicators
- **Sidebar Panels**: Upcoming Events (next 7 days), Overdue Items (deadlines/tasks)
- **Event Status**: scheduled, completed, cancelled, rescheduled with visual indicators
- **Backend Endpoints**:
  - `POST /api/practice/events/{id}/complete` - Mark complete with outcome notes
  - `POST /api/practice/events/{id}/cancel` - Cancel with reason (min 5 chars)
  - `POST /api/practice/events/{id}/reschedule` - Reschedule with new datetime
  - `POST /api/practice/events/{id}/convert-to-task` - Create follow-up task
  - `PATCH /api/practice/events/{id}/move` - Drag-drop move
- **Test Report**: `/app/test_reports/iteration_58.json` - 100% pass rate (13/13 backend, all frontend)

### TLS Global Events (NEW - Feb 26, 2026) ✅
- **Organization-Wide Events**: AGM, CPD sessions, regulatory deadlines, branch meetings appear on ALL advocate calendars
- **Event Types**: agm, cpd, deadline, holiday, branch_meeting, tls_announcement
- **Audience Scoping**: Nationwide (all advocates) or Regional (specific regions like Dar es Salaam, Arusha)
- **Recurrence Support**: RRULE-based patterns (yearly AGM, weekly CPD, bi-weekly sessions)
- **Read-Only for Advocates**: TLS events show with purple color/badge, no edit/delete actions
- **Mandatory Events**: Flag for required attendance (shows "Mandatory" badge)
- **Admin Management**: Full CRUD at `/admin/tls-events` for TLS admins
- **Acknowledgement System**: AGM and notices can require acknowledgement
- **Attendance Tracking**: CPD/AGM events support admin marking for attendance
- **Backend Endpoints**:
  - `POST /api/tls/events` - Create TLS event (admin only)
  - `GET /api/tls/events` - List TLS events
  - `PATCH /api/tls/events/{id}` - Update event
  - `POST /api/tls/events/{id}/cancel` - Cancel with reason
  - `DELETE /api/tls/events/{id}` - Permanent delete (super_admin only)
  - `POST /api/tls/events/{id}/ack` - Acknowledge event (advocate)
  - `GET /api/tls/events/{id}/ack-status` - Get acknowledgement status
  - `POST /api/tls/events/{id}/register` - Register for event (advocate)
  - `GET /api/tls/events/{id}/my-attendance` - Get attendance status
  - `POST /api/tls/events/{id}/attendance/mark` - Mark attendance (admin)
  - `GET /api/tls/events/{id}/attendance/export` - Export CSV (admin)
  - `GET /api/practice/calendar?from&to` - Combined calendar with personal + TLS events
- **MongoDB Collections**:
  - `tls_global_events` - Main events collection
  - `tls_event_ack` - Acknowledgement records
  - `tls_event_attendance` - Attendance records
- **Test Reports**: `/app/test_reports/iteration_59.json`

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

### Feb 26, 2026 - TLS Acknowledgement & Attendance - COMPLETE ✅
**Compliance features for TLS events:**
- **Acknowledgement System**:
  - AGM and TLS notices can require acknowledgement (`require_ack` field)
  - Advocates see "Acknowledge" button in event modal
  - Admin can view all acknowledgements with timestamps
- **Attendance Tracking**:
  - CPD/AGM events support attendance (`attendance.enabled` field)
  - Admin marking mode (safest for go-live)
  - Attendance counts: registered, attended, absent, excused
  - CSV export for attendance records
  - CPD points tracking per event
- **Auto-enable Features**:
  - AGM/notices auto-enable `require_ack`
  - CPD/AGM auto-enable attendance tracking
- **Test Results**: Backend and frontend verified

### Feb 26, 2026 - TLS Global Events (Phase 1) - COMPLETE ✅
**Organization-wide events appearing on all advocate calendars:**
- **Backend (`/app/backend/routes/tls_events.py`)**:
  - New `tls_global_events` MongoDB collection
  - RRULE-based recurrence expansion with dateutil
  - Audience scoping: nationwide or regional filtering
  - Admin-only CRUD with system event logging
  - Combined calendar endpoint merges personal + TLS events
- **Frontend (`/app/frontend/src/pages/TLSEventsAdmin.jsx`)**:
  - Admin page at `/admin/tls-events` with event management
  - Create/Edit form with recurrence patterns, audience scope
  - Event list with status badges (type, mandatory, recurring, region)
- **Calendar Integration (`CalendarTab.jsx`)**:
  - TLS events show with purple styling and [TLS] prefix
  - Read-only modal for TLS events (no edit/delete buttons)
  - Legend updated to show TLS event colors
- **Test Results**: `/app/test_reports/iteration_59.json` - 16/16 backend, all frontend flows verified

### Feb 26, 2026 - Professional Calendar Feature - COMPLETE ✅
**Interactive calendar with professional event management:**
- **FullCalendar Integration**: Professional-grade calendar widget with month/week/day views
- **Professional Action Buttons**: Mark Complete, Reschedule, Cancel, Create Task
- **Event Management**:
  - Mark Complete: Add outcome notes when completing events
  - Cancel: Require reason (min 5 characters) with audit trail
  - Reschedule: Set new datetime with optional reason
  - Convert to Task: Create follow-up tasks from events
- **Drag-and-Drop**: Quick event rescheduling by dragging
- **Visual Indicators**:
  - Event type colors (meeting=blue, court=red, deadline=amber)
  - Status badges (scheduled, completed, cancelled, rescheduled)
  - High priority badge with red indicator
- **Sidebar Panels**: Upcoming Events (next 7 days), Overdue Items
- **Bug Fix**: Normalized event status for sidebar clicks (events without status default to 'scheduled')
- **Test Suite**: `/app/backend/tests/test_calendar_events.py` - 13 API tests
- **Test Report**: `/app/test_reports/iteration_58.json` - 100% pass rate

### Feb 26, 2026 - Go-Live P0 Blockers Resolved ✅
**Critical infrastructure for production deployment:**

**1. MongoDB Backup System**
- **Backup Manager** (`/app/backend/backup_manager.py`):
  - `backup` - Create compressed mongodump archive
  - `restore` - Restore from backup
  - `test-restore` - Verify backup integrity to temp database
  - `cleanup` - Remove backups older than retention period (14 days)
  - `daily` - Automated daily backup + cleanup routine
- **Location**: `/app/backups/tls_backup_*.archive.gz`
- **✅ Restore Test Passed**: 31 collections, 42 stamps, 2 users verified

**2. Sentry Error Monitoring**
- **Integration**: `sentry-sdk[fastapi]` v2.53.0 added
- **Initialization**: Early in server.py startup
- **Context**: Stamping operations tagged with `feature=stamping`
- **Environment**: Reads `SENTRY_DSN`, `ENVIRONMENT`, `APP_VERSION` from .env
- **Status**: Ready (requires SENTRY_DSN in production)

**3. Admin PDF Validation Endpoint (Super Admin Only)**
- `POST /api/admin/pdf/validate` - Validate single PDF with dry-run stamp option
- `POST /api/admin/pdf/batch-validate` - Validate multiple PDFs for certification
- **Returns**: validation result, metadata, page sizes, rotations, dry-run stamp result
- **Audit Logging**: All validations logged to `audit_logs` collection

**4. Key Rotation Mechanism (CA-Style)**
- **Multi-key support**: Active key + historical keys for verification
- **Key Registry**: Stores key_id → public/private key mappings
- **Endpoints**:
  - `GET /api/admin/crypto/status` - Current key status
  - `POST /api/admin/crypto/generate-key` - Generate new ECDSA P-256 key pair
  - `POST /api/admin/crypto/rotate-key` - Rotate to new key (in-memory)
- **Verification**: Uses key_id from stamp record to find correct public key
- **Audit**: KEY_GENERATED and KEY_ROTATED events logged to system_events

### Feb 26, 2026 - PDF Hardening & Validation Layer - COMPLETE ✅
**Production-grade PDF input validation:**
- **PDFValidationService** (`/app/backend/services/pdf_validation_service.py`):
  - PDF header validation (%PDF- magic bytes)
  - Encryption detection (rejects password-protected PDFs)
  - Corruption/malformed PDF detection
  - File size limits (max 10MB)
  - Page count limits (max 200 pages)
  - Page size validation (min 72pt, max 14400pt)
  - Form/annotation detection
  - Linearization detection
- **Error Code Taxonomy**:
  - `PDF_VALID`, `PDF_NOT_PDF`, `PDF_ENCRYPTED`, `PDF_CORRUPT`
  - `PDF_TOO_LARGE`, `PDF_TOO_MANY_PAGES`, `PDF_EMPTY`
  - `PDF_PAGE_TOO_SMALL`, `PDF_PAGE_TOO_LARGE`, `PDF_READ_ERROR`
- **Stress Test Suite** (`/app/backend/tests/pdf_hardening/`):
  - Synthetic PDF generator (23 valid + 4 invalid test files)
  - Validation tests (26 tests)
  - Stamping tests (12 tests)  
  - Positioning tests (9 anchors)
  - Real-world sample harness
- **Test Report**: 47/47 tests passed (100%)
- **Integration**: Validation now runs before every stamp operation

### Feb 26, 2026 - Landing Page Digital Certification Section - COMPLETE ✅
**Marketing-ready showcase of platform capabilities:**
- **Location**: LandingPage.jsx, positioned after Hero and Stats sections
- **Features Highlighted**:
  1. Cryptographic Signing (ECDSA P-256 + SHA-256)
  2. Tamper Detection (SHA-256 document fingerprinting)
  3. Batch Stamping (up to 25 documents)
  4. Compliance Ledger (regulatory-grade audit trail)
  5. Instant QR Verification
  6. Regulatory Controls (bulk revoke for suspended advocates)
- **Design**:
  - Mobile-first responsive grid (1→2→3 columns)
  - Compliance-friendly copy (no blockchain buzzwords)
  - Trust indicators: "Cryptographically Signed", "SHA-256 Hash Binding", "Public Key Verification", "Non-Forgeable"
  - CTAs: "Verify a Stamp" (primary), "Explore the Platform" (secondary)
  - **Hover Animation**: Subtle lift effect (`hover:-translate-y-1`) with color-matched shadows
- **No backend changes required**

### Feb 25, 2026 - Cryptographic Signing Layer - COMPLETE ✅
**ECDSA P-256 + SHA-256 digital signatures for non-forgeable stamps:**
- **Key Management**: Private/public keys stored in .env as base64
- **Signing on Issuance**: All new stamps signed with TLS private key
- **Verification**: Signature verified on every stamp check
- **Public Key Endpoint**: `GET /api/.well-known/tls-stamp-keys` for independent verification
- **Features**:
  - Canonical payload format (deterministic JSON)
  - Key ID tracking for future rotation (`tls-key-2026-01`)
  - Algorithm: `ECDSA_P256_SHA256`
- **Frontend**: Blue "Cryptographically Verified" badge with algorithm name
- **Test Report**: `/app/test_reports/iteration_57.json` - 100% pass rate

**Trust Level Upgrade:**
- ✅ **Before**: Operationally secure (server verification + hash comparison)
- ✅ **After**: Cryptographically verifiable (independently provable, non-forgeable)

### Feb 25, 2026 - Tamper-Proof Verification Page - COMPLETE ✅
**Public trust portal for TLS digital certification:**
- **Route**: `/verify` or `/verify?id={stamp_id}` (public, no auth required)
- **Features**:
  - **Status Banners**: AUTHENTIC (green checkmark), WARNING (amber triangle), NOT VERIFIED (red X)
  - **Advocate Info**: Name, Roll Number, TLS Member ID, Status
  - **Document Info**: Name, Type, Recipient
  - **SHA-256 Hash Display**: Full document fingerprint shown
  - **Document Validation**: Upload document to verify hash match (tamper detection)
  - **Rate Limiting**: 30 requests/minute to prevent scraping
- **API Endpoints**:
  - `GET /api/verify/stamp/{id}` - Verification with audit logging
  - `POST /api/verify/stamp/{id}/validate-document` - Hash validation (NEW)
- **Trust Indicators**: "Tamper-proof", "Instant results", "SHA-256 secured"
- **Test Report**: `/app/test_reports/iteration_56.json` - 100% pass rate (14/14 backend, all frontend)

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
| `/api/admin/advocates/{id}/stamp-summary` | GET | Stamp counts for advocate |
| `/api/admin/advocates/{id}/bulk-revoke` | POST | Bulk revoke all active stamps |
| `/api/admin/bulk-revoke-history` | GET | Bulk revoke audit history |
| `/api/verify/stamp/{id}` | GET | Public verification (rate limited 30/min) |
| `/api/verify/stamp/{id}/validate-document` | POST | Document hash validation (NEW) |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |
| TLS Admin | admin@tls.or.tz | TLS@Admin2024 |
| Super Admin | superadmin@idc.co.tz | IDC@SuperAdmin2024 |

## Tech Stack
- Frontend: React 18, Shadcn UI, TailwindCSS
- Backend: FastAPI, MongoDB
- Libraries: react-day-picker, faker, reportlab, resend, PIL, qrcode, cryptography (ECDSA)

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
- P3: Key rotation mechanism for crypto signing
- P3: PDF embedded digital signature (true PDF/A signature object)
- P3: Blockchain anchoring of stamp hashes (periodic Merkle root)
