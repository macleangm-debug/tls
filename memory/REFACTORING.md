# Refactoring Plan for Practice Management Suite

## Overview
The application has grown significantly and needs modularization for maintainability.

## Current State (Updated Feb 23, 2026)
- ✅ **FRONTEND REFACTORING COMPLETE** (Feb 23, 2026)
- ✅ **NOTIFICATION SYSTEM IMPLEMENTED** (Feb 23, 2026)
- ✅ **NOTIFICATION SETTINGS UI ADDED** (Feb 23, 2026)
- `backend/server.py`: 6,782 lines (needs refactoring)

## Frontend Refactoring - COMPLETED ✅

### Final Structure
```
frontend/src/
├── components/
│   ├── NotificationBell.jsx        # Bell icon with dropdown ✅
│   ├── ReminderSettings.jsx        # Event reminder preferences ✅
│   └── practice-management/
│       ├── index.js              # Re-exports all components ✅
│       ├── shared.js             # Common utilities, charts, constants ✅
│       ├── ClientsTab.jsx        # Client management ✅
│       ├── CasesTab.jsx          # Case management ✅
│       ├── DocumentsTab.jsx      # Document vault ✅
│       ├── CalendarTab.jsx       # Calendar & events ✅
│       ├── TasksTab.jsx          # Task management ✅
│       ├── InvoicesTab.jsx       # Invoice management ✅
│       ├── MessagesTab.jsx       # Messaging ✅
│       ├── TemplatesTab.jsx      # Document templates ✅
│       ├── DocumentGeneratorTab.jsx # PDF generation ✅
│       └── DashboardTab.jsx      # Analytics dashboard ✅
├── pages/
│   ├── PracticeManagementPage.jsx  # Main container (imports tabs) ✅
│   └── ProfilePage.jsx             # Updated with 4 tabs ✅
└── context/
    └── AuthContext.js              # Auth state management
```

### Files Created/Updated
1. `/frontend/src/components/ReminderSettings.jsx` ✅ NEW
   - In-app notification toggles
   - Email notification toggles  
   - Reminder timing selection (5min to 2days)
   - Save/Reset functionality

2. `/frontend/src/pages/ProfilePage.jsx` ✅ UPDATED
   - Added 4-tab layout: Basic Info, Public Profile, Notifications, Security
   - Integrated ReminderSettings in Notifications tab
   - Added Security tab with password, 2FA, sessions

## Backend Refactoring Plan - IN PROGRESS

### Current Modular Routes
```
backend/routes/
├── __init__.py           # Package init
├── auth.py               # Template (not migrated yet)
├── notifications.py      # ✅ COMPLETE - Full notification system
└── seed.py               # Seed data routes
```

### Target Structure
```
backend/
├── routes/
│   ├── __init__.py
│   ├── auth.py           # Authentication routes (~500 lines)
│   ├── profile.py        # User profile routes (~300 lines)
│   ├── stamps.py         # Stamp operations (~800 lines)
│   ├── documents.py      # Document management (~600 lines)
│   ├── verification.py   # Verification system (~400 lines)
│   ├── orders.py         # Order management (~500 lines)
│   ├── admin.py          # Admin operations (~1000 lines)
│   ├── super_admin.py    # Super admin (~800 lines)
│   ├── institutional.py  # Institutional clients (~700 lines)
│   └── notifications.py  # ✅ COMPLETE
├── models/
│   ├── __init__.py
│   ├── user.py           # User/Advocate models
│   ├── stamp.py          # Stamp models
│   └── document.py       # Document models
├── services/
│   ├── email.py          # Email service (Resend)
│   ├── security.py       # Security utilities
│   └── storage.py        # File storage
├── practice_management.py # Already modularized ✅
└── server.py             # Main app (~6782 lines → ~1500 lines after refactor)
```

### Route Groups to Extract (Priority Order)

| Priority | Module | Routes | Lines | Risk |
|----------|--------|--------|-------|------|
| P1 | auth.py | /auth/* | ~500 | Low |
| P1 | profile.py | /profile/*, /advocate/* | ~400 | Low |
| P2 | stamps.py | /digital-stamps/*, /stamp-* | ~800 | Medium |
| P2 | documents.py | /documents/* | ~600 | Medium |
| P2 | verification.py | /verify/* | ~400 | Low |
| P3 | orders.py | /orders/*, /physical-orders/* | ~500 | Medium |
| P3 | admin.py | /admin/* | ~1000 | High |
| P3 | super_admin.py | /super-admin/* | ~800 | High |
| P4 | institutional.py | /institutional/* | ~700 | Medium |

### Dependencies for Route Modules
Each route module will need:
- Database connection: `db` (passed via setup function)
- Authentication: `get_current_user` dependency
- Shared utilities: `send_email`, `generate_*` functions
- Models: Pydantic models for request/response

### Migration Strategy
1. Create setup function pattern (like notifications.py)
2. Pass db and auth dependencies during app startup
3. Use APIRouter for each module
4. Keep server.py as the central registration point

### Example Module Pattern (from notifications.py)
```python
def setup_route_module(db, get_current_user, send_email_func=None):
    @router.get("/endpoint")
    async def endpoint(user: dict = Depends(get_current_user)):
        # Use db, user, etc.
        pass
    return router
```

## Testing Checklist

### After Each Module Migration:
- [ ] Run pytest for backend
- [ ] Test all affected API endpoints
- [ ] Verify frontend still works
- [ ] Check authentication flows
- [ ] Monitor error logs

### Full Regression:
- [ ] Login/logout flow
- [ ] Profile management
- [ ] Practice management (all tabs)
- [ ] Stamp creation/verification
- [ ] Document upload/download
- [ ] Admin functions
- [ ] Email notifications

## Completed Work

### Feb 23, 2026
1. ✅ Notification bell component (NotificationBell.jsx)
2. ✅ Notification routes (/api/notifications/*)
3. ✅ Reminder preferences API
4. ✅ Background scheduler for reminders
5. ✅ ReminderSettings UI component
6. ✅ Profile page with 4-tab layout
7. ✅ Security tab (placeholder for 2FA, sessions)
