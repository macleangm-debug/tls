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
- **NEW Actions**: View, Edit, Duplicate, Mark Complete, Set Reminder, Delete
- Event status tracking (scheduled, completed, cancelled)

### Cases Management (Enhanced Feb 22, 2026)
- Table/Card view toggle
- **NEW Status Actions**: Set Active, Set Pending, Put On Hold, Close Case, Delete
- Status change via dedicated PATCH endpoint

### Seed Data
- `/api/dev/seed` endpoint populates database with demo data

## Recent Changes (Feb 22, 2026)

### New Backend Endpoints
- `PATCH /api/practice/events/{id}/status` - Mark event as completed/cancelled
- `PATCH /api/practice/events/{id}/reminder` - Set event reminders
- `POST /api/practice/events/{id}/duplicate` - Duplicate an event
- `PATCH /api/practice/cases/{id}/status` - Update case status

### Frontend Enhancements
- Calendar event dropdown: Added "Mark Complete" and "Set Reminder" options
- Case action dropdown: Now uses dedicated status endpoint
- Document Vault: Demo badges and improved error handling
- Dashboard charts: Fixed pie chart sizing, consistent card heights

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/practice/events` | GET/POST | List/Create events |
| `/api/practice/events/{id}` | PUT/DELETE | Update/Delete event |
| `/api/practice/events/{id}/status` | PATCH | Update event status |
| `/api/practice/events/{id}/reminder` | PATCH | Set event reminders |
| `/api/practice/events/{id}/duplicate` | POST | Duplicate event |
| `/api/practice/cases` | GET/POST | List/Create cases |
| `/api/practice/cases/{id}` | PUT/DELETE | Update/Delete case |
| `/api/practice/cases/{id}/status` | PATCH | Update case status |
| `/api/practice/documents` | GET/POST | List/Upload documents |
| `/api/practice/documents/{id}/download` | GET | Download document |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Test Advocate | test@tls.or.tz | Test@12345678! |
| TLS Admin | admin@tls.or.tz | TLS@Admin2024 |

## Tech Stack
- Frontend: React, Shadcn UI, TailwindCSS
- Backend: FastAPI, MongoDB
- Libraries: react-day-picker, faker, reportlab

## Known Limitations
- Demo documents cannot be downloaded (intentional - no file data)
- KwikPay payment integration is mocked

## Backlog
- P2: Refactor PracticeManagementPage.jsx (>3000 lines) into smaller components
- P2: Modularize backend server.py with APIRouters
- P3: Add real file upload testing flow
