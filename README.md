# 📦 StockSense — Centralized Inventory Management System

> **Odoo x LPU Hackathon 2026 Project**  
> A high-performance, real-time inventory management solution built with a dual-mode data layer: seamless **Express.js + SQLite** backend synchronization with automated **localStorage** offline fallback.

---

## 👥 Team Members

| Name | Role / Focus Area |
|---|---|
| **Amit Shukla** | Team Leader & Project Architecture |
| **Prakash Kumar** | Backend Integration, Database & Operations |
| **Anjali** | Frontend Design & User Interface |
| **Jasim** | Module Implementation & Data Workflows |

---

## 🌟 Key Features

- 📊 **Real-Time Inventory Dashboard**: Key performance metrics (Total Products, Low Stock alerts, Pending Receipts, Pending Deliveries) and quick navigation.
- 📦 **Product Catalog & Management**: Full CRUD support for products, SKU codes, categories, units of measurement, min/reorder levels, and default warehouse locations.
- 📥 **Incoming Receipts (Stock +)**: Create draft purchase receipts from suppliers; validating receipts automatically increments warehouse stock and logs a transaction in the ledger.
- 📤 **Outgoing Deliveries (Stock -)**: Manage customer shipments with real-time stock validation to prevent negative inventory before dispatch.
- 🔄 **Internal Transfers**: Safely transfer stock between multiple warehouses (e.g., Main Warehouse ➔ Production Rack) with real-time location updates.
- ⚖️ **Stock Adjustments**: Reconcile physical inventory counts against recorded counts with discrepancy calculation and reason tracking.
- 📜 **Move History & Stock Ledger**: Comprehensive chronological audit trail of all receipts, deliveries, transfers, and adjustments.
- 🏭 **Multi-Warehouse Support**: Configure and isolate stock across multiple company locations with capacity and type indicators.
- 👤 **User Profile & Settings**: Account configuration and system settings.
- 🛡️ **Dual-Mode Data Architecture**: Connects to the Express REST API and SQLite database (`stocksense.db`); automatically switches to client-side `localStorage` if the server is offline with a live status indicator.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       Frontend UI                           │
│     (index.html · style.css · app.js - Vanilla JS)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
       Backend Online?                 Backend Offline?
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│  Express.js REST API (:3000) │ │        localStorage         │
│         (Backend/server.js)  │ │      (Client Browser)       │
└──────────────┬───────────────┘ └─────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│       SQLite Database        │
│    (Database/schema.sql)     │
│   Backend/stocksense.db      │
└──────────────────────────────┘
```

---

## 📁 Repository Structure

```text
odoo-x-LPU-hackathon-2026/
├── index.html            # Main single-page application interface
├── style.css             # Complete modern responsive styles
├── app.js                # Frontend logic, UI routing, API client & offline fallback
├── README.md             # Project documentation and guide
├── Backend/
│   ├── server.js         # Express.js REST API with better-sqlite3
│   ├── package.json      # Backend dependencies (express, cors, better-sqlite3)
│   ├── products.json     # Initial mock/seed product definitions
│   └── .gitignore        # Excludes node_modules and SQLite db files
└── Database/
    └── schema.sql        # Relational database schema & initial seed data
```

---

## 🗄️ Database Schema (`Database/schema.sql`)

The application uses an SQLite relational database with Foreign Key enforcement and WAL mode:

| Table | Description | Key Fields |
|---|---|---|
| `warehouses` | Warehouse & storage locations | `id`, `name` |
| `products` | Master inventory items | `id`, `name`, `sku`, `category`, `unit`, `stock`, `reorder_level`, `warehouse_id` |
| `receipts` | Inbound vendor shipments | `id`, `ref`, `supplier`, `product_id`, `quantity`, `status`, `scheduled_date`, `dest_warehouse_id` |
| `deliveries` | Outbound customer shipments | `id`, `ref`, `customer`, `product_id`, `quantity`, `status`, `scheduled_date` |
| `transfers` | Inter-warehouse stock moves | `id`, `ref`, `product_id`, `from_warehouse_id`, `to_warehouse_id`, `quantity`, `status` |
| `adjustments` | Physical count reconciliations | `id`, `product_id`, `recorded_quantity`, `physical_quantity`, `difference`, `reason` |
| `stock_history` | Complete transaction audit ledger | `id`, `product_id`, `operation`, `quantity`, `reference_id`, `created_at` |

---

## 🔌 REST API Endpoints

The backend server serves all static frontend assets and exposes the following REST API at `http://localhost:3000/api`:

### Health & Warehouses
- `GET  /api/health` — Check server & SQLite database connectivity
- `GET  /api/warehouses` — List all warehouses
- `POST /api/warehouses` — Create a new warehouse
- `DELETE /api/warehouses/:id` — Delete warehouse

### Products
- `GET    /api/products` — Retrieve all products with warehouse locations
- `GET    /api/products/:id` — Retrieve single product details
- `POST   /api/products` — Create a product (`name`, `sku`, `category`, `unit`, `stock`, `reorder`, `location`)
- `PUT    /api/products/:id` — Update existing product
- `DELETE /api/products/:id` — Delete product

### Operations
- `GET  /api/receipts` — Get incoming receipts
- `POST /api/receipts` — Create new receipt (`Draft` or `Done`)
- `PUT  /api/receipts/:id/validate` — Validate receipt (increments stock & logs history)
- `PUT  /api/receipts/:id/cancel` — Cancel pending receipt
- `GET  /api/deliveries` — Get outbound deliveries
- `POST /api/deliveries` — Create delivery order with stock sufficiency check
- `PUT  /api/deliveries/:id/validate` — Validate delivery (decrements stock & logs history)
- `PUT  /api/deliveries/:id/cancel` — Cancel pending delivery
- `GET  /api/transfers` — List internal warehouse transfers
- `POST /api/transfers` — Create transfer between warehouses
- `PUT  /api/transfers/:id/validate` — Validate transfer (relocates stock)
- `GET  /api/adjustments` — List stock adjustments
- `POST /api/adjustments` — Record physical count adjustment (updates stock & ledger)
- `GET  /api/history` — Fetch recent stock movement audit history
- `DELETE /api/history` — Clear history logs

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or newer recommended)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### 1. Installation
Clone the repository and install backend dependencies:
```bash
git clone https://github.com/Amitshukla6337/odoo-x-LPU-hackathon-2026.git
cd odoo-x-LPU-hackathon-2026/Backend
npm install
```

### 2. Start the Server
Run the Express backend:
```bash
node server.js
```
The server will:
1. Initialize `stocksense.db` using `Database/schema.sql` (if not already created).
2. Seed default warehouses and sample inventory items.
3. Start the API server at `http://localhost:3000`.
4. Host the frontend user interface automatically.

### 3. Open in Browser
Open your browser and navigate to:
```text
http://localhost:3000/index.html
```

> **Note**: You can also open `index.html` directly via file or Live Server. If the backend is running, it will automatically connect; if offline, it will smoothly switch to localStorage mode with a visual indicator in the sidebar.

---

## 📜 License
This project was developed for the **Odoo x LPU Hackathon 2026**.
