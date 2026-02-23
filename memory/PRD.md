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

### Calendar & Events (Enhanced Feb 22, 2026)
- Dual view: List and Calendar widget
- Event creation modal with date/time picker
- Actions: View, Edit, Duplicate, Mark Complete, Set Reminder, Delete
- Event status tracking (scheduled, completed, cancelled)

### Cases Management (Enhanced Feb 22, 2026)
- Table/Card view toggle
- Status Actions: Set Active, Set Pending, Put On Hold, Close Case, Delete
- Status change via dedicated PATCH endpoint

### Seed Data
- `/api/dev/seed` endpoint populates database with demo data

## Recent Changes

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
│   ├── practice-management/  # COMPLETE: Modular tab components
│   │   ├── index.js          # Re-exports all components
│   │   ├── shared.js         # Charts, utilities, constants
│   │   ├── ClientsTab.jsx    # Client management ✅
│   │   ├── CasesTab.jsx      # Case management ✅
│   │   ├── DashboardTab.jsx  # Analytics dashboard ✅
│   │   ├── DocumentsTab.jsx  # Document vault ✅
│   │   ├── CalendarTab.jsx   # Calendar & events ✅
│   │   ├── TasksTab.jsx      # Task management ✅
│   │   ├── InvoicesTab.jsx   # Invoice management ✅
│   │   ├── MessagesTab.jsx   # Messaging ✅
│   │   ├── TemplatesTab.jsx  # Document templates ✅
│   │   └── DocumentGeneratorTab.jsx # PDF generation ✅
│   └── ui/                   # Shadcn UI components
├── pages/
│   └── PracticeManagementPage.jsx  # Main container (~130 lines)
└── context/
    └── AuthContext.js        # Auth state management
```

### Backend Structure
```
backend/
├── routes/
│   └── auth.py               # Auth route template (not yet migrated)
├── practice_management.py    # Practice management APIs
└── server.py                 # Main app (6759 lines - needs refactoring)
```

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

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |
| TLS Admin | admin@tls.or.tz | TLS@Admin2024 |

## Tech Stack
- Frontend: React 18, Shadcn UI, TailwindCSS
- Backend: FastAPI, MongoDB
- Libraries: react-day-picker, faker, reportlab, resend

## Known Limitations
- Demo documents cannot be downloaded (intentional - no file data)
- KwikPay payment integration is mocked

## Backlog
- P2: Complete frontend refactoring (extract remaining tabs)
- P2: Complete backend modularization (extract route groups)
- P3: Add real file upload testing flow
- P3: Performance optimization for large datasets
