# Prima Putra Perkasa

[Bahasa Indonesia](README.md) | [English](README.en.md)

Prima Putra Perkasa is an internal ERP application that manages sales, deliveries, billing, purchases, cash flow, master data, and financial reporting through one connected data workflow.

## Application Overview

The application uses the **Sales Order** as the center of the sales workflow. Items can be delivered partially or in full through **Delivery Notes**, then billed through **Invoices** created from Delivery Notes or directly from Sales Orders. Document changes and customer or supplier payments update the related statuses and reports.

Current main workflow:

```text
Customer + Price List
        |
        v
   Sales Order ------------------------------+
        |                                     |
        v                                     |
 Delivery Note (partial/full)                 |
        |                                     |
        +-------------------+-----------------+
                            v
                     Invoice (partial/full)
                            |
                            v
                Customer Payments and Receivables

Invoice or stock purchase -> Purchase -> Supplier Debt/Payments
Cash & Bank + Invoice + Purchase + Expenses -> Dashboards and Financial Reports
```

## Application Workflow

1. **Login and master data**
   - Users sign in with an internal `admin` or `staff` account.
   - Customers store their identity and default payment terms.
   - Suppliers store their profile, debt terms, product categories/brands, and supporting documents.

2. **Price List**
   - Item prices are stored per customer to support transaction preparation.
   - Bulk spreadsheet entry, price checking, and draft saving are available.

3. **Sales Order**
   - A Sales Order records the customer, SO number and date, items, quantities, prices, VAT, and payment terms.
   - Item entry uses a spreadsheet with row operations, copy/paste, fill, undo, and redo.
   - List filters, sorting, grouping, pagination, and visible columns are persisted in the URL.

4. **Delivery Note**
   - A Delivery Note is created from a Sales Order and may deliver part or all of the ordered quantity.
   - The system prevents total deliveries from exceeding the Sales Order quantity.
   - Documents can be printed individually or combined by SO number.

5. **Invoice**
   - An Invoice can be created from Delivery Notes that are not fully billed or directly from a Sales Order.
   - Multiple Sales Orders and Delivery Notes can be allocated to one Invoice while preserving each item's source.
   - The system calculates the subtotal, VAT, grand total, due date, paid status, and payment date.

6. **Customer payments**
   - Unpaid Invoices appear in **Customer Receivables** and due-date reminders.
   - **All Customer Payments** provides a cross-customer payment recap.
   - Receivables can be exported by year and customer; selecting all customers groups the report by customer and then by month.

7. **Purchases and suppliers**
   - A Purchase can be linked to a sales Invoice or recorded as a stock purchase.
   - Cash purchases are immediately treated as paid. Debt purchases become paid when a payment date is entered.
   - **Supplier Debt** and the factory billing recap use the same Purchase payment status.

8. **Cash & Bank**
   - Records actual cash inflows/outflows by cash or bank account, including opening balances and petty-cash batches.
   - Transactions can be linked to Sales Orders, Invoices, Purchases, customers, suppliers, and VAT.
   - Cash-out transactions linked to an SO are used to show actual profit by Sales Order.

9. **Dashboards and reports**
   - The Sales Dashboard summarizes revenue, trends, payments, top customers, and top products.
   - The SO Dashboard displays document stages as a Kanban board.
   - The Finance Dashboard summarizes actual cash flow, VAT, receivables, debt, and due dates.
   - Monthly/yearly Financial Reports combine Invoices, stock purchases, supplier payments, closing supplier debt, and operating expenses.

## Sales Order Statuses

The workflow status is calculated automatically from related Sales Orders, Delivery Notes, Invoices, and payments:

```text
To Deliver
-> Partly Delivered
-> Delivered to Billed
-> Partly Billed
-> Billed
-> Paid
```

Users can manually select one of these six statuses after confirming a warning. Automatic calculation remains active: the manual status expires and is recalculated when the related SO, Delivery Note, Invoice, or payment data changes.

## Supplier Onboarding

- Staff creates a supplier, generates an invitation link, and sends it through the selected communication channel.
- The supplier completes the profile without signing in through `/supplier-registration` and may attach document links or PDF files.
- Submitted data remains pending for internal review before it is applied to the supplier profile.
- Links accept one submission, expire after 30 days, and can be replaced when lost or expired.
- Technical details are available in [`docs/supplier-onboarding.md`](docs/supplier-onboarding.md).

## Access and Document Safety

- `staff` manages operational workflows through the permitted endpoints.
- `admin` has additional access to the Finance Dashboard, Financial Reports, and user management.
- Designated owners/developers can use **Emergency Access** to cancel one unpaid Invoice so a Delivery Note can be revised.
- Emergency Access requires reauthentication, a reason, an impact preview, exact Invoice-number confirmation, a single-use session, and complete auditing.
- Document correction mode continues to run relationship validation and shows a warning before risky changes can proceed.

## Application Modules

- **Overview:** Home, Sales Dashboard, SO Dashboard.
- **Sales:** Sales Order, Price List, Delivery Note, Invoice.
- **Purchasing:** Purchase.
- **Finance:** Finance Dashboard, Cash & Bank, Customer Receivables, Supplier Debt.
- **Reports:** Factory Billing and Payment Recap, All Customer Payments, Financial Report.
- **Master Data:** Customer, Supplier, User, and Emergency Access according to permissions.

## Key Features

- Bearer JWT authentication with access tokens, refresh tokens, logout, roles, and access restrictions.
- CRUD views with field filters, sorting, grouping, pagination, visible-column settings, desktop/mobile layouts, forms, and previews.
- URL-based list-state persistence when opening forms, details, and exports.
- Item spreadsheets with copy/paste, row operations, fill, undo/redo, and domain validation.
- Quantity and source-allocation validation across Sales Orders, Delivery Notes, and Invoices.
- Print/PDF export and Excel export for supported reports.
- Light/dark themes and Indonesian/English interfaces.
- Document change auditing and additional safeguards for high-risk operations.

## Technology Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, React Select, Jspreadsheet CE.
- **Backend:** Node.js, Express, MongoDB, Mongoose.
- **Image storage:** Cloudinary for Price List images when configured.
- **Security:** Bearer JWT, `bcryptjs`, Helmet, a CORS allowlist, `Origin/Referer` validation, authentication rate limiting, and audit logs.

## Repository Structure

- `frontend/` - Next.js interface, forms, previews, dashboards, reports, and exports.
- `backend/` - Express REST API, Mongoose models, authentication, validation, auditing, and business processes.
- `docs/` - additional operational documentation and QA notes.

## Prerequisites

- Node.js 20.9 or later
- npm
- MongoDB

## Installation

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Backend Environment

Copy `backend/.env.example` to `backend/.env`, then provide the required local/secret values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prima_putra_perkasa
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
APP_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
TEMP_DOCUMENT_CORRECTION_MODE=true
ADMIN_USERNAME=admin@example.com
ADMIN_PASSWORD=replace_with_strong_admin_password
BREAK_GLASS_OWNER_IDS=
BREAK_GLASS_DEVELOPER_IDS=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_PRICE_LIST_FOLDER=prima-putra-perkasa/price-list
```

Never commit `backend/.env`. For separate deployments, set `NEXT_PUBLIC_API_BASE_URL` during the frontend build to the backend HTTPS URL and add the frontend origin to backend `APP_ORIGINS`.

## Running the Application

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. The backend health check is available at `GET /api/health`.

## Creating an Administrator

Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `backend/.env`, then run:

```bash
cd backend
npm run create:admin
```

The default role for a new user is `staff`. Creating users through the API requires a signed-in administrator.

## Project Validation

Frontend:

```bash
cd frontend
node --test tests/*.test.cjs
npm run build
```

Backend:

```bash
cd backend
node --check index.js
node --test utils/*.test.js config/*.test.js scripts/*.test.js routes/**/*.test.js routes/**/**/*.test.js
```

## API and Request Protection

The main API is available under `/api`, including authentication, customers, suppliers, public supplier forms, Sales Orders, Delivery Notes, Invoices, Purchases, Cash & Bank, dashboards, financial reports, audit logs, and Emergency Access.

The backend uses bearer tokens without cookies or sessions. Request protection includes:

- CORS allowlist configured through `APP_ORIGINS`.
- `Origin/Referer` validation for `POST`, `PUT`, `PATCH`, and `DELETE`.
- `credentials: false` so cookies are not used for authentication.
- Password hashing with `bcryptjs` and attempt limiting on authentication endpoints.
- Private responses do not expose password fields.

## Item Sequence Number Backfill

Inspect Sales Orders, Delivery Notes, and Invoices without modifying the database:

```bash
cd backend
npm run backfill:item-order
```

Apply the backfill after confirming the dry-run summary:

```bash
npm run backfill:item-order -- --apply
```

Use `--only=purchase-orders`, `--only=surat-jalan`, or `--only=invoices` to limit the operation to a specific collection.
