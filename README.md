# SkillXT Rewards – Multi-Merchant Loyalty Platform

SkillXT Rewards is a shared loyalty ecosystem where multiple merchants share a single customer reward pool. Customers earn points at any merchant store and redeem them for checkout discounts at any other merchant store.

## Core Point Accounting Rules
- **Earn Rate:** ₹100 spent = 1 SkillXT Point.
- **Redeem Rate:** 100 Points = ₹10 Discount.
- **Min Redemption Limit:** 100 Points (₹10 Discount).
- **Balance Calculation:** Computed dynamically by summing points ledger transactions (`SUM(pointsChange)`) for maximum audit integrity. No cached balance is stored.
- **Transaction Safety:** Enforced via strict database-level transactions (`Prisma.$transaction`) to guarantee balances never go negative.

---

## Seeded User Credentials (for Testing)

### 1. Super Administrator
- **Identifier:** `admin@skillxt.com`
- **Password:** `Admin@123456`

### 2. Merchants (7 Total)
- **Identifier (Mobiles):** `9000000001` through `9000000007`
- **Password:** `Merchant@123`
- *Merchant Outlets:* FreshMart Grocery (grocery), MediPlus Pharmacy (medical), BrewBeans Cafe (cafe), Dr. Sharma Clinic (doctor), TechZone Electronics (electronics), StyleHub Fashion (fashion), QuickStop General (other).

### 3. Customers (20 Total)
- **Identifier (Mobiles):** `8000000001` through `8000000020`
- **Password:** `Customer@123`
- *QR Code String:* `SKILLXT-{customerId}`

---

## Getting Started

### Prerequisites
- Node.js (v18+) and npm installed.

### Step 1: Initialize Database (PostgreSQL)
We have bundled a portable database script to start PostgreSQL locally in the project directory without installation.

1. Open PowerShell as Administrator.
2. Run the script to download, extract, and start a local database:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   .\setup-postgres.ps1
   ```
This will download PostgreSQL binaries (EDB portable) to `.\pgsql`, create a cluster in `.\postgres_data`, start the database service on port `5432` with password `postgres`, and create the database `skillxt`.

### Step 2: Configure Environment
Copy `.env.example` to `.env` (or let the system default connection string run):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skillxt?schema=public
JWT_SECRET=skillxt_rewards_super_secret_jwt_key_2026
JWT_REFRESH_SECRET=skillxt_rewards_super_secret_refresh_jwt_key_2026
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Step 3: Run Database Migrations and Seed
In a new terminal window, initialize backend dependencies, run Prisma migrations, and seed the database with default settings, milestones, merchants, and customers:
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma db seed
```

### Step 4: Run the Backend Server
Start the backend Express server on port 5000:
```bash
npm run dev
```

### Step 5: Run the Frontend Server
In a separate terminal window, initialize frontend dependencies and start Vite on port 5173:
```bash
cd ../frontend
npm install
npm run dev
```

Open your browser and navigate to:
- Frontend Client: [http://localhost:5173](http://localhost:5173)
- Backend API Health Check: [http://localhost:5000/health](http://localhost:5000/health)

---

## Technical Features

### Backend Security
- **Helmet:** Embedded security headers.
- **CORS:** Configured origin locks.
- **express-rate-limit:** Secures auth routes (10 requests per 15 minutes) and API routes (100 requests per minute).
- **express-validator:** Enforces strict parameter shapes.
- **Audit Logging:** Immutable `AuditLog` inserts tracking logins, registrations, edits, status toggles, point allocations, and transaction reversals.

### Frontend Quality
- **Stepped Signup Wizard:** Self-registration with mock OTP validation (`123456`).
- **Interactive QR scanning:** Real camera feeds (using `html5-qrcode`) alongside a simulated QR-paste form for fast VM testing.
- **Silent Token Renewal:** Auto-refreshes access tokens via Axios response interceptors on token expiry to avoid session interruptions.
- **Recharts Analytics:** Renders points issued vs redeemed curves, top merchant bar graphs, and cumulative customer acquisitions.
- **Exporting Modules:** Generates spreadsheet downloads (`.xlsx` using `exceljs` and `.csv`).
