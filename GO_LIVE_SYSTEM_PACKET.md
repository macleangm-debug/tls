# TLS Digital Certification Platform - Go-Live System Packet
**Version:** 1.0  
**Date:** February 26, 2026  
**Prepared for:** Go-Live Readiness Assessment

---

## 1. Architecture Map

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TLS Digital Certification Platform                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐  │
│  │    Frontend      │      │     Backend      │      │    MongoDB       │  │
│  │    (React)       │─────▶│   (FastAPI)      │─────▶│                  │  │
│  │    Port: 3000    │      │   Port: 8001     │      │  Port: 27017     │  │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘  │
│          │                         │                         │              │
│          │                         │                         │              │
│  ┌───────▼─────────────────────────▼─────────────────────────▼──────────┐  │
│  │                    Kubernetes Ingress (HTTPS/443)                     │  │
│  │                 cert-platform-2.preview.emergentagent.com             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Architecture

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Frontend | React 18 + Tailwind CSS | 3000 | User interface, advocate dashboard, admin panels |
| Backend | FastAPI (Python 3.11) | 8001 | API server, business logic, PDF processing |
| Database | MongoDB 7.x | 27017 | Document storage (stamps, users, audit logs) |
| Process Manager | Supervisor | - | Service orchestration, auto-restart |
| Reverse Proxy | Kubernetes Ingress | 443 | SSL termination, routing |

### 1.3 Request Flow: Stamp Issuance → Verification

```
┌─────────┐     ┌─────────┐     ┌────────────────┐     ┌──────────────┐
│ Advocate│────▶│ Upload  │────▶│ PDF Validation │────▶│ Stamp Image  │
│  UI     │     │  PDF    │     │   Service      │     │  Generation  │
└─────────┘     └─────────┘     └────────────────┘     └──────────────┘
                                       │                       │
                                       ▼                       ▼
                               ┌────────────────┐     ┌──────────────┐
                               │  Error Code    │     │ PDF Overlay  │
                               │  (if invalid)  │     │  Embedding   │
                               └────────────────┘     └──────────────┘
                                                              │
                                                              ▼
┌─────────┐     ┌─────────┐     ┌────────────────┐     ┌──────────────┐
│ Public  │◀────│ Verify  │◀────│    MongoDB     │◀────│ Crypto Sign  │
│ Portal  │     │  API    │     │  (store stamp) │     │ (ECDSA P-256)│
└─────────┘     └─────────┘     └────────────────┘     └──────────────┘
```

### 1.4 Key Services (Backend)

| Service | File | Purpose |
|---------|------|---------|
| PDFValidationService | `services/pdf_validation_service.py` | Input validation, error taxonomy |
| PDFOverlayService | `services/pdf_overlay_service.py` | Stamp embedding, coordinate handling |
| StampImageService | `services/stamp_image_service.py` | QR code + stamp image generation |
| StampingService | `services/stamping_service.py` | Orchestration, batch processing |
| CryptoSigningService | `services/crypto_signing_service.py` | ECDSA signing, verification |

---

## 2. Deployment & Infrastructure

### 2.1 Current Environment (Preview)

| Item | Value |
|------|-------|
| **Platform** | Emergent Agent Preview (Kubernetes) |
| **Domain** | `cert-platform-2.preview.emergentagent.com` |
| **TLS Certificate** | Managed by Kubernetes Ingress (auto-renewal) |
| **Container Runtime** | Docker in Kubernetes Pod |

### 2.2 Environment Variables

**Backend (`/app/backend/.env`):**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=https://legal-hub-59.preview.emergentagent.com,http://localhost:3000
SENDER_EMAIL=onboarding@resend.dev
RESEND_API_KEY=re_*** (redacted)
TLS_PRIVATE_KEY_B64=*** (ECDSA private key, base64)
TLS_PUBLIC_KEY_B64=*** (ECDSA public key, base64)
SECRET_KEY=*** (JWT signing key)
```

**Frontend (`/app/frontend/.env`):**
```
REACT_APP_BACKEND_URL=https://legal-hub-59.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

### 2.3 Persistence

| Type | Location | Backup Status |
|------|----------|---------------|
| MongoDB Data | `/data/db` (container volume) | ⚠️ **NOT CONFIGURED** |
| Stamped PDFs | Returned to client (not stored) | N/A |
| Log Files | `/var/log/supervisor/*.log` | Not backed up |

### 2.4 Process Management

**Supervisor Configuration:**
```ini
[program:backend]
command=/root/.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1 --reload
directory=/app/backend
autostart=true
autorestart=true

[program:frontend]
command=yarn start
directory=/app/frontend
autostart=true
autorestart=true

[program:mongodb]
command=/usr/bin/mongod --bind_ip_all
autostart=true
autorestart=true
```

---

## 3. Data Model Summary

### 3.1 Core Collections

#### `document_stamps` (Main stamp records)
```javascript
{
  stamp_id: "TLS-20260226-ABC12345",      // Unique identifier
  advocate_id: "ObjectId",                 // Reference to advocate
  advocate_name: "Advocate Name",
  advocate_email: "email@example.com",
  document_name: "contract.pdf",
  document_type: "affidavit|court_filing|contract|other",
  document_hash: "sha256_hex",             // SHA-256 of original doc
  recipient_name: "Recipient",
  recipient_org: "Organization",
  description: "Document description",
  stamp_type: "certification",
  status: "active|revoked|expired",
  created_at: ISODate,
  expires_at: ISODate,
  verification_url: "https://domain/verify?id=...",
  batch_id: "BATCH-...",                   // If from batch stamping
  crypto_signature: {                      // ECDSA signature
    signature_b64: "base64_encoded",
    algorithm: "ECDSA_P256_SHA256",
    key_id: "tls-key-2026-01",
    signed_at: ISODate,
    canonical_payload: "JSON string"
  },
  // Revocation fields (if revoked)
  revoked_at: ISODate,
  revoked_by: "ObjectId",
  revoke_reason: "Reason text"
}
```

#### `stamp_events` (Immutable audit trail)
```javascript
{
  id: "uuid",
  stamp_id: "TLS-...",
  event_type: "STAMP_ISSUED|STAMP_VERIFIED|STAMP_REVOKED|HASH_VALIDATED",
  actor_id: "ObjectId",
  actor_type: "advocate|admin|super_admin|public",
  created_at: ISODate,
  ip: "client_ip",
  user_agent: "browser_string",
  metadata: {
    document_type: "...",
    mode: "single|batch",
    bulk: false,
    batch_revoke_id: "..."
  }
}
```

#### `users` (All user accounts)
```javascript
{
  _id: ObjectId,
  email: "email@example.com",
  password_hash: "bcrypt_hash",
  full_name: "Full Name",
  role: "advocate|admin|super_admin",
  roll_number: "ADV/2020/1234",           // For advocates
  tls_member_id: "TLS-...",
  phone: "+255...",
  region: "Dar es Salaam",
  status: "active|suspended|pending_verification",
  email_verified: true,
  created_at: ISODate,
  notification_preferences: {...}
}
```

#### `system_events` (Admin audit logs)
```javascript
{
  event_type: "ADVOCATE_BULK_REVOKE",
  actor_id: "ObjectId",
  created_at: ISODate,
  metadata: {
    advocate_id: "...",
    advocate_name: "...",
    stamps_revoked: 25,
    reason: "..."
  }
}
```

### 3.2 Collection Count (30 total)
```
advocates, audit_logs, batch_stamps, credit_transactions, digital_stamps,
document_stamps, institutional_accounts, institutional_applications,
institutional_invoices, institutional_payments, institutional_webhooks,
login_attempts, notifications, password_reset_tokens, payments,
physical_orders, push_subscriptions, sent_reminders, settings,
stamp_events, stamp_orders, stamp_templates, subscriptions,
system_settings, users, verification_logs, verification_sessions,
verification_tiers, verification_transactions, webhook_logs
```

---

## 4. API Contract List

### 4.1 Authentication (`/api/auth/*`)
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/auth/register` | Register new advocate | Public |
| POST | `/auth/login` | Login, returns JWT cookie | Public |
| POST | `/auth/logout` | Clear JWT cookie | Authenticated |
| GET | `/auth/me` | Get current user | Authenticated |
| GET | `/auth/verify-email/{token}` | Email verification | Public |
| POST | `/auth/forgot-password` | Request reset email | Public |
| POST | `/auth/reset-password` | Reset with token | Public |

### 4.2 Document Stamping (`/api/documents/*`)
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/documents/upload` | Upload for preview | Advocate |
| POST | `/documents/stamp-preview` | Generate preview image | Advocate |
| POST | `/documents/stamp` | Create single stamp | Advocate |
| POST | `/documents/batch-stamp` | Batch stamp (≤25 files) | Advocate |
| GET | `/documents/stamps` | List advocate's stamps | Advocate |
| GET | `/documents/stamps/{id}` | Get stamp details | Advocate |

### 4.3 Stamp Ledger (`/api/stamps/*`)
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/stamps` | Paginated ledger + filters | Advocate |
| GET | `/stamps/{id}` | Stamp detail + events | Advocate |
| POST | `/stamps/{id}/revoke` | Revoke with reason | Advocate |
| GET | `/stamps/{id}/events` | Audit trail | Advocate |
| GET | `/stamps/export.csv` | Export to CSV | Advocate |

### 4.4 Verification (`/api/verify/*`) - PUBLIC
| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| GET | `/verify/stamp/{id}` | Verify stamp status | Public | 30/min |
| POST | `/verify/stamp/{id}/validate-document` | Hash validation | Public | 30/min |

### 4.5 Cryptographic Keys - PUBLIC
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/.well-known/tls-stamp-keys` | Public key (JWKS-like) |
| GET | `/crypto/status` | Signing status |

### 4.6 Admin (`/api/admin/*`)
| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/stamps` | All stamps ledger | Admin |
| GET | `/admin/advocates/{id}/stamp-summary` | Advocate stamp counts | Admin |
| POST | `/admin/advocates/{id}/bulk-revoke` | Bulk revoke | **Super Admin** |
| GET | `/admin/bulk-revoke-history` | Revocation audit | Super Admin |

### 4.7 Other Endpoints
- Profile management (`/api/profile/*`)
- Physical stamp orders (`/api/physical-orders/*`)
- Notifications (`/api/notifications/*`)
- Institutional portal (`/api/institutional/*`)
- Push notifications (`/api/push/*`)

---

## 5. Security Controls

### 5.1 Authentication
| Control | Implementation |
|---------|----------------|
| Method | JWT in HttpOnly cookie |
| Algorithm | HS256 |
| Token Expiry | 24 hours |
| Password Hashing | bcrypt (passlib) |
| Password Rules | 12+ chars, upper/lower/number/special, no common patterns |

### 5.2 Role-Based Access Control (RBAC)
| Role | Capabilities |
|------|--------------|
| `advocate` | Stamp documents, view own ledger, revoke own stamps |
| `admin` | View all stamps, manage advocates, view audit logs |
| `super_admin` | Bulk revoke, system events, all admin capabilities |

### 5.3 Rate Limiting
| Endpoint | Limit | Purpose |
|----------|-------|---------|
| `/verify/stamp/*` | 30/min | Prevent scraping |
| `/auth/register` | 5/min | Prevent spam accounts |
| `/auth/login` | 5/min | Prevent brute force |
| `/auth/forgot-password` | 3/min | Prevent email abuse |
| Default | 100/min | General protection |

### 5.4 CORS Configuration
```python
CORS_ORIGINS = "https://legal-hub-59.preview.emergentagent.com,http://localhost:3000"
allow_credentials = True
allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
allow_headers = ["Authorization", "Content-Type", "X-Requested-With", "X-CSRF-Token"]
```

### 5.5 Input Validation (PDF)
| Check | Limit | Error Code |
|-------|-------|------------|
| File type | Must start with `%PDF-` | `PDF_NOT_PDF` |
| File size | Max 10MB | `PDF_TOO_LARGE` |
| Page count | Max 200 pages | `PDF_TOO_MANY_PAGES` |
| Encryption | Not allowed | `PDF_ENCRYPTED` |
| Corruption | PdfReader parse check | `PDF_CORRUPT` |
| Page size | 72pt - 14400pt | `PDF_PAGE_TOO_SMALL/LARGE` |

### 5.6 Cryptographic Keys
| Item | Current Status |
|------|----------------|
| Storage | Base64 in `.env` file |
| Algorithm | ECDSA P-256 + SHA-256 |
| Key ID | `tls-key-2026-01` |
| Rotation | ⚠️ **NOT IMPLEMENTED** |
| Public Key Endpoint | `/.well-known/tls-stamp-keys` |

---

## 6. Observability & Operations

### 6.1 Logging
| Log Type | Location | Retention |
|----------|----------|-----------|
| Backend stdout | `/var/log/supervisor/backend.out.log` | Container lifecycle |
| Backend stderr | `/var/log/supervisor/backend.err.log` | Container lifecycle |
| Frontend stdout | `/var/log/supervisor/frontend.out.log` | Container lifecycle |
| MongoDB | `/var/log/mongodb.out.log` | Container lifecycle |

**Log Format:** Python `logging` module, INFO level default

### 6.2 Error Tracking
| Tool | Status |
|------|--------|
| Sentry | ✅ **INTEGRATED** (requires SENTRY_DSN in .env) |
| Error Alerting | ✅ Configured via Sentry |
| Metrics | ⚠️ NOT CONFIGURED |

**Sentry Integration:**
```python
# Backend: sentry-sdk[fastapi] v2.53.0
# Env vars: SENTRY_DSN, ENVIRONMENT, APP_VERSION
# Tags: feature=stamping, stamp_id, etc.
```

### 6.3 Health Check
```bash
GET /api/health
# Returns: {"status": "healthy", "timestamp": "ISO8601"}
```

### 6.4 Backup Plan
| Item | Status |
|------|--------|
| Database Backup | ✅ **IMPLEMENTED** (`/app/backend/backup_manager.py`) |
| Location | `/app/backups/tls_backup_*.archive.gz` |
| Retention | 14 days (configurable) |
| Restore Test | ✅ **PASSED** (31 collections, 42 stamps, 2 users) |

**Backup Commands:**
```bash
cd /app/backend
python backup_manager.py backup       # Create backup
python backup_manager.py list         # List backups
python backup_manager.py restore FILE # Restore from backup
python backup_manager.py test-restore # Verify backup integrity
python backup_manager.py cleanup      # Remove old backups
python backup_manager.py daily        # Full daily routine
```

---

## 7. Test Evidence Pack

### 7.1 PDF Hardening Test Results
**Report:** `/app/backend/tests/pdf_hardening/reports/hardening_report_20260226_064201.json`

| Test Category | Passed | Failed | Pass Rate |
|---------------|--------|--------|-----------|
| Validation | 26 | 0 | 100% |
| Stamping | 12 | 0 | 100% |
| Positioning | 9 | 0 | 100% |
| **TOTAL** | **47** | **0** | **100%** |

**PDF Types Tested:**
- ✅ Standard (Letter, A4, Legal, Tabloid)
- ✅ Large formats (A3, A2, A1)
- ✅ Small formats (A5, A6, receipt-size)
- ✅ Rotated pages (90°, 180°, 270°)
- ✅ Mixed rotation
- ✅ Mixed page sizes
- ✅ With annotations
- ✅ With form fields
- ✅ Multi-page (10, 50, 100 pages)
- ✅ Invalid: not-PDF, empty, truncated, corrupted

### 7.2 Feature Test Reports
**Location:** `/app/test_reports/iteration_*.json` (57 iterations)

| Feature | Test Iteration | Result |
|---------|---------------|--------|
| Crypto Signing Layer | #57 | ✅ 100% |
| Tamper-Proof Verification | #56 | ✅ 100% |
| Bulk Revoke | #55 | ✅ 100% |
| Stamp Ledger | #54 | ✅ 100% |
| Batch Stamping | #53 | ✅ 100% |

### 7.3 Load Testing
| Test | Status |
|------|--------|
| Concurrent stamp requests | ⚠️ **NOT PERFORMED** |
| Verification endpoint load | ⚠️ **NOT PERFORMED** |
| Database stress test | ⚠️ **NOT PERFORMED** |

### 7.4 Known Issues
| Issue | Severity | Status |
|-------|----------|--------|
| KwikPay payment integration | Low | MOCKED |
| "Set Reminder" calendar action | Low | MOCKED |
| Real-world PDF samples | Medium | Needs samples |

---

## 8. Go-Live Checklist Decisions

### 8.1 Readiness Summary

| Gate | Status | Notes |
|------|--------|-------|
| 1. Technical Hardening | ✅ PASS | PDF validation + 47 tests passed |
| 2. Operational Safety | ✅ **PASS** | Backups configured, Sentry integrated |
| 3. Governance & Legal | ✅ **PASS** | Key rotation mechanism implemented |
| 4. Infrastructure Stability | ⚠️ **PENDING** | Preview env - needs production deployment |

### 8.2 Remaining Items for Go-Live

| Item | Status | Action Required |
|------|--------|-----------------|
| Database Backup | ✅ DONE | Backup + restore test passed |
| Error Monitoring | ✅ DONE | Sentry integrated (needs DSN in prod) |
| Key Rotation | ✅ DONE | CA-style multi-key support |
| Real-world PDF Testing | ⚠️ PENDING | Run 30-50 legal docs through `/api/admin/pdf/validate` |
| Production Infrastructure | ⚠️ PENDING | Deploy to production environment |

### 8.3 Admin Endpoints for Go-Live Testing

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/pdf/validate` | Validate real-world PDFs (Super Admin) |
| `POST /api/admin/pdf/batch-validate` | Batch validate PDFs (Super Admin) |
| `GET /api/admin/crypto/status` | Check key rotation status |
| `POST /api/admin/crypto/generate-key` | Generate new key pair |
| `POST /api/admin/crypto/rotate-key` | Rotate signing key |

### 8.4 Updated Pre-Launch Actions

| Action | Priority | Status |
|--------|----------|--------|
| Configure MongoDB backup | P0 | ✅ DONE |
| Set up Sentry error tracking | P0 | ✅ DONE |
| Implement key rotation mechanism | P0 | ✅ DONE |
| Test with 30-50 real-world PDFs | P0 | ⏳ PENDING |
| Production deployment config | P1 | ⏳ PENDING |
| Set SENTRY_DSN in production | P1 | ⏳ PENDING |
| Load test (10 concurrent stamps) | P2 | ⏳ PENDING |
| Write key management policy doc | P2 | ⏳ PENDING |

---

## Appendix A: File Structure

```
/app/
├── backend/
│   ├── server.py                 # Main FastAPI application (~7500 lines)
│   ├── routes/
│   │   └── auth.py               # Authentication module
│   ├── services/
│   │   ├── crypto_signing_service.py
│   │   ├── pdf_overlay_service.py
│   │   ├── pdf_validation_service.py
│   │   ├── stamp_image_service.py
│   │   └── stamping_service.py
│   ├── tests/
│   │   └── pdf_hardening/
│   │       ├── test_suite.py
│   │       ├── synthetic_pdf_generator.py
│   │       ├── samples/          # Test PDFs
│   │       └── reports/          # Test results
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/               # 30+ page components
│   │   └── components/ui/       # Shadcn components
│   ├── package.json
│   └── .env
├── memory/
│   └── PRD.md                   # Product requirements
└── test_reports/
    └── iteration_*.json         # 57 test iterations
```

---

## Appendix B: Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Test Advocate | `test@tls.or.tz` | `Test@12345678!` |
| TLS Admin | `admin@tls.or.tz` | `TLS@Admin2024` |
| Super Admin | `superadmin@idc.co.tz` | `IDC@SuperAdmin2024` |

---

**Document Status:** Ready for Go-Live Readiness Review  
**Prepared by:** Emergent Agent (E1)  
**Review Required:** ✅ YES - Critical blockers identified
