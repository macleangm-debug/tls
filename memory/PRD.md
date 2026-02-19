# TLS PDF Stamping Tool - Product Requirements Document

## Last Updated: 2026-02-19

## Practice Management Feature (2026-02-19)

### Major Feature Addition
Implemented a comprehensive Practice Management system for advocates to manage their entire legal practice within the platform.

### Features Implemented
1. **Client Management**
   - Create, read, update, delete clients
   - Client types: individual, corporate, government
   - Search and filter clients
   - View client's related cases, documents, invoices

2. **Case/Matter Management**
   - Create cases linked to clients
   - Case types: litigation, corporate, family, property, criminal, other
   - Status tracking: active, pending, closed, on_hold
   - Priority levels: low, medium, high, urgent
   - Track opposing party, counsel, court, judge
   - Billing types: hourly, fixed, contingency, pro_bono

3. **Document Vault**
   - Secure cloud storage for legal documents
   - Organize by folders (General, Contracts, Court Filings, etc.)
   - Link documents to clients and cases
   - Upload up to 50MB files
   - Search and filter documents

4. **Calendar & Events**
   - Create events: court_hearing, meeting, deadline, reminder, appointment
   - Set start/end times, location, description
   - Link events to clients and cases
   - Reminders configuration

5. **Task Management**
   - Create tasks with due dates
   - Priority levels and status tracking
   - Link to clients and cases
   - Filter by status (pending, in_progress, completed)

6. **Invoicing**
   - Create invoices with line items
   - Auto-calculate subtotals, taxes, discounts
   - Track invoice status: draft, sent, paid, overdue
   - Link to clients and cases
   - Payment tracking

7. **Expense Tracking**
   - Log case-related expenses
   - Categories: filing_fees, travel, printing, communication, other
   - Mark as billable/non-billable
   - Track reimbursements

8. **Templates** (Backend ready)
   - Document templates with placeholders
   - Categories: contract, affidavit, power_of_attorney, letter, court_filing

9. **Messages** (Backend ready)
   - Internal messaging system
   - Inbox, sent, archived folders

10. **Analytics Dashboard**
    - Active cases count
    - Total clients
    - Pending/overdue tasks
    - Upcoming events
    - Monthly revenue
    - Stamps this month

### New Files
- `/app/backend/practice_management.py` - All practice management API routes
- `/app/frontend/src/pages/PracticeManagementPage.jsx` - Comprehensive frontend page

### New MongoDB Collections
- `clients` - Client records
- `cases` - Case/matter records
- `vault_documents` - Document storage
- `vault_folders` - Folder organization
- `events` - Calendar events
- `tasks` - Task records
- `invoices` - Invoice records
- `expenses` - Expense records
- `templates` - Document templates
- `messages` - Internal messages

### API Endpoints Added (all under /api/practice/)
- `/clients` - CRUD for clients
- `/cases` - CRUD for cases
- `/documents` - Document vault operations
- `/folders` - Folder management
- `/events` - Calendar events
- `/tasks` - Task management
- `/invoices` - Invoice operations
- `/expenses` - Expense tracking
- `/templates` - Document templates
- `/messages` - Internal messaging
- `/analytics/dashboard` - Dashboard stats
- `/analytics/cases` - Case analytics
- `/analytics/revenue` - Revenue analytics

### Frontend Routes Added
- `/practice` - Practice Management page
- `/practice-management` - Alias route

### Navigation
- Added "Practice Management" link to advocate sidebar in AdvocateDashboard.jsx

---

## Email Verification & Login Logging Session (2026-02-16)

### Features Implemented
1. **Email Verification on Registration (P0)**
   - New users receive `email_verified: false` and a 24-hour verification token
   - `/api/auth/register` sends verification email and returns `requires_verification: true`
   - `/api/auth/verify-email/{token}` verifies the user and clears token
   - `/api/auth/resend-verification` generates new token and sends email
   - Login blocked for unverified advocates (403 with helpful message)
   - Admin/super_admin users bypass email verification

2. **Login Attempt Logging (P1)**
   - All login attempts logged to `login_attempts` collection
   - Tracks: email, user_id, success, failure_reason, ip_address, user_agent, timestamp
   - Failure reasons: `user_not_found`, `invalid_password`, `account_suspended`, `email_not_verified`
   - `/api/admin/login-attempts` endpoint for admins with filtering and stats

### New User Fields (advocates collection)
- `email_verified` (bool) - Whether email is verified
- `verification_token` (string) - Verification token (cleared after verification)
- `verification_token_expires` (string) - Token expiry timestamp

### New MongoDB Collection
- `login_attempts` - Stores all login attempt logs

### Frontend Pages Added/Updated
- `/verify-email` - New page for email verification flow
- `/register` - Updated to show verification pending message
- `/login` - Updated to show verification warning with resend link

### API Endpoints Added
- `GET /api/auth/verify-email/{token}` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/admin/login-attempts` - View login attempt logs (admin only)

---

## Resend Email Integration Session (2026-02-16)

### Features Implemented
1. **Resend Email Service** - Integrated for transactional emails
2. **Password Reset Flow** - Forgot password → Email → Reset page
3. **Strict Password Rules** - 12+ chars, uppercase, lowercase, number, special char
4. **Password Strength Indicator** - Visual feedback with 7-point checklist
5. **Welcome Emails** - Sent on registration
6. **Password Change Notifications** - Security alerts

### Password Requirements (Strict)
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- No common patterns (password, qwerty, 123456, etc.)
- No sequential characters (abcd, 1234)
- No more than 3 consecutive identical characters

### API Endpoints Added
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/password-rules` - Get password validation rules

### Frontend Pages Added
- `/forgot-password` - Request reset email
- `/reset-password?token=xxx` - Set new password

### Email Templates
- Password Reset Email (30-min expiry)
- Welcome Email (on registration)
- Password Changed Notification

### Note on Resend
The Resend API key is in test mode. To send emails to any recipient, verify a domain at resend.com/domains.

---

## Security Implementation Session (2026-02-16)

### Security Improvements Implemented
1. **Rate Limiting** - Added via slowapi (5 req/min on auth endpoints)
2. **Security Headers** - X-Frame-Options, CSP, HSTS, X-XSS-Protection, etc.
3. **SECRET_KEY** - Now required in environment, with warning if missing
4. **CORS Restrictions** - Configured to specific allowed origins
5. **Password Reset** - Force reset for default admin accounts
6. **Password Change Endpoint** - /api/auth/change-password with validation
7. **Frontend Modal** - Password reset modal for accounts requiring change

### Security Configuration Files
- `/app/backend/.env` - SECRET_KEY, CORS_ORIGINS configured
- `/app/backend/server.py` - Security middleware, rate limiting
- `/app/frontend/src/components/PasswordResetModal.jsx` - Password reset UI

### Test Credentials (Force Password Reset Required)
- admin@tls.or.tz / TLS@Admin2024
- superadmin@idc.co.tz / IDC@SuperAdmin2024

---

## Code Review Session (2026-02-16)

### Review Summary
- Full comprehensive code review completed
- 7 critical/high issues fixed
- 32 medium/low issues identified for future work

### Fixes Applied
1. Fixed critical bcrypt undefined bug in business registration
2. Fixed 5 bare except clauses with proper exception handling
3. Removed password logging in admin creation
4. All backend and frontend tests passing

### See `/app/CODE_REVIEW_REPORT.md` for full details

---

## Previous Update: 2026-02-05

## Original Problem Statement
Build a web-based PDF stamping tool for the Tanganyika Law Society (TLS) that allows advocates to digitally stamp and verify legal documents with full PWA support, push notifications, and offline capabilities.

## Current State

### Completed Features
- ✅ User authentication (Advocate login/registration)
- ✅ PDF upload and preview using pdf.js
- ✅ Draggable stamp positioning with react-rnd
- ✅ Multiple stamp shapes and layouts
- ✅ QR code generation for verification
- ✅ Signature canvas on main stamping page
- ✅ PWA with service worker and install banner
- ✅ VAPID push notifications
- ✅ Offline document queue with auto-sync
- ✅ Notification preferences (19 types, 7 categories)
- ✅ Bottom Navigation Bar (mobile app-style)
- ✅ Stamp Document Page Redesign
- ✅ **Institutional Portal UI/UX Redesign**

### Recent Updates (2026-02-05)

#### Institutional Portal Redesign (COMPLETED)
**Status:** VERIFIED ✅

**New Features:**
1. **Split-Screen Login Page**
   - Left: Branding with features list (Real-time API, Enterprise security, Analytics, Team members)
   - Right: Modern glass-morphism login card

2. **Organization Type Selection**
   - Bank / Financial Institution
   - Government Agency
   - Hospital / Healthcare
   - Court / Legal Institution
   - Corporate / Business
   - Other Organization

3. **Modern Dashboard with Sidebar**
   - Organization info card with status badge
   - Navigation: Overview, Verify Document, API Integration, Billing & Plans
   - Stats cards with gradients (Verifications Used, Total All Time, Days Remaining, Monthly Limit)
   - Quick Verify inline form
   - API Key display with copy button
   - Recent Verifications list

4. **Responsive Design**
   - Mobile-first approach
   - Collapsible sidebar on mobile
   - Touch-friendly interface

**Test Credentials:**
| Portal | Email | Password |
|--------|-------|----------|
| Institutional | demo@testbank.co.tz | Demo@2024 |

#### Previous Updates
- Stamp Document Page cleanup (removed Stamp Placement, Show My Name toggle)
- Bottom Navigation Bar (5 icons, center "Stamp" elevated)
- Notification Preferences (19 types, 7 categories)
- VAPID Push Notifications
- Offline Document Queue

## Web URL
**https://tls-email-confirm.preview.emergentagent.com**

## Test Credentials

### Advocate Portal
| Email | Password |
|-------|----------|
| testadvocate@tls.or.tz | Test@1234 |

### Institutional Portal
| Email | Password |
|-------|----------|
| demo@testbank.co.tz | Demo@2024 |

## Key Pages
- `/dashboard` - Advocate dashboard
- `/stamp-document` - Document stamping
- `/my-stamps` - Stamp templates
- `/verify/{id}` - Public verification
- `/institutional` - Institutional portal (organizations)
- `/profile?tab=notifications` - Notification settings

## Backlog

### In Progress
- [ ] Batch document stamping
- [ ] Full offline verification
- [ ] Quick stamp mode

### Future Features
- [ ] Stamp template sharing
- [ ] Email digest preferences
