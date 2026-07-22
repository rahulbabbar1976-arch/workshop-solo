# Workshop Solo - Complete Program Documentation

## Overview
Workshop Solo is a comprehensive, multi-tenant capable SaaS application built for automotive workshop management. It handles end-to-end workshop operations including vehicle intake, jobcard management, cost estimation, inventory (parts & labor), invoicing, and PDF generation with deep WhatsApp integration.

## Tech Stack
- **Framework**: Next.js 16.2.9 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Database**: PostgreSQL (via Prisma ORM @v7.8.0)
- **PDF Generation**: html2pdf.js
- **Charts/Analytics**: Recharts
- **Image Processing/OCR**: Tesseract.js, Sharp
- **Data Import/Export**: Papaparse, xlsx, csv-parser

## Database Architecture (Prisma Schema)

The database is built on a relational model centered around the `JobCard`.

### Core Entities:
1. **WorkshopProfile**: Stores global settings for the workshop (Name, Address, Logo, Tax Rates, Print Settings).
2. **Customer**: Stores customer details (Name, Mobile, Email, Address).
3. **Vehicle**: Stores vehicle details linked to a customer (Make, Model, Year, VIN, Odometer, License Plate).
4. **JobCard**: The central operational document. Links a Customer and Vehicle to specific service requests.
   - States: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`
   - Relations: Has many `JobCardComplaint` (user reported issues), `JobCardItem` (parts used), `JobCardLabour` (labor used), and `Media` (photos).
5. **Estimate**: Cost estimations linked to a JobCard. Contains its own snapshot of Items and Labor to preserve historical data even if prices change.
6. **PartsMaster**: Global inventory catalog for parts (Part Number, Item Code, Price, HSN/SAC, Category, Stock).
7. **LabourMaster**: Global catalog for labor services (Service Name, Cost, Tax).
8. **Media**: Attachments (primarily images) linked to JobCards. Types include `intake`, `work`, and `delivery`.
9. **User**: Authentication and authorization (Role-based: Admin, Mechanic, Manager).

## Key Features & Modules

### 1. Dashboard & Analytics (`/solo/dashboard`)
- Provides a high-level overview of workshop operations.
- Uses `Recharts` to visualize revenue, jobcard volume, and pending tasks.

### 2. Jobcard Management (`/solo/jobcards`)
- **Intake Flow**: Captures customer details, vehicle details, reported complaints, fuel level, and intake photos.
- **Service Workflow**: Technicians can add parts from inventory and labor charges.
- **Estimates**: Generate estimates (with optional flexible cost/time fields) directly from the Jobcard.
- **Kanban/Status Tracking**: Update status from Intake -> Work -> Delivery.

### 3. Inventory Management (`/solo/inventory`)
- CRUD operations for Parts and Labor.
- Supports bulk importing parts via CSV/XLSX using `papaparse` and `xlsx`.
- Categorization and stock tracking.

### 4. PDF Generation & Print Customization (`/solo/print/*`)
- Client-side PDF generation using `html2pdf.js`.
- **Customizable Layouts**: Controlled via `WorkshopProfile.documentTemplate`.
  - Configurable Header/Footer margins (10mm, 20mm, 30mm).
  - Toggles for displaying Extended Vehicle Details (VIN, Make, Year).
  - Toggles for rendering specific Media (Intake, Work, Delivery photos) on the document.

### 5. Communication & Sharing
- **WhatsApp Deep Linking**: Seamless sharing of Jobcards and Estimates via WhatsApp Web/App (`wa.me`) directly from the UI.
- Prefilled, professional messaging based on the document type.

### 6. Settings & Configuration (`/solo/settings`)
- **Profile**: Workshop branding and contact details.
- **Taxes**: Configurable default tax rates (e.g., GST) applied to parts and labor.
- **Print**: Margins, toggles, and document branding configurations.

## API Structure (`/api/*`)

The application utilizes Next.js Route Handlers (RESTful APIs) for client-server communication.

- `/api/jobcards`: GET, POST, PUT, DELETE operations for Jobcards.
- `/api/jobcards/[id]/estimates`: Generate and retrieve estimates for a specific jobcard.
- `/api/parts` & `/api/labour`: Inventory lookups and management.
- `/api/settings/print` & `/api/settings/taxes`: Update global workshop configurations.
- `/api/import`: Handles file uploads for bulk inventory import.

## Security & Middleware
- Uses Next.js Edge Middleware (`middleware.ts`) for route protection.
- Requires valid session/JWT cookies to access `/solo/*` routes.
- Unauthorized API requests return `401 JSON`.
- **Security Headers**: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options implemented via `next.config.ts`.
- Removed legacy public-facing `/share` routes in favor of authenticated PDF exports.
