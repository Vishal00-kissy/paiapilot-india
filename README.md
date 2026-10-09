# PaisaPilot India 🇮🇳

> **Smart Daily & Monthly Expense Tracker for Indian Students, Freelancers & Households**  
> Built by **Team Zenvex** for the College FinTech Hackathon.

---

## 🌟 Mission & Overview

**PaisaPilot India** is tailored specifically for Indian students, young earners, and households with irregular income to master daily and monthly out-of-pocket spending in Indian Rupees (₹).

Rather than requiring complex bank logins, SMS scraping, or third-party cloud accounts, PaisaPilot India is:
- **100% Client-Private by Default**: All transaction records, budgets, and settings are saved securely in your browser's `localStorage` (`paisapilot-india:v1`).
- **Complete JSON Backup & Restore**: Export full JSON backups or restore data at any time across browsers and devices.
- **Offline-Ready**: Instant local startup with local system Telugu font rendering (`Noto Sans Telugu`, `Nirmala UI`) and zero external CDNs.
- **Full-Stack Gemini AI Advisor**: Features a server-side AI Spending Assistant powered by `@google/genai` and `gemini-3.8-flash` that analyzes spending velocity, flags unusual spikes, and delivers actionable savings advice in English and Telugu (తెలుగు).

---

## 🚀 Key Features

### 1. Home Dashboard
- **Real-Time Rupee Metrics**: Track *Spent this month*, *Spent today*, and *Budget left* with color-coded alerts (green `<80%`, amber `80%–100%`, red `>100%`).
- **Daily Allowance Formula**:  
  $$\text{allowance} = \frac{\text{budget} - (\text{monthSpent} - \text{todaySpent})}{\text{daysLeftInMonth}}$$
  Safe-to-spend today limit, recommended pace, and auto-guard against negative amounts or over-budget exhaustion.
- **Spending by Category**: Horizontal percentage bars highlighting your highest spending category.
- **5 Recent Expenses**: Quick access to recent outlays with payment tags (Cash, UPI, Card).

### 2. Full-Stack AI Spending Assistant (Gemini 3.8 Flash)
- **Pattern Analysis**: Deep analysis of spending categories, velocity, and budget posture.
- **Anomaly & Spike Detection**: Automatically detects unusual single or clustered transactions.
- **Realistic Indian Savings Strategies**: Actionable tips tailored to daily life (e.g. college tiffin vs delivery, student bus/metro passes, utility conservation, 48-hour online shopping pauses).
- **Interactive Q&A in English & Telugu**: Ask custom questions in natural language.
- **Graceful Fallback**: If offline or if the API key is not yet set, intelligent local rule-based insights ensure continuous availability.

### 3. Expenses History & Filters
- **Smart Search**: Filter by description and category simultaneously.
- **Quick Time Filters**: Today, This Week (Mon–Sun), This Month, All Time, and custom From–To date range.
- **Category Filter Dropdown**: Easily isolate categories like Groceries, Food, Transport, Rent, Electricity, etc.
- **Editing & Safe Deletion**: In-place edits and custom accessible confirmation modals (preventing accidental deletions and double-submits).

### 4. Summary & Inline SVG Charts
- **Period Views**: Daily, Weekly, and Monthly with previous/next steppers and date picker.
- **Responsive Inline SVG Chart**: Fully responsive column chart that automatically scales down to 320px–360px mobile viewports without horizontal clipping.
- **Category Breakdown**: Proportional expense distribution with Rupee tabular formatting.

### 5. Budget & Household Planner Mode
- **Monthly Limit Validation**: Validates positive rupee amounts, rejecting non-finite numbers and negative values.
- **Household Budget Mode**: Automatically derives safe spending based on personal/family income and target savings percentage ($0\% - 90\%$).
- **Needs vs Wants Breakdown**: Categorizes essentials (Groceries, Rent, Electricity, Education, Healthcare) vs discretionary wants (Food, Transport, Recharge, Shopping, Other).

### 6. Data Management, Privacy & Export
- **Monthly Bank Statement Loader**: 1-click import of monthly bank statements from SBI, HDFC, ICICI, Axis, PNB, and standard Indian bank CSV/TSV/Text formats. Features automatic categorization (Blinkit, Swiggy, Uber, Bescom, etc.), payment mode detection (UPI, Card, ATM Cash), duplicate prevention, and pre-packaged sample bank statements for instant testing.
- **Download CSV**: Formatted spreadsheet export for Excel and Google Sheets with UTF-8 BOM.
- **JSON Backup & Restore**: One-click download of full application snapshots (`.json`) and schema-validated restore with confirmation preview.
- **Storage Protection**: Automatic try/catch wrappers; corrupted storage is archived to `paisapilot-india:corrupted_backup` without app crashes.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion
- **Backend / API**: Express 4, Node.js / `tsx`, Dotenv
- **AI SDK**: `@google/genai` (Gemini 3.8 Flash)
- **Build Tool**: Vite 8

---

## 📦 Setup & Installation

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
# GEMINI_API_KEY: In AI Studio, automatically injected from the Secrets panel.
# For local development, set your Google Gemini API key:
GEMINI_API_KEY="your_gemini_api_key_here"

# PORT: Default is 3000
PORT=3000
```

### 4. Run Development Server
```bash
npm run dev
```
The application and full-stack API will be accessible at:  
`http://localhost:3000`

---

## 🧪 Verification & Testing

### TypeScript Check & Lint
```bash
npm run lint
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Automated Financial Validation Suite
PaisaPilot India includes automated validation tests (`src/utils/__tests__/financialValidation.test.ts`) that test:
1. **Calendar date validation**: Rejection of impossible dates (e.g. Feb 30/31, April 31, non-leap year Feb 29).
2. **Leap year handling**: Correct acceptance of leap year Feb 29 (2020, 2024, 2028, 2000) and rejection of 2025/2026 Feb 29.
3. **Amount validation**: Rejection of non-finite numbers, NaN, Infinity, negative amounts, and numbers with more than 2 decimal places.
4. **Daily allowance calculations**: Safe handling of over-budget, budget exhaustion (remaining ₹0), and month-end transitions.

---

## 📱 Accessibility & Mobile Standards

- **Mobile First**: Optimized for screen widths down to 360px and 320px.
- **Touch Targets**: All interactive elements and buttons have a minimum hitbox of 48px.
- **Accessible Typography**: Base font size of 17px, high contrast ratios, and native Telugu typography support.
- **Keyboard Navigation & Dialogs**: `role="dialog"`, `aria-modal="true"`, visible `focus-visible:ring-2` focus rings, and ESC key dismissal.
- **Aria Live Alerts**: Toast notifications and alerts are announced via `aria-live="polite"`.

---

## 👥 Hackathon Team Attribution

Developed with ❤️ by **Team Zenvex** for the College FinTech Hackathon.
