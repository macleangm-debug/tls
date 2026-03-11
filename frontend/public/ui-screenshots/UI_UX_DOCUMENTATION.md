# TLS Digital Stamping Platform - UI/UX Documentation

## Overview
Complete UI/UX documentation package for the TLS Digital Stamping Platform.

---

## 1. User Personas

| User Type | Demographics | Technical Literacy | Primary Device | Key Needs |
|-----------|-------------|-------------------|----------------|-----------|
| **Advocates** | Age 30-65, lawyers registered with TLS | Low-Medium | 70% Mobile, 30% Desktop | Quick stamping, verification tracking, practice management |
| **TLS Admin** | Age 35-50, TLS staff | Medium | Desktop primarily | Advocate oversight, order processing, reporting |
| **SuperAdmin (IDC)** | Age 28-45, tech vendor team | High | Desktop | System config, revenue tracking, platform management |
| **Public Users** | All ages, general public | Low | 80% Mobile | Document verification, find advocates |

---

## 2. Navigation Structure

### ADVOCATE SIDEBAR
```
MAIN
├── Dashboard
├── Practice Management

DOCUMENTS & STAMPS
├── Stamp Document
├── Batch Stamp
├── Stamp Ledger
├── Stamp Verification
├── My Stamps

ORDERS & PAYMENTS
├── Physical Stamps
├── Order History
├── Payments

ACCOUNT
├── My Profile
├── PIN & Security
├── Help Center
├── Sign Out
```

### TLS ADMIN SIDEBAR
```
OVERVIEW
├── Dashboard

MANAGEMENT
├── Advocates
├── Orders
├── Sign Out
```

### SUPERADMIN (IDC) SIDEBAR
```
OVERVIEW
├── Dashboard

ORDER MANAGEMENT
├── Physical Orders

DOCUMENTS
├── Product Presentation
├── Printable Version

CONFIGURATION
├── Membership Billing
├── Pricing Tiers
├── System Settings

USER MANAGEMENT
├── Manage Admins
├── Sign Out
```

---

## 3. Design System

### Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#02040A` | Main dark background |
| Surface | `#050810` | Cards, sidebar |
| Primary (Emerald) | `#10B981` | Buttons, accents, verified status |
| Secondary (Gold) | `#F59E0B` | TLS branding, premium features |
| Error | `#EF4444` | Alerts, expired status |
| Text Primary | `#FFFFFF` | Headings |
| Text Secondary | `rgba(255,255,255,0.6)` | Body text |
| Text Muted | `rgba(255,255,255,0.4)` | Labels, hints |

### Button Styles
- **Primary**: Emerald green (`#10B981`), rounded corners, white text
- **Secondary**: Outline with white/10 border
- **Destructive**: Red background for danger actions

### Typography
- **Headings**: Inter/System font, Bold (600-700)
- **Body**: Inter/System font, Regular (400)
- **Mono**: For IDs, hashes, codes

### Card Styles
- Background: `rgba(255,255,255,0.05)`
- Border: `rgba(255,255,255,0.1)`
- Border radius: 16px (rounded-2xl)
- Padding: 16-24px

---

## 4. Screenshots Included

### Desktop Screenshots (1920x1080)
1. `01_login.png` - Login page
2. `02_advocate_dashboard_modal.png` - Dashboard with profile completion modal
3. `03_advocate_dashboard.png` - Clean advocate dashboard
4. `04_stamp_document.png` - Document stamping interface
5. `05_batch_stamp.png` - Batch stamping interface
6. `06_stamp_ledger.png` - Stamp history and management
7. `07_profile.png` - Advocate profile page
8. `08_help_center.png` - Help center with categories
9. `09_physical_stamps.png` - Physical stamp ordering (if visible)
10. `10_landing_page.png` - Public landing page
11. `11_verify_page.png` - Public verification portal
12. `12_advocates_directory.png` - Find an advocate
13. `13_tls_admin_dashboard.png` - TLS Admin overview
14. `14_tls_admin_advocates.png` - Manage advocates table
15. `15_tls_admin_orders.png` - Order tracking
16. `16_superadmin_dashboard.png` - SuperAdmin with revenue breakdown
17. `17_superadmin_orders.png` - Physical orders kanban
18. `18_superadmin_billing.png` - Membership billing

### Mobile Screenshots (390x844)
1. `01_mobile_login.png` - Login on mobile
2. `02_mobile_dashboard.png` - Dashboard with bottom navigation
3. `03_mobile_stamp_document.png` - Stamp document flow
4. `04_mobile_stamp_ledger.png` - Stamp ledger on mobile
5. `05_mobile_verify.png` - Verification on mobile
6. `06_mobile_landing.png` - Landing page mobile

---

## 5. Key User Flows

### Advocate Stamping Flow
1. Login → Dashboard
2. Click "Stamp Document" 
3. Upload/Scan document
4. Select stamp type & color
5. Position stamp on preview
6. Add recipient details
7. Generate verified document
8. Download stamped PDF

### Public Verification Flow
1. Visit /verify
2. Enter Stamp ID OR Scan QR OR Upload document
3. View verification results
4. See advocate details & document status

### TLS Admin Flow
1. Login → Admin Dashboard
2. View statistics (advocates, stamps, revenue)
3. Manage Advocates → View/Update status
4. Process Orders → Track physical stamp orders
5. Manage TLS Events

---

## 6. Completion Status

| Account | Completion | Notes |
|---------|------------|-------|
| **Advocate** | 85% | Missing: Google Calendar sync |
| **TLS Admin** | 75% | Missing: Advanced reports, bulk import |
| **SuperAdmin** | 90% | Missing: KwikPay integration |

---

## 7. Access Credentials

| Role | Email | Password |
|------|-------|----------|
| Advocate | `test@tls.or.tz` | `Test@12345678!` |
| TLS Admin | `admin@tls.or.tz` | `TLS@Admin2024` |
| SuperAdmin | `superadmin@idc.co.tz` | `IDC@SuperAdmin2024` |

**Live URL**: https://practice-vault-1.preview.emergentagent.com

---

## 8. Technical Notes

- **Framework**: React + FastAPI + MongoDB
- **UI Library**: Shadcn/UI components
- **Icons**: Lucide React
- **Theme**: Dark mode only (design system optimized for dark)
- **Responsive**: Mobile-first with bottom navigation on mobile
- **PWA**: Progressive Web App enabled for mobile installation
