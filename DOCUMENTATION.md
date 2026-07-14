# Workshop Solo PWA

A modern, minimal SaaS progressive web application designed to manage automotive workshop workflows. This system is multi-tenant capable, securely isolated, and optimized for mobile and desktop interfaces.

## 🚀 Key Features

### 1. Smart Intake & Real-time Search
- **Job Card Creation**: Seamless intake workflow where entering a vehicle's registration number (or just the last 4 digits) instantly pulls up existing records.
- **Auto-complete Dropdowns**: Rapid search across the database directly connected to Postgres.
- **Dynamic Entity Creation**: If a vehicle or customer is not found, the form intuitively adapts to create new profiles on the fly during the intake process.

### 2. Vehicle Ownership Management
- **Detailed Specifications**: Track VIN, Engine Numbers, Colors, Manufacture Year, Battery Details, and Maintenance Schedules (Next Service, Next Oil Change).
- **Ownership Transfer System**: Complete UI and logic to transfer a vehicle's ownership from one customer to another while strictly enforcing a 1-to-1 Vehicle-to-Owner constraint.
- **Historical Tracking**: Automatically logs `VehicleOwnershipHistory` allowing workshops to see exactly who owned a vehicle and when.

### 3. Interactive Data Views
- **Customer & Vehicle Directories**: Minimalist, card-based lists using a `.ticket` aesthetic.
- **Quick Communication**: Embedded quick-actions on customer profiles to launch direct phone calls (`tel:`) and WhatsApp chats (`wa.me`).
- **Pagination**: Optimized rendering of lists handling thousands of legacy records gracefully.

### 4. Advanced Tenant Settings & Security
- **Data Isolation**: All operations are strictly scoped by `tenantId` to ensure data privacy.
- **Factory Reset**: A robust, password-protected mechanism allowing a tenant to securely wipe their operational data (JobCards, Customers, Vehicles) while preserving their master inventory (Parts & Labor).
- **Backup & Restore**: Export functionality to snapshot current operations.

### 5. Legacy Data Migration
- **Excel Ingestion Scripts**: Built-in standalone scripts (`scripts/migrate_legacy_data.ts`) capable of parsing large historical exports (`Auto object table.xls`, `Partners.xls`).
- **Data Enrichment**: Accurately maps disparate legacy data formats into strongly-typed PostgreSQL columns including exact maintenance dates, battery details, and proper relationship binding.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 15 (App Router, Server Components, Server Actions)
* **Styling**: TailwindCSS with Custom "Minimal SaaS" configuration (Orange `#f97316` primary).
* **Database**: PostgreSQL
* **ORM**: Prisma Client (v7+)
* **Icons**: Lucide React
* **Authentication**: Cookie-based session tracking (`workshop_user_id`)
* **Security**: `bcryptjs` for password verification and route middleware.

---

## 🗄️ Database Architecture (Key Entities)

* `Tenant`: The overarching workspace (e.g., BABBARSONS).
* `User`: Staff and administrators belonging to a Tenant.
* `Customer`: The vehicle owners and partners.
* `Vehicle`: The automobiles, strictly tied to one `Customer` at a time.
* `VehicleOwnershipHistory`: The immutable log of transfers.
* `JobCard`: The operational ticket linking a `Vehicle`, `Customer`, and `Tenant`.
* `JobCardComplaint`: Tracked customer issues.
* `JobCardPart` & `JobCardLabour`: The billing and inventory line items.
* `PartsMaster` & `LabourMaster`: The global inventory dictionary for the tenant.

---

## 📂 Project Structure

```text
workshop-solo/
├── prisma/
│   └── schema.prisma             # PostgreSQL schema definition
├── scripts/
│   └── migrate_legacy_data.ts    # Standalone script for Excel imports
├── src/
│   ├── app/
│   │   ├── api/                  # API Routes (Search, Autocomplete)
│   │   ├── solo/                 # Main Application Workspace
│   │   │   ├── customers/        # Customer directory and details
│   │   │   ├── vehicles/         # Vehicle tracking and ownership transfer
│   │   │   ├── jobcards/         # Job card generation and management
│   │   │   ├── settings/         # Factory reset and backups
│   │   │   └── profile/          # User avatar and personal settings
│   │   ├── globals.css           # Core styling and minimal SaaS tokens
│   │   └── layout.tsx            # Global layout (Rails and Bottom Navs)
│   └── lib/
│       └── db.ts                 # Prisma Client singleton
```

---

## 💻 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Database Setup**:
   Ensure your `.env` file contains a valid `DATABASE_URL` pointing to your PostgreSQL instance.
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   *Navigate to `http://localhost:3000` to view the application.*
