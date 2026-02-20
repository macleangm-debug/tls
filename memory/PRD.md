# TLS PDF Stamping Tool - Product Requirements Document

## Last Updated: 2026-02-19

## Document Template Generation Feature (2026-02-19)

### Major Feature Addition - Legal Document Generator
Implemented a comprehensive document generation system allowing advocates to create professional legal documents with digital signatures and QR verification stamps.

### 10 Legal Document Templates Implemented
1. **Power of Attorney (Wakala)** - Authorization for legal representation (10 fields)
2. **Affidavit (Kiapo)** - Sworn statement template (9 fields)
3. **Legal Notice** - Formal notice to opposing party (12 fields)
4. **Legal Service Agreement** - Client engagement letter (11 fields)
5. **Court Filing Cover Sheet** - Standard court submission form (11 fields)
6. **Demand Letter** - Payment/action demand notice (12 fields)
7. **Witness Statement** - Witness deposition template (10 fields)
8. **Sale Agreement** - Property/asset sale contract (13 fields)
9. **Lease Agreement** - Rental contract template (14 fields)
10. **Last Will and Testament** - Estate planning document (13 fields)

### Features
- **Placeholder Fields**: Each template has specific fields that advocates fill in
- **Live Preview**: Real-time HTML preview of document as fields are filled
- **QR Verification Stamp**: Optional scannable QR code for document authenticity
- **Digital Signature**: Use saved signature, or type/draw a new one
- **PDF Generation**: Professional PDF output using ReportLab library
- **Document History**: Track all generated documents per advocate
- **Auto-Save to Vault**: Generated documents automatically saved to Document Vault (2026-02-20)
- **Client/Case Linking**: Link generated documents to specific clients and cases (2026-02-20)
- **Document Sharing**: Generate shareable links for documents (2026-02-20)

### New Files
- `/app/backend/document_templates.py` - Template definitions, PDF generation, API routes

### API Endpoints Added (all under /api/templates/)
- `GET /list` - Get all 10 available document templates
- `GET /history` - Get advocate's document generation history
- `GET /{template_id}` - Get specific template details
- `POST /preview` - Generate HTML preview with filled placeholders
- `POST /generate` - Generate and download PDF document (with save_to_vault, client_id, case_id)
- `POST /share` - Generate shareable link for a document
- `GET /shared/{token}` - Access shared document info (public)
- `GET /shared/{token}/download` - Download shared document (public)

### Frontend Components
- `DocumentGeneratorTab` in `/app/frontend/src/pages/PracticeManagementPage.jsx`
- New "Doc Generator" tab in Practice Management (highlighted in green)
- Client/Case linking dropdowns
- Auto-save to vault toggle (enabled by default)
- Share modal after document generation

### MongoDB Collections
- `generated_documents` - Stores document generation history (advocate_id, template_info, filled_data, timestamps)
- `document_shares` - Stores document share records (share_token, document_id, recipient info)

---

## CSRF Protection (2026-02-20)

### Security Feature: Cross-Site Request Forgery Protection
Implemented comprehensive CSRF protection to prevent malicious cross-site requests.

**How it works:**
1. Login generates a unique CSRF token tied to the JWT session
2. Token returned in login response and stored in frontend localStorage
3. Axios interceptor automatically adds `X-CSRF-Token` header to all requests
4. Backend middleware validates token on all state-changing requests (POST, PUT, DELETE, PATCH)

**Protected:**
- All document generation/deletion
- All client/case management
- All profile updates
- All payment actions

**Exempt Paths (no CSRF required):**
- `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`
- `/api/public/*`, `/api/templates/shared/*`
- `/health`, `/docs`

**Error Responses:**
- Missing token: `{"detail": "CSRF token missing", "error_code": "CSRF_MISSING"}`
- Invalid token: `{"detail": "Invalid CSRF token", "error_code": "CSRF_INVALID"}`

**Files Modified:**
- `backend/server.py` - CSRFMiddleware class, login endpoint updated
- `frontend/src/context/AuthContext.js` - Token storage and axios interceptor

---

## Custom Template Creation (2026-02-20)

### Feature: Create Your Own Document Templates
Advocates can now create custom reusable document templates with placeholders.

**Features:**
- Create templates with `{{placeholder}}` syntax
- 10 common placeholders available as buttons: client_name, client_address, client_phone, client_email, advocate_name, date, case_number, court_name, amount, witness_name
- Preview templates before saving
- Edit and delete existing templates
- Generate PDFs from custom templates with:
  - Optional digital signature
  - Optional QR verification stamp
  - Auto-save to document vault

**API Endpoints:**
- `GET /api/practice/templates` - List custom templates
- `POST /api/practice/templates` - Create template
- `PUT /api/practice/templates/{id}` - Update template
- `DELETE /api/practice/templates/{id}` - Delete template
- `POST /api/templates/custom/preview` - Preview with filled data
- `POST /api/templates/custom/generate` - Generate PDF from custom template

**Frontend:**
- Templates tab in Practice Management
- Create Template form with placeholder insertion buttons
- Use Template modal for generating documents
- Edit/Delete functionality per template

---

## Document Sharing (Updated 2026-02-20)

### Direct Document Sharing
Updated the share functionality to share the actual PDF document instead of generating links:

**Share Options:**
1. **Download** - Download PDF to device for manual sharing
2. **WhatsApp** - Uses Web Share API to share PDF directly via WhatsApp (falls back to download if not supported)

**Removed:**
- Link-based sharing (was generating URLs like `https://tls.or.tz/shared/{token}`)
- Email sharing option

**How it works:**
- After document generation, PDF blob is stored in memory
- "Download" button re-downloads the same PDF
- "WhatsApp" button uses `navigator.share()` API to open device share sheet with PDF file
- If Web Share API not supported, downloads PDF and opens WhatsApp for manual attachment

---

## Practice Management Full CRUD (2026-02-20)

### Enhanced Practice Management Modules
Full CRUD operations now available for all Practice Management modules:

### Clients CRUD
- Create, read, update, delete clients
- Search and filter by client type
- View single client with related cases, documents, invoices

### Cases/Matters CRUD
- Create cases linked to clients (validates client exists)
- Update case status, priority, billing info
- View single case with all related data (documents, tasks, events, invoices, expenses)

### Documents Vault (Enhanced)
- Upload documents with folder organization
- Search documents by name/description
- Filter by folder
- Download documents
- Delete documents
- **NEW**: Shows generated documents with "Generated" and "Verified" badges
- **NEW**: Inline download, share, and delete actions

### Document-to-Vault Integration
- Generated documents automatically saved to vault
- Documents can be linked to clients and cases
- Verification ID stored with document for QR verification

---

## KwikPay Payment Integration (2026-02-19)

### Major Feature Addition - Mocked Payment System
Implemented a comprehensive payment collection system (MOCKED - awaiting KwikPay API docs).

### Payment Features Implemented
1. **QR Code Payments**
   - Generate QR codes for instant payments
   - Client scans with KwikPay app
   - Display payment reference and amount

2. **Mobile Money (MoMo) Push**
   - Send USSD push to client's phone
   - Simulated USSD preview display
   - Real-time payment status tracking

3. **Bank Transfer**
   - Display bank account details
   - Unique payment reference for tracking
   - Manual confirmation flow

4. **Card Payments**
   - Credit/Debit card acceptance (mocked)
   - Ready for KwikPay card gateway integration

### Payment Use Cases (All Integrated)
- Invoice payments
- Physical stamp orders
- Digital stamp credits
- Certification fees
- Consultation fees
- Other services

### Revenue Analytics
- Total revenue tracking
- Monthly/yearly breakdowns
- Revenue by service type charts
- Revenue by payment method
- Transaction history

### New Files
- `/app/backend/payment_integration.py` - KwikPay payment API routes
- `/app/frontend/src/pages/PaymentsPage.jsx` - Payment collection UI

### New MongoDB Collections
- `payments` - Payment transaction records
- `refunds` - Refund records
- `revenue_records` - Revenue tracking

### API Endpoints Added (all under /api/payments/)
- `POST /initiate` - Initiate any payment type
- `POST /momo/push` - Send MoMo USSD push
- `POST /generate-qr` - Generate payment QR code
- `GET /status/{payment_id}` - Check payment status
- `GET /history` - Payment history with filters
- `GET /revenue/summary` - Revenue summary by service
- `GET /revenue/monthly` - Monthly revenue breakdown
- `POST /refund` - Process refunds
- `POST /simulate-complete/{payment_id}` - Simulate payment (testing)

### Frontend Routes Added
- `/payments` - Payments & Revenue page

### Navigation
- Added "Payments" link to advocate sidebar

### Note: MOCKED Integration
The payment system is fully functional but MOCKED. When KwikPay API documentation is available:
1. Replace `simulate_payment_processing()` with actual KwikPay API calls
2. Update QR code data format to match KwikPay specs
3. Integrate real MoMo push notifications
4. Add webhook handlers for payment confirmations

---

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
**https://doc-gen-preview-1.preview.emergentagent.com**

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

### Completed (2026-02-20)
- [x] CSRF Protection (middleware + frontend integration)
- [x] Custom Template Creation (advocates create their own templates with placeholders)
- [x] Document Template Generation (10 legal templates with PDF generation)
- [x] Document Generator connected to Document Vault (auto-save)
- [x] Client/Case linking for generated documents
- [x] Document sharing workflow (download + WhatsApp direct share)
- [x] Practice Management Full CRUD (Clients, Cases, Documents)
- [x] Enhanced Documents tab with search, download, share, delete

### Completed (2026-02-19)
- [x] Practice Management Suite initial (Clients, Cases, Documents, Calendar, Tasks, Invoices)
- [x] KwikPay Payment Integration (MOCKED)
- [x] Email Verification for new registrations
- [x] Login Attempt Logging

### Future Features
- [ ] JWT to HttpOnly Cookies migration (more secure against XSS)
- [ ] Batch document stamping
- [ ] Full offline verification
- [ ] Quick stamp mode
- [ ] Stamp template sharing
- [ ] Email digest preferences
