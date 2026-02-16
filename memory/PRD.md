# TLS PDF Stamping Tool - Product Requirements Document

## Last Updated: 2026-02-16

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
**https://pdf-positioning-test.preview.emergentagent.com**

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
