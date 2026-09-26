-- StockSense Database Schema
-- Compatible with server.js Express backend

CREATE TABLE IF NOT EXISTS warehouses (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          VARCHAR(150) NOT NULL,
    sku           VARCHAR(100) NOT NULL UNIQUE,
    category      VARCHAR(100),
    unit          VARCHAR(50),
    stock         INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    warehouse_id  INTEGER,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS receipts (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    ref                VARCHAR(30),
    supplier           VARCHAR(150),
    product_id         INTEGER NOT NULL,
    quantity           INTEGER NOT NULL,
    status             VARCHAR(30) DEFAULT 'Draft',
    scheduled_date     DATE,
    dest_warehouse_id  INTEGER,
    validated_at       DATETIME,
    created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (dest_warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS deliveries (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    ref            VARCHAR(30),
    customer       VARCHAR(150),
    product_id     INTEGER NOT NULL,
    quantity       INTEGER NOT NULL,
    status         VARCHAR(30) DEFAULT 'Draft',
    scheduled_date DATE,
    validated_at   DATETIME,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS transfers (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    ref               VARCHAR(30),
    product_id        INTEGER NOT NULL,
    from_warehouse_id INTEGER NOT NULL,
    to_warehouse_id   INTEGER NOT NULL,
    quantity          INTEGER NOT NULL,
    status            VARCHAR(30) DEFAULT 'Draft',
    scheduled_date    DATE,
    validated_at      DATETIME,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id)        REFERENCES products(id),
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (to_warehouse_id)   REFERENCES warehouses(id)
);

CREATE TABLE IF NOT EXISTS adjustments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id        INTEGER NOT NULL,
    recorded_quantity INTEGER NOT NULL,
    physical_quantity INTEGER NOT NULL,
    difference        INTEGER NOT NULL,
    reason            VARCHAR(255),
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS stock_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL,
    operation    VARCHAR(50) NOT NULL,
    quantity     INTEGER NOT NULL,
    reference_id INTEGER,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Default warehouses
INSERT OR IGNORE INTO warehouses (name) VALUES
    ('Main Warehouse'),
    ('Production Rack'),
    ('Warehouse 2');

-- Default products (seed data)
INSERT OR IGNORE INTO products (name, sku, category, unit, stock, reorder_level, warehouse_id) VALUES
    ('Steel Rods',    'STL001', 'Raw Material', 'kg',  100, 30, 1),
    ('Chairs',        'CHR001', 'Furniture',    'pcs',  40, 10, 1),
    ('Wood Panels',   'WOD001', 'Raw Material', 'pcs',   8, 15, 2),
    ('Office Tables', 'TAB001', 'Furniture',    'pcs',  25,  8, 1);