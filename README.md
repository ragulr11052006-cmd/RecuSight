# RecurSight — Subscription Tracker & Mandate Intelligence

RecurSight is a complete, full-stack web application designed to help individuals and businesses track recurring commitments, prevent ghost subscriptions, and terminate unwanted auto-debits before charges lock.

Built to mirror the exact visual design system, typography, colors, and layout from the official Figma reference screens.

---

## 🚀 Key Features & Figma Screen Mapping

| Screen # | Screen Name | Figma Frame ID | Description |
|:---|:---|:---|:---|
| **1** | **Overview Dashboard** | `7:3259` | Live database KPI cards (Active Subscriptions, Trials Ending Soon, Need Attention, Upcoming Renewals), Spend Analysis with Recharts donut category distribution, Monthly vs Yearly view, and quick 1-click vendor billing portals. |
| **2** | **My Subscriptions** | `7:6087` | Interactive subscriptions table and card grid. Real-time filtering by Category, Billing Cycle, Payment Account, and Status. Search bar, CSV audit report export, and actions (View, Edit, Pause/Resume, Cancel Guidance, Delete). |
| **3** | **Add Subscription — Manual Entry** | `15:17313` | Fast manual entry with one-click presets (Netflix, Adobe, Figma, Spotify, Copilot, Canva, Notion). Category pills, currency selector, billing cadence (Monthly, Yearly, Quarterly, Custom), next billing date picker, free trial tracking, and live ledger preview. |
| **4** | **Add Subscription — Upload Invoice** | `15:15664` | Private drag-and-drop file upload supporting PDF, PNG, JPG, and CSV statements (up to 10MB) with user-scoped storage policies. |
| **5** | **Add Subscription — Extracted Details Review** | `15:14434` | Intelligent transaction detection engine identifying vendor name, raw description, amount, projected cadence, confidence score, duplicate warning, and explicit confirmation before ledger registration. |
| **6** | **Reminders & Alert Schedule** | `12:10665` | Automated 48-hour prior renewal and trial expiration alerts dispatching at 09:00 AM recipient local time. Filter tabs (Scheduled, Delivered, Failed), custom alert scheduler, and instant test alert trigger. |
| **7** | **Cancellation & AutoPay Guidance** | `12:11818` | Two distinct paths: **Path A: Bank & UPI Mandate Revocation** (Google Pay, PhonePe, NetBanking instructions) and **Path B: Vendor Direct Cancellation**. 1-click official shortcuts for top vendors and persistent cancellation audit log. |
| **8** | **Sign In — Email ID** | `7:3` | Split-screen branded login with security highlights, email & password inputs, password visibility toggle, remember-me session persistence, forgot password recovery, and social SSO triggers. |
| **9** | **Sign In — Mobile Number & OTP** | `7:107` | International country code selector (+91, +1, +44, etc.), phone number entry, 6-digit OTP verification inputs with paste support, resend cooldown timer, and trusted device option. |
| **10** | **Settings & Preferences** | Custom/System | User profile name, preferred currency (USD, INR, EUR, GBP), timezone, notification channel toggles, lead time configuration, Dark Mode toggle, and full JSON audit backup export. |
| **11** | **Help & Support** | Custom/System | Comprehensive FAQ addressing mandate mechanics, security guarantees, zero-credential promises, and direct support contact form. |

---

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (with custom brand tokens: `#2446D8` signature blue, `#151B2D` navy text)
- **Icons**: Lucide React
- **Charts**: Recharts (Responsive Pie & Donut spend analysis)
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **File Storage**: Supabase Storage (`invoices` private bucket)
- **Testing**: Vitest test runner

---

## 🔒 Application Security & Privacy Architecture

- **Zero Credential Guarantee**: RecurSight stores only non-sensitive metadata (merchant name, renewal date, non-sensitive last 4 digits). We **never** request, process, or store full card numbers, CVVs, UPI PINs, or bank passwords.
- **Row Level Security (RLS)**: PostgreSQL policies ensure that users can only read, insert, update, and delete their own subscriptions, reminders, documents, and audit logs.
- **Client Fallback Store**: When external Supabase credentials are not provided (e.g. offline testing or local demo), a reactive localStorage store provides complete, fully interactive functionality matching the exact database schema without runtime crashes.

---

## 📦 Getting Started Locally

### 1. Prerequisites

Ensure you have **Node.js 18+** installed:
```powershell
node -v
npm -v
```

### 2. Install Dependencies

```powershell
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

To connect your Supabase project, populate:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```
*(If left blank, the app will smoothly run in authenticated local demo mode with preloaded Figma seed data).*

### 4. Apply Database Migrations (Supabase)

If using a real Supabase instance:
1. Open your Supabase Dashboard → **SQL Editor**.
2. Run the script located at `supabase/migrations/20261029000000_initial_schema.sql`.
3. (Optional) Run `supabase/seed.sql` to populate sample subscriptions.

### 5. Run the Application

Start the Vite development server:
```powershell
npm run dev
```
Open your browser at `http://localhost:3000`.

### 6. Run Automated Tests

Execute the Vitest test suite:
```powershell
npm test
```

### 7. Production Build

To create an optimized production build:
```powershell
npm run build
```
The compiled output will be generated in `dist/`.

---

## 📑 Database Schema Summary

The database is normalized across 10 tables:
1. `profiles`: User preferences, currency, timezone, theme.
2. `payment_sources`: Non-sensitive instrument descriptors (provider name, display name, last 4 digits).
3. `subscriptions`: Core recurring commitments, cadence, trial dates, status, confidence.
4. `documents`: File metadata and processing status.
5. `extracted_transactions`: OCR-detected transaction candidates with confidence scores.
6. `reminders`: Scheduled alert records with timezone and delivery channels.
7. `notification_preferences`: Channel toggles and lead days.
8. `notification_delivery_logs`: Delivery attempts, statuses, and provider references.
9. `cancellation_guidance_history`: User-logged cancellations and mandate revocations.
10. `audit_logs`: Entity-level audit trail.
