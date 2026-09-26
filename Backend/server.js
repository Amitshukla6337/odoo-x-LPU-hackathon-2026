/* =====================================================
   STOCKSENSE BACKEND  —  Express + SQLite
   Covers all tables matching Database/schema.sql
===================================================== */

const express  = require("express");
const cors     = require("cors");
const Database = require("better-sqlite3");
const path     = require("path");
const fs       = require("fs");

const app  = express();
const PORT = 3000;

// ── Database setup ────────────────────────────────────
const DB_PATH     = path.join(__dirname, "stocksense.db");
const SCHEMA_PATH = path.join(__dirname, "../Database/schema.sql");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Run schema (CREATE IF NOT EXISTS — safe to run every boot)
const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
db.exec(schema);

// ── Middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve frontend from project root
app.use(express.static(path.join(__dirname, "..")));


/* =====================================================
   HELPERS
===================================================== */

function ok(res, data)   { res.json({ success: true,  data }); }
function err(res, msg, code = 400) { res.status(code).json({ success: false, error: msg }); }


/* =====================================================
   HEALTH
===================================================== */

app.get("/api/health", (req, res) => {
    ok(res, { status: "OK", service: "StockSense Backend", db: DB_PATH });
});


/* =====================================================
   WAREHOUSES
===================================================== */

app.get("/api/warehouses", (req, res) => {
    const rows = db.prepare("SELECT * FROM warehouses ORDER BY name").all();
    ok(res, rows);
});

app.post("/api/warehouses", (req, res) => {
    const { name } = req.body;
    if (!name) return err(res, "Warehouse name is required");
    try {
        const info = db.prepare("INSERT INTO warehouses (name) VALUES (?)").run(name);
        ok(res, { id: info.lastInsertRowid, name });
    } catch (e) {
        err(res, "Warehouse already exists");
    }
});

app.delete("/api/warehouses/:id", (req, res) => {
    db.prepare("DELETE FROM warehouses WHERE id = ?").run(Number(req.params.id));
    ok(res, { deleted: true });
});


/* =====================================================
   PRODUCTS
===================================================== */

app.get("/api/products", (req, res) => {
    const rows = db.prepare(`
        SELECT p.*, w.name AS location
        FROM   products p
        LEFT JOIN warehouses w ON w.id = p.warehouse_id
        ORDER  BY p.name
    `).all();
    ok(res, rows);
});

app.get("/api/products/:id", (req, res) => {
    const row = db.prepare(`
        SELECT p.*, w.name AS location
        FROM   products p
        LEFT JOIN warehouses w ON w.id = p.warehouse_id
        WHERE  p.id = ?
    `).get(Number(req.params.id));
    if (!row) return err(res, "Product not found", 404);
    ok(res, row);
});

app.post("/api/products", (req, res) => {
    const { name, sku, category, unit, stock, reorder, location } = req.body;
    if (!name || !sku) return err(res, "Name and SKU are required");

    // Resolve warehouse
    const wh = db.prepare("SELECT id FROM warehouses WHERE name = ?").get(location || "Main Warehouse");
    const warehouse_id = wh ? wh.id : null;

    try {
        const info = db.prepare(`
            INSERT INTO products (name, sku, category, unit, stock, reorder_level, warehouse_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(name, sku, category || "", unit || "pcs", Number(stock) || 0, Number(reorder) || 0, warehouse_id);

        ok(res, { id: info.lastInsertRowid, name, sku, category, unit, stock, reorder, location });
    } catch (e) {
        err(res, "SKU already exists");
    }
});

app.put("/api/products/:id", (req, res) => {
    const id = Number(req.params.id);
    const { name, sku, category, unit, stock, reorder, location } = req.body;

    const wh = db.prepare("SELECT id FROM warehouses WHERE name = ?").get(location || "Main Warehouse");
    const warehouse_id = wh ? wh.id : null;

    db.prepare(`
        UPDATE products
        SET    name = ?, sku = ?, category = ?, unit = ?,
               stock = ?, reorder_level = ?, warehouse_id = ?
        WHERE  id = ?
    `).run(name, sku, category, unit, Number(stock), Number(reorder), warehouse_id, id);

    ok(res, { updated: true });
});

app.delete("/api/products/:id", (req, res) => {
    db.prepare("DELETE FROM products WHERE id = ?").run(Number(req.params.id));
    ok(res, { deleted: true });
});


/* =====================================================
   RECEIPTS  (Stock +)
===================================================== */

app.get("/api/receipts", (req, res) => {
    const rows = db.prepare(`
        SELECT r.*, p.name AS product_name, p.unit,
               w.name AS dest_warehouse
        FROM   receipts r
        JOIN   products p ON p.id = r.product_id
        LEFT JOIN warehouses w ON w.id = r.dest_warehouse_id
        ORDER  BY r.created_at DESC
    `).all();
    ok(res, rows);
});

app.post("/api/receipts", (req, res) => {
    const { supplier, productId, quantity, status, scheduledDate, destWarehouse, ref } = req.body;
    if (!productId || !quantity) return err(res, "Product and quantity are required");

    const wh = db.prepare("SELECT id FROM warehouses WHERE name = ?").get(destWarehouse || "Main Warehouse");
    const dest_id = wh ? wh.id : null;

    const info = db.prepare(`
        INSERT INTO receipts (ref, supplier, product_id, quantity, status, scheduled_date, dest_warehouse_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ref || null, supplier, productId, Number(quantity), status || "Draft", scheduledDate || null, dest_id);

    // If Done immediately → update stock
    if (status === "Done") {
        db.prepare("UPDATE products SET stock = stock + ?, warehouse_id = COALESCE(?, warehouse_id) WHERE id = ?")
          .run(Number(quantity), dest_id, productId);
        logHistory(productId, "Receipt", Number(quantity), info.lastInsertRowid);
    }

    ok(res, { id: info.lastInsertRowid });
});

app.put("/api/receipts/:id/validate", (req, res) => {
    const receipt = db.prepare("SELECT * FROM receipts WHERE id = ?").get(Number(req.params.id));
    if (!receipt) return err(res, "Receipt not found", 404);
    if (receipt.status === "Done") return err(res, "Already validated");

    const wh_id = receipt.dest_warehouse_id;

    db.prepare("UPDATE receipts SET status = 'Done', validated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(receipt.id);
    db.prepare("UPDATE products SET stock = stock + ?, warehouse_id = COALESCE(?, warehouse_id) WHERE id = ?")
      .run(receipt.quantity, wh_id, receipt.product_id);

    logHistory(receipt.product_id, "Receipt", receipt.quantity, receipt.id);
    ok(res, { validated: true });
});

app.put("/api/receipts/:id/cancel", (req, res) => {
    db.prepare("UPDATE receipts SET status = 'Cancelled' WHERE id = ? AND status != 'Done'")
      .run(Number(req.params.id));
    ok(res, { cancelled: true });
});


/* =====================================================
   DELIVERIES  (Stock -)
===================================================== */

app.get("/api/deliveries", (req, res) => {
    const rows = db.prepare(`
        SELECT d.*, p.name AS product_name, p.unit, p.stock AS available_stock
        FROM   deliveries d
        JOIN   products p ON p.id = d.product_id
        ORDER  BY d.created_at DESC
    `).all();
    ok(res, rows);
});

app.post("/api/deliveries", (req, res) => {
    const { customer, productId, quantity, status, scheduledDate, ref } = req.body;
    if (!productId || !quantity) return err(res, "Product and quantity are required");

    const qty = Number(quantity);
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
    if (!product) return err(res, "Product not found", 404);

    if (status === "Done" && product.stock < qty)
        return err(res, `Insufficient stock. Available: ${product.stock} ${product.unit}`);

    const info = db.prepare(`
        INSERT INTO deliveries (ref, customer, product_id, quantity, status, scheduled_date)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(ref || null, customer, productId, qty, status || "Draft", scheduledDate || null);

    if (status === "Done") {
        db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(qty, productId);
        logHistory(productId, "Delivery", -qty, info.lastInsertRowid);
    }

    ok(res, { id: info.lastInsertRowid });
});

app.put("/api/deliveries/:id/validate", (req, res) => {
    const delivery = db.prepare("SELECT * FROM deliveries WHERE id = ?").get(Number(req.params.id));
    if (!delivery) return err(res, "Delivery not found", 404);
    if (delivery.status === "Done") return err(res, "Already validated");

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(delivery.product_id);
    if (product.stock < delivery.quantity)
        return err(res, `Insufficient stock. Available: ${product.stock} ${product.unit}`);

    db.prepare("UPDATE deliveries SET status = 'Done', validated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(delivery.id);
    db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?")
      .run(delivery.quantity, delivery.product_id);

    logHistory(delivery.product_id, "Delivery", -delivery.quantity, delivery.id);
    ok(res, { validated: true });
});

app.put("/api/deliveries/:id/cancel", (req, res) => {
    db.prepare("UPDATE deliveries SET status = 'Cancelled' WHERE id = ? AND status != 'Done'")
      .run(Number(req.params.id));
    ok(res, { cancelled: true });
});


/* =====================================================
   INTERNAL TRANSFERS  (Location A → B)
===================================================== */

app.get("/api/transfers", (req, res) => {
    const rows = db.prepare(`
        SELECT t.*,
               p.name AS product_name, p.unit,
               wf.name AS from_warehouse,
               wt.name AS to_warehouse
        FROM   transfers t
        JOIN   products   p  ON p.id  = t.product_id
        JOIN   warehouses wf ON wf.id = t.from_warehouse_id
        JOIN   warehouses wt ON wt.id = t.to_warehouse_id
        ORDER  BY t.created_at DESC
    `).all();
    ok(res, rows);
});

app.post("/api/transfers", (req, res) => {
    const { productId, quantity, from, to, status, scheduledDate, ref } = req.body;
    if (!productId || !quantity || !from || !to) return err(res, "Product, quantity, from and to are required");

    if (from === to) return err(res, "Source and destination cannot be the same");

    const wf = db.prepare("SELECT id FROM warehouses WHERE name = ?").get(from);
    const wt = db.prepare("SELECT id FROM warehouses WHERE name = ?").get(to);
    if (!wf || !wt) return err(res, "Invalid warehouse name");

    const qty = Number(quantity);
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);

    if (status === "Done" && product.stock < qty)
        return err(res, `Insufficient stock. Available: ${product.stock} ${product.unit}`);

    const info = db.prepare(`
        INSERT INTO transfers (ref, product_id, from_warehouse_id, to_warehouse_id, quantity, status, scheduled_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ref || null, productId, wf.id, wt.id, qty, status || "Draft", scheduledDate || null);

    if (status === "Done") {
        db.prepare("UPDATE products SET warehouse_id = ? WHERE id = ?").run(wt.id, productId);
        logHistory(productId, "Transfer", qty, info.lastInsertRowid);
    }

    ok(res, { id: info.lastInsertRowid });
});

app.put("/api/transfers/:id/validate", (req, res) => {
    const t = db.prepare("SELECT * FROM transfers WHERE id = ?").get(Number(req.params.id));
    if (!t) return err(res, "Transfer not found", 404);
    if (t.status === "Done") return err(res, "Already validated");

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(t.product_id);
    if (product.stock < t.quantity)
        return err(res, `Insufficient stock. Available: ${product.stock} ${product.unit}`);

    db.prepare("UPDATE transfers SET status = 'Done', validated_at = CURRENT_TIMESTAMP WHERE id = ?").run(t.id);
    db.prepare("UPDATE products SET warehouse_id = ? WHERE id = ?").run(t.to_warehouse_id, t.product_id);
    logHistory(t.product_id, "Transfer", t.quantity, t.id);

    ok(res, { validated: true });
});

app.put("/api/transfers/:id/cancel", (req, res) => {
    db.prepare("UPDATE transfers SET status = 'Cancelled' WHERE id = ? AND status != 'Done'")
      .run(Number(req.params.id));
    ok(res, { cancelled: true });
});


/* =====================================================
   ADJUSTMENTS
===================================================== */

app.get("/api/adjustments", (req, res) => {
    const rows = db.prepare(`
        SELECT a.*, p.name AS product_name, p.unit
        FROM   adjustments a
        JOIN   products p ON p.id = a.product_id
        ORDER  BY a.created_at DESC
    `).all();
    ok(res, rows);
});

app.post("/api/adjustments", (req, res) => {
    const { productId, counted, reason } = req.body;
    if (!productId || counted === undefined) return err(res, "Product and counted quantity are required");

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
    if (!product) return err(res, "Product not found", 404);

    const oldStock   = product.stock;
    const difference = Number(counted) - oldStock;

    db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(Number(counted), productId);
    const info = db.prepare(`
        INSERT INTO adjustments (product_id, recorded_quantity, physical_quantity, difference, reason)
        VALUES (?, ?, ?, ?, ?)
    `).run(productId, oldStock, Number(counted), difference, reason || "");

    logHistory(productId, "Adjustment", difference, info.lastInsertRowid);
    ok(res, { id: info.lastInsertRowid, oldStock, counted, difference });
});


/* =====================================================
   STOCK HISTORY
===================================================== */

app.get("/api/history", (req, res) => {
    const rows = db.prepare(`
        SELECT h.*, p.name AS product_name, p.unit
        FROM   stock_history h
        JOIN   products p ON p.id = h.product_id
        ORDER  BY h.created_at DESC
        LIMIT  200
    `).all();
    ok(res, rows);
});

app.delete("/api/history", (req, res) => {
    db.prepare("DELETE FROM stock_history").run();
    ok(res, { cleared: true });
});

function logHistory(product_id, operation, quantity, reference_id) {
    db.prepare(`
        INSERT INTO stock_history (product_id, operation, quantity, reference_id)
        VALUES (?, ?, ?, ?)
    `).run(product_id, operation, quantity, reference_id || null);
}


/* =====================================================
   START
===================================================== */

app.listen(PORT, () => {
    console.log(`\n✅ StockSense Backend  →  http://localhost:${PORT}`);
    console.log(`📦 Database           →  ${DB_PATH}`);
    console.log(`🌐 Frontend served at  →  http://localhost:${PORT}/index.html\n`);
});