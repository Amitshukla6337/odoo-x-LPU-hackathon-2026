/* =========================================
   STOCKSENSE INVENTORY MANAGEMENT SYSTEM
========================================= */


/* =========================================
   API LAYER  —  Backend ↔ Frontend Bridge
   All calls go to http://localhost:3000/api
   Falls back to localStorage if server down
========================================= */

const API = "http://localhost:3000/api";
let   USE_API = false;   // set true after health check passes

// ── Health check on load ──────────────────────────────
async function checkBackend(){
    try {
        const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) });
        if(r.ok){
            USE_API = true;
            setApiStatus(true);
            await syncFromBackend();   // load fresh data from DB
        } else {
            setApiStatus(false);
        }
    } catch(e){
        setApiStatus(false);
    }
}

function setApiStatus(online){
    const dot  = document.getElementById("api-dot");
    const text = document.getElementById("api-text");
    if(!dot) return;
    if(online){
        dot.textContent  = "🟢";
        text.textContent = "Backend Online";
        dot.closest("div").style.color = "#12b76a";
    } else {
        dot.textContent  = "🔴";
        text.textContent = "Offline (localStorage)";
        dot.closest("div").style.color = "#f97066";
    }
}

// ── Pull all data from DB into local arrays ───────────
async function syncFromBackend(){
    try {
        const [pw, pp, pr, pd, pt, pa, ph] = await Promise.all([
            apiFetch("/warehouses"),
            apiFetch("/products"),
            apiFetch("/receipts"),
            apiFetch("/deliveries"),
            apiFetch("/transfers"),
            apiFetch("/adjustments"),
            apiFetch("/history")
        ]);

        if(pw) warehouses = pw.map(w => w.name);
        if(pp) products   = pp.map(normaliseProduct);
        if(pr) receipts   = pr.map(normaliseReceipt);
        if(pd) deliveries = pd.map(normaliseDelivery);
        if(pt) transfers  = pt.map(normaliseTransfer);
        if(pa) adjustments= pa;
        if(ph) history    = ph.map(h => ({
            id:      h.id,
            type:    h.operation,
            details: `${h.product_name}: ${h.quantity > 0 ? "+" : ""}${h.quantity} ${h.unit}`,
            date:    h.created_at
        }));

        saveData();   // mirror to localStorage as cache
    } catch(e){
        console.warn("syncFromBackend failed:", e);
    }
}

// ── Generic fetch wrapper ─────────────────────────────
async function apiFetch(path, options = {}){
    const res = await fetch(API + path, {
        headers: { "Content-Type": "application/json" },
        ...options
    });
    const json = await res.json();
    if(!json.success) throw new Error(json.error || "API error");
    return json.data;
}

// ── Normalise DB rows → app shape ────────────────────
function normaliseProduct(p){
    return {
        id:       p.id,
        name:     p.name,
        sku:      p.sku,
        category: p.category || "",
        unit:     p.unit     || "pcs",
        stock:    p.stock    || 0,
        reorder:  p.reorder_level || 0,
        location: p.location || "Main Warehouse"
    };
}

function normaliseReceipt(r){
    return {
        id:            r.id,
        ref:           r.ref,
        supplier:      r.supplier,
        productId:     r.product_id,
        quantity:      r.quantity,
        status:        r.status,
        scheduledDate: r.scheduled_date,
        destWarehouse: r.dest_warehouse,
        createdAt:     r.created_at
    };
}

function normaliseDelivery(d){
    return {
        id:            d.id,
        ref:           d.ref,
        customer:      d.customer,
        productId:     d.product_id,
        quantity:      d.quantity,
        status:        d.status,
        scheduledDate: d.scheduled_date,
        createdAt:     d.created_at
    };
}

function normaliseTransfer(t){
    return {
        id:            t.id,
        ref:           t.ref,
        productId:     t.product_id,
        quantity:      t.quantity,
        from:          t.from_warehouse,
        to:            t.to_warehouse,
        status:        t.status,
        scheduledDate: t.scheduled_date,
        createdAt:     t.created_at
    };
}


/* =========================================
   API ACTION WRAPPERS
   Each calls backend if online, else falls
   back to the existing localStorage logic.
========================================= */

// ── Products ─────────────────────────────────────────
async function apiCreateProduct(data){
    if(!USE_API) return null;
    return apiFetch("/products", { method:"POST", body: JSON.stringify(data) });
}
async function apiUpdateProduct(id, data){
    if(!USE_API) return null;
    return apiFetch(`/products/${id}`, { method:"PUT", body: JSON.stringify(data) });
}
async function apiDeleteProduct(id){
    if(!USE_API) return null;
    return apiFetch(`/products/${id}`, { method:"DELETE" });
}

// ── Warehouses ───────────────────────────────────────
async function apiCreateWarehouse(name){
    if(!USE_API) return null;
    return apiFetch("/warehouses", { method:"POST", body: JSON.stringify({ name }) });
}

// ── Receipts ─────────────────────────────────────────
async function apiCreateReceipt(data){
    if(!USE_API) return null;
    return apiFetch("/receipts", { method:"POST", body: JSON.stringify(data) });
}
async function apiValidateReceipt(id){
    if(!USE_API) return null;
    return apiFetch(`/receipts/${id}/validate`, { method:"PUT" });
}
async function apiCancelReceipt(id){
    if(!USE_API) return null;
    return apiFetch(`/receipts/${id}/cancel`, { method:"PUT" });
}

// ── Deliveries ───────────────────────────────────────
async function apiCreateDelivery(data){
    if(!USE_API) return null;
    return apiFetch("/deliveries", { method:"POST", body: JSON.stringify(data) });
}
async function apiValidateDelivery(id){
    if(!USE_API) return null;
    return apiFetch(`/deliveries/${id}/validate`, { method:"PUT" });
}
async function apiCancelDelivery(id){
    if(!USE_API) return null;
    return apiFetch(`/deliveries/${id}/cancel`, { method:"PUT" });
}

// ── Transfers ────────────────────────────────────────
async function apiCreateTransfer(data){
    if(!USE_API) return null;
    return apiFetch("/transfers", { method:"POST", body: JSON.stringify(data) });
}
async function apiValidateTransfer(id){
    if(!USE_API) return null;
    return apiFetch(`/transfers/${id}/validate`, { method:"PUT" });
}
async function apiCancelTransfer(id){
    if(!USE_API) return null;
    return apiFetch(`/transfers/${id}/cancel`, { method:"PUT" });
}

// ── Adjustments ──────────────────────────────────────
async function apiCreateAdjustment(data){
    if(!USE_API) return null;
    return apiFetch("/adjustments", { method:"POST", body: JSON.stringify(data) });
}

// ── Helper: re-sync after any mutation ───────────────
async function refreshData(){
    if(USE_API) await syncFromBackend();
}

// ── Boot: run health check ────────────────────────────
checkBackend();


/* =========================================
   DATA
========================================= */

let products = [
    {
        id:1,
        name:"Steel Rods",
        sku:"STL001",
        category:"Raw Material",
        unit:"kg",
        stock:100,
        reorder:30,
        location:"Main Warehouse"
    },

    {
        id:2,
        name:"Chairs",
        sku:"CHR001",
        category:"Furniture",
        unit:"pcs",
        stock:40,
        reorder:10,
        location:"Main Warehouse"
    },

    {
        id:3,
        name:"Wood Panels",
        sku:"WOD001",
        category:"Raw Material",
        unit:"pcs",
        stock:8,
        reorder:15,
        location:"Production Rack"
    },

    {
        id:4,
        name:"Office Tables",
        sku:"TAB001",
        category:"Furniture",
        unit:"pcs",
        stock:25,
        reorder:8,
        location:"Main Warehouse"
    }
];


let receipts = [];

let deliveries = [];

let transfers = [];

let adjustments = [];

let history = [];

// ─── Receipt reference counter ───────────────────────────────
let receiptCounter  = Number(localStorage.getItem("ss_rc")  || 0);
let deliveryCounter = Number(localStorage.getItem("ss_dc")  || 0);
let transferCounter = Number(localStorage.getItem("ss_tc")  || 0);

function nextRef(prefix, counterVar){
    if(prefix === "WH/IN")   { receiptCounter++;  localStorage.setItem("ss_rc",  receiptCounter);  return `WH/IN/${String(receiptCounter).padStart(5,"0")}`; }
    if(prefix === "WH/OUT")  { deliveryCounter++; localStorage.setItem("ss_dc",  deliveryCounter); return `WH/OUT/${String(deliveryCounter).padStart(5,"0")}`; }
    if(prefix === "WH/INT")  { transferCounter++; localStorage.setItem("ss_tc",  transferCounter); return `WH/INT/${String(transferCounter).padStart(5,"0")}`; }
}

let warehouses = [
    "Main Warehouse",
    "Production Rack",
    "Warehouse 2"
];


/* =========================================
   LOCAL STORAGE
========================================= */

function saveData(){

    localStorage.setItem(
        "stocksense_products",
        JSON.stringify(products)
    );

    localStorage.setItem(
        "stocksense_receipts",
        JSON.stringify(receipts)
    );

    localStorage.setItem(
        "stocksense_deliveries",
        JSON.stringify(deliveries)
    );

    localStorage.setItem(
        "stocksense_transfers",
        JSON.stringify(transfers)
    );

    localStorage.setItem(
        "stocksense_adjustments",
        JSON.stringify(adjustments)
    );

    localStorage.setItem(
        "stocksense_history",
        JSON.stringify(history)
    );

    localStorage.setItem(
        "stocksense_warehouses",
        JSON.stringify(warehouses)
    );
}


function loadData(){

    products =
        JSON.parse(
            localStorage.getItem("stocksense_products")
        ) || products;

    receipts =
        JSON.parse(
            localStorage.getItem("stocksense_receipts")
        ) || [];

    deliveries =
        JSON.parse(
            localStorage.getItem("stocksense_deliveries")
        ) || [];

    transfers =
        JSON.parse(
            localStorage.getItem("stocksense_transfers")
        ) || [];

    adjustments =
        JSON.parse(
            localStorage.getItem("stocksense_adjustments")
        ) || [];

    history =
        JSON.parse(
            localStorage.getItem("stocksense_history")
        ) || [];

    warehouses =
        JSON.parse(
            localStorage.getItem("stocksense_warehouses")
        ) || warehouses;
}


loadData();


/* =========================================
   HELPER FUNCTIONS
========================================= */

function generateID(){

    return Date.now();
}


/* ─── Toast Notification System ─────────────────────────────────
   Replaces all alert() / confirm() dialogs in the Operations
   module with a styled, auto-dismissing toast bar.
──────────────────────────────────────────────────────────────── */

function showToast(message, type = "error"){

    // Remove any existing toast
    let old = document.getElementById("ops-toast");
    if(old) old.remove();

    let colors = {
        error:   { bg: "#fef3f2", border: "#fda29b", text: "#b42318", icon: "⚠️" },
        success: { bg: "#f0fdf4", border: "#86efac", text: "#166534", icon: "✅" },
        info:    { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af", icon: "ℹ️" },
        warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e", icon: "⚡" }
    };

    let c = colors[type] || colors.error;

    let toast = document.createElement("div");
    toast.id = "ops-toast";
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 24px;
        z-index: 9999;
        background: ${c.bg};
        border: 1.5px solid ${c.border};
        color: ${c.text};
        padding: 14px 20px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 380px;
        animation: slideInToast 0.3s ease;
    `;

    // Inject keyframe once
    if(!document.getElementById("toast-style")){
        let s = document.createElement("style");
        s.id = "toast-style";
        s.textContent = `
            @keyframes slideInToast {
                from { opacity:0; transform: translateX(60px); }
                to   { opacity:1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(s);
    }

    toast.innerHTML = `<span style="font-size:18px">${c.icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => { if(toast.parentNode) toast.remove(); }, 3500);
}


function confirmAction(message, callback){

    // Remove any existing confirm dialog
    let old = document.getElementById("ops-confirm");
    if(old) old.remove();

    let overlay = document.createElement("div");
    overlay.id = "ops-confirm";
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    overlay.innerHTML = `
        <div style="background:white; border-radius:14px; padding:28px 32px; max-width:380px; width:90%; box-shadow:0 20px 60px rgba(0,0,0,0.2);">
            <div style="font-size:22px; margin-bottom:12px;">🗑️</div>
            <p style="font-weight:600; font-size:15px; color:#111827; margin-bottom:8px;">Are you sure?</p>
            <p style="color:#667085; font-size:14px; margin-bottom:24px;">${message}</p>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button id="cfm-cancel" style="padding:9px 18px; border:1px solid #d0d5dd; border-radius:7px; background:white; cursor:pointer; font-weight:600;">Cancel</button>
                <button id="cfm-ok" style="padding:9px 18px; border:none; border-radius:7px; background:#d92d20; color:white; cursor:pointer; font-weight:600;">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("cfm-cancel").onclick = () => overlay.remove();
    document.getElementById("cfm-ok").onclick = () => { overlay.remove(); callback(); };
}


function getProduct(id){

    return products.find(
        p => p.id == id
    );
}


function addHistory(type,details){

    history.unshift({

        id:generateID(),

        type:type,

        details:details,

        date:new Date().toLocaleString()

    });

    saveData();
}


/* =========================================
   PAGE NAVIGATION
========================================= */

function showPage(page){

    let title =
        document.getElementById("pageTitle");

    let content =
        document.getElementById("content");


    if(page === "dashboard"){

        title.innerText = "Dashboard";

        dashboard();

    }

    else if(page === "products"){

        title.innerText = "Products";

        productsPage();

    }

    else if(page === "receipts"){

        title.innerText = "Receipts";

        receiptsPage();

    }

    else if(page === "deliveries"){

        title.innerText = "Delivery Orders";

        deliveriesPage();

    }

    else if(page === "transfers"){

        title.innerText = "Internal Transfers";

        transfersPage();

    }

    else if(page === "adjustments"){

        title.innerText = "Stock Adjustments";

        adjustmentsPage();

    }

    else if(page === "history"){

        title.innerText = "Move History";

        historyPage();

    }

    else if(page === "warehouse"){

        title.innerText = "Warehouse";

        warehousePage();

    }

    else if(page === "profile"){

        title.innerText = "My Profile";

        profilePage();

    }

}


/* =========================================
   DASHBOARD
========================================= */

function dashboard(){

    let content =
        document.getElementById("content");


    let totalStock =
        products.reduce(
            (sum,p) => sum + Number(p.stock),
            0
        );


    let lowStock =
        products.filter(
            p => p.stock <= p.reorder
        ).length;


    let pendingReceipts =
        receipts.filter(
            r => r.status !== "Done"
        ).length;


    let pendingDeliveries =
        deliveries.filter(
            d => d.status !== "Done"
        ).length;


    let pendingTransfers =
        transfers.filter(
            t => t.status !== "Done"
        ).length;


    content.innerHTML = `

        <div class="grid kpi-grid">

            <div class="card">

                <div class="kpi-label">
                    Total Products in Stock
                </div>

                <div class="kpi-number">
                    ${totalStock}
                </div>

            </div>


            <div class="card">

                <div class="kpi-label">
                    Low / Out of Stock
                </div>

                <div class="kpi-number">
                    ${lowStock}
                </div>

            </div>


            <div class="card">

                <div class="kpi-label">
                    Pending Receipts
                </div>

                <div class="kpi-number">
                    ${pendingReceipts}
                </div>

            </div>


            <div class="card">

                <div class="kpi-label">
                    Pending Deliveries
                </div>

                <div class="kpi-number">
                    ${pendingDeliveries}
                </div>

            </div>


            <div class="card">

                <div class="kpi-label">
                    Transfers Scheduled
                </div>

                <div class="kpi-number">
                    ${pendingTransfers}
                </div>

            </div>

        </div>


        <div class="section-header">

            <h2>
                Quick Actions
            </h2>

        </div>


        <div class="grid"
             style="grid-template-columns:repeat(4,1fr)">

            <button
                class="card btn"
                onclick="openProductModal()">

                ➕ Add Product

            </button>


            <button
                class="card btn"
                onclick="openReceiptModal()">

                📥 New Receipt

            </button>


            <button
                class="card btn"
                onclick="openDeliveryModal()">

                📤 New Delivery

            </button>


            <button
                class="card btn"
                onclick="openTransferModal()">

                🔄 New Transfer

            </button>

        </div>


        <div class="section-header">

            <h2>
                Low Stock Alerts
            </h2>

        </div>


        <div class="card">

            ${lowStockTable()}

        </div>

    `;
}


/* =========================================
   LOW STOCK
========================================= */

function lowStockTable(){

    let low =
        products.filter(
            p => p.stock <= p.reorder
        );


    if(low.length === 0){

        return `
            <div class="empty">
                No low-stock products 🎉
            </div>
        `;

    }


    return `

        <div class="table-container">

            <table>

                <thead>

                    <tr>

                        <th>
                            Product
                        </th>

                        <th>
                            Stock
                        </th>

                        <th>
                            Reorder Level
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${low.map(p => `

                        <tr>

                            <td>
                                ${p.name}
                            </td>

                            <td>
                                ${p.stock}
                                ${p.unit}
                            </td>

                            <td>
                                ${p.reorder}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

}


/* =========================================
   PRODUCTS
========================================= */

function productsPage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Product Management
            </h2>

            <button
                class="btn btn-primary"
                onclick="openProductModal()">

                + Create Product

            </button>

        </div>


        <div class="card">

            <div class="table-container">

                <table>

                    <thead>

                        <tr>

                            <th>Name</th>

                            <th>SKU</th>

                            <th>Category</th>

                            <th>Stock</th>

                            <th>Location</th>

                            <th>Status</th>

                            <th>Action</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${products.map(p => `

                            <tr>

                                <td>
                                    <b>${p.name}</b>
                                </td>

                                <td>
                                    ${p.sku}
                                </td>

                                <td>
                                    ${p.category}
                                </td>

                                <td>
                                    ${p.stock} ${p.unit}
                                </td>

                                <td>
                                    ${p.location}
                                </td>

                                <td>

                                    ${
                                        p.stock <= 0

                                        ?

                                        `<span class="badge red">
                                            Out of Stock
                                        </span>`

                                        :

                                        p.stock <= p.reorder

                                        ?

                                        `<span class="badge yellow">
                                            Low Stock
                                        </span>`

                                        :

                                        `<span class="badge green">
                                            In Stock
                                        </span>`
                                    }

                                </td>

                                <td>

                                    <button
                                        class="btn btn-secondary"
                                        onclick="editProduct(${p.id})">

                                        Edit

                                    </button>


                                    <button
                                        class="btn btn-danger"
                                        onclick="deleteProduct(${p.id})">

                                        Delete

                                    </button>

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>

    `;
}


/* =========================================
   PRODUCT MODAL
========================================= */

function openProductModal(id=null){

    let p =
        id
        ?
        getProduct(id)
        :
        {

            name:"",
            sku:"",
            category:"",
            unit:"pcs",
            stock:0,
            reorder:10,
            location:warehouses[0]

        };


    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            ${id ? "Update" : "Create"} Product
        </h2>

        <br>


        <form
            class="form"
            onsubmit="saveProduct(event,${id || 0})">


            <div class="form-group">

                <label>
                    Product Name
                </label>

                <input
                    name="name"
                    value="${p.name}"
                    required>

            </div>


            <div class="form-group">

                <label>
                    SKU / Code
                </label>

                <input
                    name="sku"
                    value="${p.sku}"
                    required>

            </div>


            <div class="form-group">

                <label>
                    Category
                </label>

                <input
                    name="category"
                    value="${p.category}"
                    required>

            </div>


            <div class="form-group">

                <label>
                    Unit
                </label>

                <select name="unit">

                    <option
                        ${p.unit==="pcs"?"selected":""}>
                        pcs
                    </option>

                    <option
                        ${p.unit==="kg"?"selected":""}>
                        kg
                    </option>

                    <option
                        ${p.unit==="litre"?"selected":""}>
                        litre
                    </option>

                </select>

            </div>


            <div class="form-group">

                <label>
                    Initial Stock
                </label>

                <input
                    type="number"
                    name="stock"
                    value="${p.stock}"
                    min="0"
                    required>

            </div>


            <div class="form-group">

                <label>
                    Reorder Level
                </label>

                <input
                    type="number"
                    name="reorder"
                    value="${p.reorder}"
                    min="0"
                    required>

            </div>


            <div class="form-group full">

                <label>
                    Location
                </label>

                <select name="location">

                    ${warehouses.map(w => `

                        <option
                            ${p.location===w?"selected":""}>

                            ${w}

                        </option>

                    `).join("")}

                </select>

            </div>


            <div class="form-group full">

                <button class="btn btn-primary">

                    Save Product

                </button>

            </div>

        </form>

    `;


    document.getElementById("modal")
        .style.display="flex";

}


async function saveProduct(event,id){

    event.preventDefault();

    let form = new FormData(event.target);

    let data = {
        name:     form.get("name"),
        sku:      form.get("sku"),
        category: form.get("category"),
        unit:     form.get("unit"),
        stock:    Number(form.get("stock")),
        reorder:  Number(form.get("reorder")),
        location: form.get("location")
    };

    try {
        if(id){
            // Update existing
            await apiUpdateProduct(id, data);
            let p = getProduct(id);
            Object.assign(p, data);
            addHistory("Product Updated", data.name);
        } else {
            // Create new
            const result = await apiCreateProduct(data);
            data.id = result ? result.id : generateID();
            products.push(data);
            addHistory("Product Created", data.name);
        }
    } catch(e) {
        showToast(e.message || "Failed to save product.", "error");
        return;
    }

    await refreshData();
    saveData();
    closeModal();
    productsPage();
}


function editProduct(id){

    openProductModal(id);

}


function deleteProduct(id){

    let p = getProduct(id);

    confirmAction(`Delete product <b>${p.name}</b>? This cannot be undone.`, async () => {

        try {
            await apiDeleteProduct(id);
        } catch(e) { /* offline — continue */ }

        products = products.filter(x => x.id !== id);
        addHistory("Product Deleted", p.name);
        await refreshData();
        saveData();
        productsPage();
        showToast(`${p.name} deleted.`, "warning");
    });
}

function _deleteProductOLD_UNUSED(id){
    let p = getProduct(id);
    if(confirm("Delete this product?")){
        products = products.filter(x => x.id !== id);
        addHistory("Product Deleted", p.name);


        saveData();

        productsPage();

    }

}


/* =========================================
   RECEIPTS  (Prakash – Operations)
   Stock + : Supplier → Warehouse
========================================= */

function receiptsPage(){

    let content = document.getElementById("content");

    // Status badge helper
    function receiptBadge(status){
        let map = {
            "Draft":   "badge grey-badge",
            "Waiting": "badge yellow",
            "Ready":   "badge blue",
            "Done":    "badge green",
            "Cancelled": "badge red"
        };
        return `<span class="${map[status] || "badge blue"}">${status}</span>`;
    }

    content.innerHTML = `

        <div class="section-header">
            <div>
                <h2>📥 Receipts</h2>
                <p style="color:#667085;font-size:13px;margin-top:4px;">Incoming stock from suppliers — Stock +</p>
            </div>
            <button class="btn btn-primary" onclick="openReceiptModal()" id="btn-new-receipt">
                + New Receipt
            </button>
        </div>


        <div class="card">
            ${
                receipts.length
                ?
                `<div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Supplier</th>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Scheduled</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${receipts.map(r => {
                                let p = getProduct(r.productId);
                                let isDone      = r.status === "Done";
                                let isCancelled = r.status === "Cancelled";
                                return `
                                <tr>
                                    <td><code style="background:#f3f4f6;padding:3px 7px;border-radius:5px;font-size:12px;">${r.ref || "—"}</code></td>
                                    <td><b>${r.supplier}</b></td>
                                    <td>${p ? p.name : "<span style='color:#b42318'>Deleted</span>"}</td>
                                    <td>${r.quantity} ${p ? p.unit : ""}</td>
                                    <td style="color:#667085;font-size:13px;">${r.scheduledDate || "—"}</td>
                                    <td>${receiptBadge(r.status)}</td>
                                    <td style="display:flex;gap:6px;flex-wrap:wrap;">
                                        ${ !isDone && !isCancelled
                                            ? `<button class="btn btn-success" onclick="validateReceipt(${r.id})" id="btn-validate-receipt-${r.id}">✓ Validate</button>
                                               <button class="btn btn-danger"  onclick="cancelReceipt(${r.id})"   id="btn-cancel-receipt-${r.id}">✗ Cancel</button>`
                                            : isDone
                                                ? `<span style="color:#067647;font-weight:600;">✓ Done</span>`
                                                : `<span style="color:#b42318;font-weight:600;">Cancelled</span>`
                                        }
                                    </td>
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>`
                :
                `<div class="empty">No receipts yet. Click <b>+ New Receipt</b> to create one.</div>`
            }
        </div>

    `;
}


/* =========================================
   RECEIPT MODAL  (Prakash – Operations)
========================================= */

function openReceiptModal(){

    let today = new Date().toISOString().split("T")[0];

    document.getElementById("modalContent").innerHTML = `

        <h2 style="margin-bottom:4px;">📥 New Receipt</h2>
        <p style="color:#667085;font-size:13px;margin-bottom:20px;">Record incoming stock from a supplier</p>

        <form class="form" onsubmit="saveReceipt(event)" id="receipt-form">

            <div class="form-group">
                <label>Supplier Name</label>
                <input name="supplier" placeholder="e.g. ABC Traders" required>
            </div>

            <div class="form-group">
                <label>Scheduled Date</label>
                <input type="date" name="scheduledDate" value="${today}">
            </div>

            <div class="form-group">
                <label>Product</label>
                <select name="product">
                    ${products.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.stock} ${p.unit})</option>`).join("")}
                </select>
            </div>

            <div class="form-group">
                <label>Quantity to Receive</label>
                <input type="number" name="quantity" min="1" placeholder="0" required>
            </div>

            <div class="form-group">
                <label>Initial Status</label>
                <select name="status">
                    <option>Draft</option>
                    <option>Waiting</option>
                    <option>Ready</option>
                    <option selected>Draft</option>
                </select>
            </div>

            <div class="form-group">
                <label>Destination Warehouse</label>
                <select name="destWarehouse">
                    ${warehouses.map(w => `<option>${w}</option>`).join("")}
                </select>
            </div>

            <div class="form-group full" style="margin-top:8px;">
                <button class="btn btn-primary" style="width:100%;padding:12px;">Save Receipt</button>
            </div>

        </form>

    `;

    document.getElementById("modal").style.display = "flex";
}


async function saveReceipt(event){

    event.preventDefault();

    let form = new FormData(event.target);
    let qty  = Number(form.get("quantity"));

    if(qty <= 0){
        showToast("Quantity must be greater than 0.", "error");
        return;
    }

    let status = form.get("status");
    let ref    = nextRef("WH/IN");

    let receipt = {
        id:            generateID(),
        ref:           ref,
        supplier:      form.get("supplier"),
        productId:     Number(form.get("product")),
        quantity:      qty,
        scheduledDate: form.get("scheduledDate"),
        destWarehouse: form.get("destWarehouse"),
        status:        status,
        createdAt:     new Date().toLocaleString()
    };

    try {
        const result = await apiCreateReceipt({
            ref:           ref,
            supplier:      receipt.supplier,
            productId:     receipt.productId,
            quantity:      qty,
            status:        status,
            scheduledDate: receipt.scheduledDate,
            destWarehouse: receipt.destWarehouse
        });
        if(result) receipt.id = result.id;
    } catch(e) {
        showToast(e.message || "Backend error saving receipt.", "error");
    }

    receipts.push(receipt);

    if(status === "Done"){
        let p = getProduct(receipt.productId);
        if(p){
            p.stock += qty;
            p.location = receipt.destWarehouse;
            addHistory("Receipt", `[${ref}] Received ${qty} ${p.unit} of ${p.name} from ${receipt.supplier}`);
        }
    }

    await refreshData();
    saveData();
    closeModal();
    receiptsPage();
    showToast(`Receipt ${ref} created successfully.`, "success");
}


async function validateReceipt(id){

    let r = receipts.find(x => x.id === id);
    let p = getProduct(r.productId);

    if(!p){
        showToast("Product no longer exists in the system.", "error");
        return;
    }

    try {
        await apiValidateReceipt(r.id);
    } catch(e) {
        showToast(e.message || "Validation failed.", "error");
        return;
    }

    p.stock += r.quantity;
    if(r.destWarehouse) p.location = r.destWarehouse;
    r.status = "Done";
    r.validatedAt = new Date().toLocaleString();
    addHistory("Receipt Validated", `[${r.ref}] +${r.quantity} ${p.unit} of ${p.name} from ${r.supplier}`);

    await refreshData();
    saveData();
    receiptsPage();
    showToast(`Receipt ${r.ref} validated. Stock updated: +${r.quantity} ${p.unit}.`, "success");
}


async function cancelReceipt(id){

    let r = receipts.find(x => x.id === id);

    confirmAction(`Cancel receipt <b>${r.ref}</b> from <b>${r.supplier}</b>? No stock will be added.`, async () => {

        try { await apiCancelReceipt(r.id); } catch(e) { /* offline */ }
        r.status = "Cancelled";
        addHistory("Receipt Cancelled", `[${r.ref}] Cancelled – ${r.supplier}`);
        await refreshData();
        saveData();
        receiptsPage();
        showToast(`Receipt ${r.ref} has been cancelled.`, "warning");

    });
}


/* =========================================
   DELIVERIES  (Prakash – Operations)
   Stock - : Warehouse → Customer
========================================= */

function deliveriesPage(){

    let content = document.getElementById("content");

    function deliveryBadge(status){
        let map = {
            "Draft":     "badge grey-badge",
            "Waiting":   "badge yellow",
            "Ready":     "badge blue",
            "Done":      "badge green",
            "Cancelled": "badge red"
        };
        return `<span class="${map[status] || "badge blue"}">${status}</span>`;
    }

    content.innerHTML = `

        <div class="section-header">
            <div>
                <h2>📤 Delivery Orders</h2>
                <p style="color:#667085;font-size:13px;margin-top:4px;">Outgoing stock to customers — Stock −</p>
            </div>
            <button class="btn btn-primary" onclick="openDeliveryModal()" id="btn-new-delivery">
                + New Delivery
            </button>
        </div>

        <div class="card">
            ${
                deliveries.length
                ?
                `<div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Customer</th>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Scheduled</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${deliveries.map(d => {
                                let p = getProduct(d.productId);
                                let isDone      = d.status === "Done";
                                let isCancelled = d.status === "Cancelled";
                                let stockWarning = (p && !isDone && !isCancelled && p.stock < d.quantity)
                                    ? `<span style="color:#b54708;font-size:12px;"> ⚠ Low stock</span>` : "";
                                return `
                                <tr>
                                    <td><code style="background:#f3f4f6;padding:3px 7px;border-radius:5px;font-size:12px;">${d.ref || "—"}</code></td>
                                    <td><b>${d.customer}</b></td>
                                    <td>${p ? p.name : "<span style='color:#b42318'>Deleted</span>"}${stockWarning}</td>
                                    <td>${d.quantity} ${p ? p.unit : ""}</td>
                                    <td style="color:#667085;font-size:13px;">${d.scheduledDate || "—"}</td>
                                    <td>${deliveryBadge(d.status)}</td>
                                    <td style="display:flex;gap:6px;flex-wrap:wrap;">
                                        ${ !isDone && !isCancelled
                                            ? `<button class="btn btn-success" onclick="validateDelivery(${d.id})"  id="btn-validate-delivery-${d.id}">✓ Validate</button>
                                               <button class="btn btn-danger"  onclick="cancelDelivery(${d.id})"   id="btn-cancel-delivery-${d.id}">✗ Cancel</button>`
                                            : isDone
                                                ? `<span style="color:#067647;font-weight:600;">✓ Done</span>`
                                                : `<span style="color:#b42318;font-weight:600;">Cancelled</span>`
                                        }
                                    </td>
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>`
                :
                `<div class="empty">No deliveries yet. Click <b>+ New Delivery</b> to create one.</div>`
            }
        </div>

    `;
}


/* =========================================
   DELIVERY MODAL  (Prakash – Operations)
========================================= */

function openDeliveryModal(){

    let today = new Date().toISOString().split("T")[0];

    document.getElementById("modalContent").innerHTML = `

        <h2 style="margin-bottom:4px;">📤 New Delivery Order</h2>
        <p style="color:#667085;font-size:13px;margin-bottom:20px;">Send stock out to a customer</p>

        <form class="form" onsubmit="saveDelivery(event)" id="delivery-form">

            <div class="form-group">
                <label>Customer Name</label>
                <input name="customer" placeholder="e.g. XYZ Corp" required>
            </div>

            <div class="form-group">
                <label>Scheduled Date</label>
                <input type="date" name="scheduledDate" value="${today}">
            </div>

            <div class="form-group">
                <label>Product</label>
                <select name="product">
                    ${products.map(p => `<option value="${p.id}">${p.name} (Available: ${p.stock} ${p.unit})</option>`).join("")}
                </select>
            </div>

            <div class="form-group">
                <label>Quantity to Deliver</label>
                <input type="number" name="quantity" min="1" placeholder="0" required>
            </div>

            <div class="form-group">
                <label>Source Warehouse</label>
                <select name="srcWarehouse">
                    ${warehouses.map(w => `<option>${w}</option>`).join("")}
                </select>
            </div>

            <div class="form-group">
                <label>Initial Status</label>
                <select name="status">
                    <option>Draft</option>
                    <option>Waiting</option>
                    <option>Ready</option>
                </select>
            </div>

            <div class="form-group full" style="margin-top:8px;">
                <button class="btn btn-primary" style="width:100%;padding:12px;">Save Delivery</button>
            </div>

        </form>

    `;

    document.getElementById("modal").style.display = "flex";
}


async function saveDelivery(event){

    event.preventDefault();

    let form   = new FormData(event.target);
    let p      = getProduct(form.get("product"));
    let qty    = Number(form.get("quantity"));
    let status = form.get("status");
    let ref    = nextRef("WH/OUT");

    if(!p){ showToast("Selected product not found.", "error"); return; }
    if(qty <= 0){ showToast("Quantity must be greater than 0.", "error"); return; }
    if(status === "Done" && p.stock < qty){
        showToast(`Insufficient stock! Available: ${p.stock} ${p.unit}.`, "error"); return;
    }

    let delivery = {
        id:            generateID(),
        ref:           ref,
        customer:      form.get("customer"),
        productId:     Number(form.get("product")),
        quantity:      qty,
        scheduledDate: form.get("scheduledDate"),
        status:        status,
        createdAt:     new Date().toLocaleString()
    };

    try {
        const result = await apiCreateDelivery({
            ref, customer: delivery.customer,
            productId: delivery.productId, quantity: qty,
            status, scheduledDate: delivery.scheduledDate
        });
        if(result) delivery.id = result.id;
    } catch(e) { showToast(e.message || "Backend error.", "error"); }

    deliveries.push(delivery);
    if(status === "Done"){
        p.stock -= qty;
        addHistory("Delivery", `[${ref}] Delivered ${qty} ${p.unit} of ${p.name} to ${delivery.customer}`);
    }

    await refreshData();
    saveData(); closeModal(); deliveriesPage();
    showToast(`Delivery ${ref} created successfully.`, "success");
}


async function validateDelivery(id){

    let d = deliveries.find(x => x.id === id);
    let p = getProduct(d.productId);

    if(!p){ showToast("Product no longer exists.", "error"); return; }
    if(p.stock < d.quantity){
        showToast(`Cannot validate: Only ${p.stock} ${p.unit} available, ${d.quantity} needed.`, "error"); return;
    }

    try {
        await apiValidateDelivery(d.id);
    } catch(e) { showToast(e.message || "Validation failed.", "error"); return; }

    p.stock -= d.quantity;
    d.status = "Done"; d.validatedAt = new Date().toLocaleString();
    addHistory("Delivery Validated", `[${d.ref}] −${d.quantity} ${p.unit} of ${p.name} → ${d.customer}`);

    await refreshData(); saveData(); deliveriesPage();
    showToast(`Delivery ${d.ref} validated. Stock: −${d.quantity} ${p.unit}.`, "success");
}


async function cancelDelivery(id){
    let d = deliveries.find(x => x.id === id);
    confirmAction(`Cancel delivery <b>${d.ref}</b> to <b>${d.customer}</b>? No stock deducted.`, async () => {
        try { await apiCancelDelivery(d.id); } catch(e) { /* offline */ }
        d.status = "Cancelled";
        addHistory("Delivery Cancelled", `[${d.ref}] Cancelled – ${d.customer}`);
        await refreshData(); saveData(); deliveriesPage();
        showToast(`Delivery ${d.ref} cancelled.`, "warning");
    });
}


/* =========================================
   INTERNAL TRANSFERS  (Prakash – Operations)
   Location A → Location B
========================================= */

function transfersPage(){

    let content = document.getElementById("content");

    function transferBadge(status){
        let map = {
            "Draft":     "badge grey-badge",
            "Waiting":   "badge yellow",
            "Ready":     "badge blue",
            "Done":      "badge green",
            "Cancelled": "badge red"
        };
        return `<span class="${map[status] || "badge blue"}">${status}</span>`;
    }

    content.innerHTML = `

        <div class="section-header">
            <div>
                <h2>🔄 Internal Transfers</h2>
                <p style="color:#667085;font-size:13px;margin-top:4px;">Move stock between locations — A → B</p>
            </div>
            <button class="btn btn-primary" onclick="openTransferModal()" id="btn-new-transfer">
                + New Transfer
            </button>
        </div>

        <div class="card">
            ${
                transfers.length
                ?
                `<div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Reference</th>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Scheduled</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transfers.map(t => {
                                let p = getProduct(t.productId);
                                let isDone      = t.status === "Done";
                                let isCancelled = t.status === "Cancelled";
                                return `
                                <tr>
                                    <td><code style="background:#f3f4f6;padding:3px 7px;border-radius:5px;font-size:12px;">${t.ref || "—"}</code></td>
                                    <td>${p ? p.name : "<span style='color:#b42318'>Deleted</span>"}</td>
                                    <td>${t.quantity} ${p ? p.unit : ""}</td>
                                    <td>
                                        <span style="background:#f0f9ff;color:#0369a1;padding:3px 8px;border-radius:20px;font-size:12px;font-weight:600;">📍 ${t.from}</span>
                                    </td>
                                    <td>
                                        <span style="background:#f0fdf4;color:#166534;padding:3px 8px;border-radius:20px;font-size:12px;font-weight:600;">📍 ${t.to}</span>
                                    </td>
                                    <td style="color:#667085;font-size:13px;">${t.scheduledDate || "—"}</td>
                                    <td>${transferBadge(t.status)}</td>
                                    <td style="display:flex;gap:6px;flex-wrap:wrap;">
                                        ${ !isDone && !isCancelled
                                            ? `<button class="btn btn-success" onclick="validateTransfer(${t.id})"  id="btn-validate-transfer-${t.id}">✓ Validate</button>
                                               <button class="btn btn-danger"  onclick="cancelTransfer(${t.id})"    id="btn-cancel-transfer-${t.id}">✗ Cancel</button>`
                                            : isDone
                                                ? `<span style="color:#067647;font-weight:600;">✓ Done</span>`
                                                : `<span style="color:#b42318;font-weight:600;">Cancelled</span>`
                                        }
                                    </td>
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>`
                :
                `<div class="empty">No transfers yet. Click <b>+ New Transfer</b> to create one.</div>`
            }
        </div>

    `;
}


/* =========================================
   TRANSFER MODAL  (Prakash – Operations)
========================================= */

function openTransferModal(){

    let today = new Date().toISOString().split("T")[0];

    document.getElementById("modalContent").innerHTML = `

        <h2 style="margin-bottom:4px;">🔄 Internal Transfer</h2>
        <p style="color:#667085;font-size:13px;margin-bottom:20px;">Move stock from one location to another</p>

        <form class="form" onsubmit="saveTransfer(event)" id="transfer-form">

            <div class="form-group">
                <label>Product</label>
                <select name="product">
                    ${products.map(p => `<option value="${p.id}">${p.name} @ ${p.location} (${p.stock} ${p.unit})</option>`).join("")}
                </select>
            </div>

            <div class="form-group">
                <label>Scheduled Date</label>
                <input type="date" name="scheduledDate" value="${today}">
            </div>

            <div class="form-group">
                <label>From Location</label>
                <select name="from">
                    ${warehouses.map(w => `<option>${w}</option>`).join("")}
                </select>
            </div>

            <div class="form-group">
                <label>To Location</label>
                <select name="to">
                    ${warehouses.map((w, i) => `<option ${i===1?"selected":""}>${w}</option>`).join("")}
                </select>
            </div>

            <div class="form-group">
                <label>Quantity</label>
                <input type="number" name="quantity" min="1" placeholder="0" required>
            </div>

            <div class="form-group">
                <label>Initial Status</label>
                <select name="status">
                    <option>Draft</option>
                    <option>Waiting</option>
                    <option>Ready</option>
                </select>
            </div>

            <div class="form-group full" style="margin-top:8px;">
                <button class="btn btn-primary" style="width:100%;padding:12px;">Save Transfer</button>
            </div>

        </form>

    `;

    document.getElementById("modal").style.display = "flex";
}


async function saveTransfer(event){

    event.preventDefault();

    let form   = new FormData(event.target);
    let p      = getProduct(form.get("product"));
    let from   = form.get("from");
    let to     = form.get("to");
    let qty    = Number(form.get("quantity"));
    let status = form.get("status");
    let ref    = nextRef("WH/INT");

    if(!p){ showToast("Product not found.", "error"); return; }
    if(qty <= 0){ showToast("Quantity must be > 0.", "error"); return; }
    if(from === to){ showToast("Source and destination cannot be the same.", "error"); return; }
    if(status === "Done" && p.stock < qty){
        showToast(`Insufficient stock! Available: ${p.stock} ${p.unit}.`, "error"); return;
    }

    let transfer = {
        id: generateID(), ref, productId: Number(form.get("product")),
        quantity: qty, from, to,
        scheduledDate: form.get("scheduledDate"),
        status, createdAt: new Date().toLocaleString()
    };

    try {
        const result = await apiCreateTransfer({
            ref, productId: transfer.productId, quantity: qty,
            from, to, status, scheduledDate: transfer.scheduledDate
        });
        if(result) transfer.id = result.id;
    } catch(e) { showToast(e.message || "Backend error.", "error"); }

    transfers.push(transfer);
    if(status === "Done"){
        p.location = to;
        addHistory("Internal Transfer", `[${ref}] ${qty} ${p.unit} of ${p.name}: ${from} → ${to}`);
    }

    await refreshData(); saveData(); closeModal(); transfersPage();
    showToast(`Transfer ${ref} created successfully.`, "success");
}


async function validateTransfer(id){

    let t = transfers.find(x => x.id === id);
    let p = getProduct(t.productId);

    if(!p){ showToast("Product no longer exists.", "error"); return; }
    if(t.from === t.to){ showToast("Same source and destination.", "error"); return; }
    if(p.stock < t.quantity){
        showToast(`Insufficient stock! Available: ${p.stock} ${p.unit}.`, "error"); return;
    }

    try {
        await apiValidateTransfer(t.id);
    } catch(e) { showToast(e.message || "Validation failed.", "error"); return; }

    p.location = t.to; t.status = "Done"; t.validatedAt = new Date().toLocaleString();
    addHistory("Transfer Validated", `[${t.ref}] ${t.quantity} ${p.unit} of ${p.name}: ${t.from} → ${t.to}`);

    await refreshData(); saveData(); transfersPage();
    showToast(`Transfer ${t.ref} validated. ${p.name} → ${t.to}.`, "success");
}


async function cancelTransfer(id){
    let t = transfers.find(x => x.id === id);
    confirmAction(`Cancel transfer <b>${t.ref}</b>? No stock movement will occur.`, async () => {
        try { await apiCancelTransfer(t.id); } catch(e) { /* offline */ }
        t.status = "Cancelled";
        addHistory("Transfer Cancelled", `[${t.ref}] Cancelled`);
        await refreshData(); saveData(); transfersPage();
        showToast(`Transfer ${t.ref} cancelled.`, "warning");
    });
}


/* =========================================
   ADJUSTMENTS
========================================= */

function adjustmentsPage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Stock Adjustments
            </h2>

            <button
                class="btn btn-primary"
                onclick="openAdjustmentModal()">

                + New Adjustment

            </button>

        </div>


        <div class="card">

            ${
                adjustments.length

                ?

                `<table>

                    <thead>

                        <tr>

                            <th>Product</th>

                            <th>Old Stock</th>

                            <th>Counted</th>

                            <th>Difference</th>

                            <th>Reason</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${adjustments.map(a => {

                            let p =
                                getProduct(
                                    a.productId
                                );

                            return `

                            <tr>

                                <td>
                                    ${p.name}
                                </td>

                                <td>
                                    ${a.oldStock}
                                </td>

                                <td>
                                    ${a.counted}
                                </td>

                                <td>
                                    ${a.difference}
                                </td>

                                <td>
                                    ${a.reason}
                                </td>

                            </tr>

                            `;

                        }).join("")}

                    </tbody>

                </table>`

                :

                `<div class="empty">
                    No adjustments found.
                </div>`
            }

        </div>

    `;

}


/* =========================================
   ADJUSTMENT MODAL
========================================= */

function openAdjustmentModal(){

    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            Stock Adjustment
        </h2>

        <br>


        <form
            class="form"
            onsubmit="saveAdjustment(event)">


            <div class="form-group">

                <label>
                    Product
                </label>

                <select name="product">

                    ${products.map(p => `

                        <option value="${p.id}">

                            ${p.name}

                        </option>

                    `).join("")}

                </select>

            </div>


            <div class="form-group">

                <label>
                    Physical Count
                </label>

                <input
                    type="number"
                    name="counted"
                    min="0"
                    required>

            </div>


            <div class="form-group full">

                <label>
                    Reason
                </label>

                <textarea
                    name="reason"
                    rows="3"
                    placeholder="Damaged, missing, counting error...">
                </textarea>

            </div>


            <div class="form-group full">

                <button class="btn btn-primary">

                    Apply Adjustment

                </button>

            </div>

        </form>

    `;


    document.getElementById("modal")
        .style.display="flex";

}


function saveAdjustment(event){

    event.preventDefault();


    let form =
        new FormData(event.target);


    let p =
        getProduct(
            form.get("product")
        );


    let oldStock =
        p.stock;


    let counted =
        Number(
            form.get("counted")
        );


    let difference =
        counted - oldStock;


    p.stock =
        counted;


    adjustments.push({

        id:generateID(),

        productId:p.id,

        oldStock:oldStock,

        counted:counted,

        difference:difference,

        reason:form.get("reason")

    });


    addHistory(
        "Stock Adjustment",
        `${p.name}: ${oldStock} → ${counted}`
    );


    saveData();

    closeModal();

    adjustmentsPage();

}


/* =========================================
   HISTORY
========================================= */

function historyPage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Stock Ledger
            </h2>

            <button
                class="btn btn-danger"
                onclick="clearHistory()">

                Clear History

            </button>

        </div>


        <div class="card">

            ${
                history.length

                ?

                `<table>

                    <thead>

                        <tr>

                            <th>Type</th>

                            <th>Details</th>

                            <th>Date</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${history.map(h => `

                            <tr>

                                <td>
                                    <span class="badge blue">
                                        ${h.type}
                                    </span>
                                </td>

                                <td>
                                    ${h.details}
                                </td>

                                <td>
                                    ${h.date}
                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>`

                :

                `<div class="empty">
                    No history yet.
                </div>`
            }

        </div>

    `;

}


function clearHistory(){

    if(
        confirm(
            "Clear complete stock history?"
        )
    ){

        history=[];

        saveData();

        historyPage();

    }

}


/* =========================================
   WAREHOUSE
========================================= */



/* =========================================
   WAREHOUSE
========================================= */

function warehousePage(){

    let content = document.getElementById("content");

    /*
       Demo warehouse data
       Existing warehouses + extra realistic locations
    */

    const warehouseDetails = {
        "Main Warehouse": {
            code: "WH-001",
            type: "Central Storage",
            capacity: "2,500 Units",
            manager: "Anjali Kumari",
            status: "Active"
        },

        "Production Rack": {
            code: "WH-002",
            type: "Production",
            capacity: "1,200 Units",
            manager: "Rahul Sharma",
            status: "Active"
        },

        "Warehouse 2": {
            code: "WH-003",
            type: "General Storage",
            capacity: "1,800 Units",
            manager: "Priya Singh",
            status: "Active"
        },

        "Raw Material Store": {
            code: "WH-004",
            type: "Raw Material",
            capacity: "3,000 Units",
            manager: "Aman Kumar",
            status: "Active"
        },

        "Finished Goods": {
            code: "WH-005",
            type: "Finished Goods",
            capacity: "2,000 Units",
            manager: "Neha Verma",
            status: "Active"
        },

        "Packaging Unit": {
            code: "WH-006",
            type: "Packaging",
            capacity: "1,000 Units",
            manager: "Riya Gupta",
            status: "Active"
        },

        "Electronics Store": {
            code: "WH-007",
            type: "Electronics",
            capacity: "1,500 Units",
            manager: "Arjun Mehta",
            status: "Active"
        },

        "Furniture Section": {
            code: "WH-008",
            type: "Furniture",
            capacity: "2,200 Units",
            manager: "Karan Singh",
            status: "Active"
        },

        "Dispatch Center": {
            code: "WH-009",
            type: "Dispatch",
            capacity: "1,700 Units",
            manager: "Vikas Kumar",
            status: "Active"
        },

        "Quality Control": {
            code: "WH-010",
            type: "Quality Check",
            capacity: "800 Units",
            manager: "Sneha Patel",
            status: "Active"
        },

        "Cold Storage": {
            code: "WH-011",
            type: "Cold Storage",
            capacity: "1,300 Units",
            manager: "Pooja Singh",
            status: "Active"
        },

        "Spare Parts Store": {
            code: "WH-012",
            type: "Spare Parts",
            capacity: "1,100 Units",
            manager: "Rohit Das",
            status: "Active"
        },

        "North Storage": {
            code: "WH-013",
            type: "Regional Storage",
            capacity: "2,400 Units",
            manager: "Nikhil Kumar",
            status: "Active"
        },

        "South Storage": {
            code: "WH-014",
            type: "Regional Storage",
            capacity: "2,000 Units",
            manager: "Simran Kaur",
            status: "Active"
        },

        "Overflow Warehouse": {
            code: "WH-015",
            type: "Overflow",
            capacity: "3,500 Units",
            manager: "Mohit Raj",
            status: "Active"
        }
    };


    /*
       Calculate warehouse statistics
    */

    let totalStock = products.reduce(
        (sum, p) => sum + Number(p.stock),
        0
    );

    let totalProducts = products.length;

    let lowStock = products.filter(
        p => Number(p.stock) <= Number(p.reorder)
    ).length;


    /*
       Main Warehouse Page
    */

    content.innerHTML = `

        <div class="warehouse-page">

            <!-- HEADER -->

            <div class="warehouse-heading">

                <div>

                    <span class="warehouse-mini-label">
                        INVENTORY CONTROL CENTER
                    </span>

                    <h2>
                        Warehouse Locations
                    </h2>

                    <p>
                        Manage storage locations, stock distribution
                        and warehouse operations.
                    </p>

                </div>

                <button
                    class="warehouse-add-btn"
                    onclick="addWarehouse()">

                    <span>＋</span>
                    Add Warehouse

                </button>

            </div>


            <!-- DECORATIVE STOCK BACKGROUND -->

            <div class="warehouse-visual">

                <div class="visual-grid"></div>

                <div class="visual-line line-a"></div>
                <div class="visual-line line-b"></div>

                <div class="visual-bar bar-a"></div>
                <div class="visual-bar bar-b"></div>
                <div class="visual-bar bar-c"></div>
                <div class="visual-bar bar-d"></div>
                <div class="visual-bar bar-e"></div>

                <div class="stock-floating stock-one">
                    STOCK +24%
                </div>

                <div class="stock-floating stock-two">
                    VALUE +16%
                </div>

                <div class="stock-floating stock-three">
                    LOSS -4%
                </div>

                <div class="warehouse-illustration">
                    🏭
                </div>

                <div class="visual-content">

                    <span>
                        SMART WAREHOUSE
                    </span>

                    <h3>
                        Track. Store. Deliver.
                    </h3>

                    <p>
                        Complete visibility of your inventory
                        across every location.
                    </p>

                </div>

            </div>


            <!-- KPI CARDS -->

            <div class="warehouse-kpi-grid">

                <div class="warehouse-kpi-card pink">

                    <div class="kpi-icon">
                        🏭
                    </div>

                    <div>
                        <span>
                            Total Warehouses
                        </span>

                        <strong>
                            ${warehouses.length}
                        </strong>
                    </div>

                </div>


                <div class="warehouse-kpi-card purple">

                    <div class="kpi-icon">
                        📦
                    </div>

                    <div>
                        <span>
                            Total Products
                        </span>

                        <strong>
                            ${totalProducts}
                        </strong>
                    </div>

                </div>


                <div class="warehouse-kpi-card blue">

                    <div class="kpi-icon">
                        📊
                    </div>

                    <div>
                        <span>
                            Total Stock
                        </span>

                        <strong>
                            ${totalStock}
                        </strong>
                    </div>

                </div>


                <div class="warehouse-kpi-card orange">

                    <div class="kpi-icon">
                        ⚠️
                    </div>

                    <div>
                        <span>
                            Low Stock Items
                        </span>

                        <strong>
                            ${lowStock}
                        </strong>
                    </div>

                </div>

            </div>


            <!-- SEARCH -->

            <div class="warehouse-toolbar">

                <div>

                    <h3>
                        All Warehouse Locations
                    </h3>

                    <p>
                        ${warehouses.length} storage locations available
                    </p>

                </div>


                <div class="warehouse-local-search">

                    <span>⌕</span>

                    <input
                        type="text"
                        id="warehouseSearch"
                        placeholder="Search warehouse..."
                        onkeyup="filterWarehouses()">

                </div>

            </div>


            <!-- WAREHOUSE TABLE -->

            <div class="warehouse-table-card">

                <div class="table-responsive">

                    <table class="warehouse-table">

                        <thead>

                            <tr>

                                <th>
                                    Warehouse
                                </th>

                                <th>
                                    Code
                                </th>

                                <th>
                                    Type
                                </th>

                                <th>
                                    Products
                                </th>

                                <th>
                                    Total Stock
                                </th>

                                <th>
                                    Capacity
                                </th>

                                <th>
                                    Manager
                                </th>

                                <th>
                                    Status
                                </th>

                            </tr>

                        </thead>


                        <tbody id="warehouseTableBody">

                            ${renderWarehouseRows(warehouseDetails)}

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- BOTTOM INFO -->

            <div class="warehouse-bottom-grid">

                <div class="warehouse-info-card">

                    <div class="info-card-icon">
                        📈
                    </div>

                    <div>

                        <h4>
                            Stock Distribution
                        </h4>

                        <p>
                            Monitor how inventory is distributed
                            across different warehouse locations.
                        </p>

                    </div>

                </div>


                <div class="warehouse-info-card">

                    <div class="info-card-icon">
                        🔄
                    </div>

                    <div>

                        <h4>
                            Internal Movement
                        </h4>

                        <p>
                            Track stock transfers between
                            warehouses without changing total stock.
                        </p>

                    </div>

                </div>


                <div class="warehouse-info-card">

                    <div class="info-card-icon">
                        🔔
                    </div>

                    <div>

                        <h4>
                            Smart Alerts
                        </h4>

                        <p>
                            Identify low-stock locations and
                            take action before inventory runs out.
                        </p>

                    </div>

                </div>

            </div>

        </div>

    `;
}


/* =========================================
   WAREHOUSE TABLE ROWS
========================================= */

function renderWarehouseRows(warehouseDetails){

    return warehouses.map((warehouse, index) => {

        let locationProducts = products.filter(
            p => p.location === warehouse
        );

        let total = locationProducts.reduce(
            (sum, p) => sum + Number(p.stock),
            0
        );


        /*
           If newly added warehouse doesn't have
           predefined details, generate details.
        */

        let info = warehouseDetails[warehouse] || {

            code:
                "WH-" +
                String(index + 1).padStart(3, "0"),

            type: "General Storage",

            capacity: "1,500 Units",

            manager: "Warehouse Manager",

            status: "Active"

        };


        return `

            <tr
                class="warehouse-row"
                data-name="${warehouse.toLowerCase()}">

                <td>

                    <div class="warehouse-name-cell">

                        <div class="warehouse-icon">
                            🏭
                        </div>

                        <div>

                            <strong>
                                ${warehouse}
                            </strong>

                            <small>
                                Storage Location
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <span class="warehouse-code">
                        ${info.code}
                    </span>

                </td>


                <td>

                    <span class="warehouse-type">
                        ${info.type}
                    </span>

                </td>


                <td>

                    <strong class="number-blue">
                        ${locationProducts.length}
                    </strong>

                </td>


                <td>

                    <strong class="stock-number">
                        ${total}
                    </strong>

                </td>


                <td>

                    <span class="capacity-text">
                        ${info.capacity}
                    </span>

                </td>


                <td>

                    <span class="manager-text">
                        ${info.manager}
                    </span>

                </td>


                <td>

                    <span class="warehouse-status">
                        ● ${info.status}
                    </span>

                </td>

            </tr>

        `;

    }).join("");

}


/* =========================================
   ADD WAREHOUSE
========================================= */

function addWarehouse(){

    let modal = document.getElementById("modal");

    modal.innerHTML = `

        <div class="modal-box warehouse-modal">

            <button
                type="button"
                class="warehouse-close"
                onclick="closeModal()">

                ×

            </button>


            <div class="warehouse-modal-icon">
                🏭
            </div>


            <h2>
                Add New Warehouse
            </h2>

            <p class="warehouse-modal-subtitle">
                Create a new storage location for StockSense.
            </p>


            <div class="warehouse-form">

                <div class="form-group">

                    <label>
                        Warehouse Name
                    </label>

                    <input
                        type="text"
                        id="newWarehouseName"
                        placeholder="e.g. Central Storage"
                        required>

                </div>


                <div class="form-group">

                    <label>
                        Location / Area
                    </label>

                    <input
                        type="text"
                        id="newWarehouseLocation"
                        placeholder="e.g. Building A">

                </div>


                <div class="form-group">

                    <label>
                        Warehouse Type
                    </label>

                    <select id="newWarehouseType">

                        <option>
                            General Storage
                        </option>

                        <option>
                            Raw Material
                        </option>

                        <option>
                            Finished Goods
                        </option>

                        <option>
                            Production
                        </option>

                        <option>
                            Dispatch
                        </option>

                        <option>
                            Cold Storage
                        </option>

                    </select>

                </div>


                <div class="form-group">

                    <label>
                        Capacity
                    </label>

                    <input
                        type="number"
                        id="newWarehouseCapacity"
                        placeholder="e.g. 1500"
                        min="1">

                </div>


                <div class="warehouse-form-actions">

                    <button
                        type="button"
                        class="warehouse-cancel-btn"
                        onclick="closeModal()">

                        Cancel

                    </button>


                    <button
                        type="button"
                        class="warehouse-save-btn"
                        onclick="saveWarehouse()">

                        + Add Warehouse

                    </button>

                </div>

            </div>

        </div>

    `;

    modal.style.display = "flex";

}


/* =========================================
   SAVE WAREHOUSE
========================================= */

function saveWarehouse(){

    let name =
        document
        .getElementById("newWarehouseName")
        .value
        .trim();


    let location =
        document
        .getElementById("newWarehouseLocation")
        .value
        .trim();


    let type =
        document
        .getElementById("newWarehouseType")
        .value;


    let capacity =
        document
        .getElementById("newWarehouseCapacity")
        .value;


    if(!name){

        alert(
            "Please enter warehouse name."
        );

        return;

    }


    /*
       Check duplicate warehouse
    */

    let exists = warehouses.some(
        w =>
        w.toLowerCase() === name.toLowerCase()
    );


    if(exists){

        alert(
            "Warehouse already exists."
        );

        return;

    }


    /*
       Add warehouse
    */

    warehouses.push(name);


    /*
       Save data
    */

    saveData();


    /*
       Close modal
    */

    closeModal();


    /*
       Refresh warehouse page
    */

    warehousePage();


    /*
       Success message
    */

    if(typeof showToast === "function"){

        showToast(
            `${name} added successfully.`,
            "success"
        );

    }

}


/* =========================================
   WAREHOUSE SEARCH
========================================= */

function filterWarehouses(){

    let input =
        document
        .getElementById("warehouseSearch");


    if(!input){
        return;
    }


    let value =
        input.value
        .toLowerCase()
        .trim();


    let rows =
        document.querySelectorAll(
            ".warehouse-row"
        );


    rows.forEach(row => {

        let name =
            row
            .getAttribute("data-name")
            .toLowerCase();


        if(name.includes(value)){

            row.style.display = "";

        }
        else{

            row.style.display = "none";

        }

    });

}
function addWarehouse(){

    let name =
        prompt(
            "Enter warehouse name:"
        );


    if(!name){

        return;

    }


    if(
        warehouses.includes(name)
    ){

        alert(
            "Warehouse already exists."
        );

        return;

    }


    warehouses.push(name);

    saveData();

    warehousePage();

}


/* =========================================
   PROFILE
========================================= */

// function profilePage(){

//     document.getElementById(
//         "content"
//     ).innerHTML = `

//         <div class="card">

//             <h2>
//                 My Profile
//             </h2>

//             <br>

//             <p>
//                 <b>Name:</b>
//                 Inventory Manager
//             </p>

//             <br>

//             <p>
//                 <b>Role:</b>
//                 Inventory Manager
//             </p>

//             <br>

//             <p>
//                 <b>System:</b>
//                 StockSense
//             </p>

//             <br>

//             <button
//                 class="btn btn-danger"
//                 onclick="logout()">

//                 Logout

//             </button>

//         </div>

//     `;

// }


// /* =========================================
//    LOGOUT
// ========================================= */

// function logout(){

//     alert(
//         "Logout clicked."
//     );

// }


// /* =========================================
//    CLOSE MODAL
// ========================================= */

// function closeModal(){

//     document.getElementById(
//         "modal"
//     ).style.display="none";

// }


// /* =========================================
//    GLOBAL SEARCH
// ========================================= */

// function globalSearch(){

//     let value =
//         document.getElementById(
//             "search"
//         ).value.toLowerCase();


//     if(!value){

//         return;

//     }


//     let result =
//         products.filter(
//             p =>
//             p.name
//             .toLowerCase()
//             .includes(value)
//             ||
//             p.sku
//             .toLowerCase()
//             .includes(value)
//         );


//     if(result.length){

//         showPage("products");

//     }



// }
/* =========================================
   GLOBAL PRODUCT SEARCH
========================================= */

function globalSearch(){

    let input =
        document.getElementById("search");

    if(!input){
        return;
    }

    let value =
        input.value
        .toLowerCase()
        .trim();


    /*
       If search is empty,
       don't do anything
    */

    if(!value){

        return;

    }


    /*
       Find product by:
       1. Product name
       2. SKU
       3. Category
       4. Location
    */

    let result =
        products.filter(p =>

            p.name
            .toLowerCase()
            .includes(value)

            ||

            p.sku
            .toLowerCase()
            .includes(value)

            ||

            p.category
            .toLowerCase()
            .includes(value)

            ||

            p.location
            .toLowerCase()
            .includes(value)

        );


    /*
       Open Products page
    */

    showPage("products");


    /*
       Filter product rows
    */

    setTimeout(() => {

        let rows =
            document.querySelectorAll(
                "#content table tbody tr"
            );


        rows.forEach(row => {

            let text =
                row.innerText.toLowerCase();


            if(text.includes(value)){

                row.style.display = "";

            }
            else{

                row.style.display = "none";

            }

        });

    }, 50);

}

/* =========================================
   FANCY INVENTORY MANAGER PROFILE
========================================= */

function profilePage(){

    let content =
        document.getElementById("content");


    /*
       Inventory Manager profile data
    */

    let manager = {

        name: "Anjali Kumari",

        role: "Inventory Manager",

        email: "anjali@stocksense.com",

        phone: "+91 98765 43210",

        location: "Main Warehouse",

        department: "Inventory Operations",

        bio:
        "Inventory Manager responsible for monitoring stock, managing warehouse operations, validating receipts and deliveries, and maintaining accurate inventory records."

    };


    /*
       Calculate profile completion
    */

    let completed = 0;

    if(manager.name) completed++;

    if(manager.role) completed++;

    if(manager.email) completed++;

    if(manager.phone) completed++;

    if(manager.location) completed++;

    if(manager.department) completed++;

    if(manager.bio) completed++;


    let totalFields = 7;

    let percentage =
        Math.round(
            (completed / totalFields) * 100
        );


    /*
       Inventory statistics
    */

    let totalProducts =
        products.length;


    let totalStock =
        products.reduce(
            (sum,p) =>
            sum + Number(p.stock),
            0
        );


    let lowStock =
        products.filter(
            p => p.stock <= p.reorder
        ).length;


    let warehousesCount =
        warehouses.length;


    content.innerHTML = `

        <div class="profile-page">


            <!-- =================================
                 PROFILE HERO
            ================================= -->

            <div class="profile-hero">


                <!-- Background decoration -->

                <div class="hero-chart">

                    <div class="chart-line line-one"></div>

                    <div class="chart-line line-two"></div>

                    <div class="chart-line line-three"></div>


                    <div class="chart-bar bar-one"></div>

                    <div class="chart-bar bar-two"></div>

                    <div class="chart-bar bar-three"></div>

                    <div class="chart-bar bar-four"></div>

                    <div class="chart-bar bar-five"></div>

                    <div class="chart-bar bar-six"></div>

                    <div class="chart-bar bar-seven"></div>


                    <div class="glow-circle glow-one"></div>

                    <div class="glow-circle glow-two"></div>

                </div>


                <!-- Profile information -->

                <div class="profile-hero-content">


                    <div class="profile-avatar-large">

                        AK

                    </div>


                    <div class="profile-main-info">

                        <div class="profile-name-row">

                            <h1>
                                ${manager.name}
                            </h1>

                            <span class="verified-badge">
                                ✓ Verified
                            </span>

                        </div>


                        <p class="profile-role">

                            📦 ${manager.role}

                        </p>


                        <p class="profile-location">

                            📍 ${manager.location}

                        </p>


                        <div class="profile-tags">

                            <span>
                                Inventory Operations
                            </span>

                            <span>
                                Warehouse Management
                            </span>

                            <span>
                                Stock Control
                            </span>

                        </div>

                    </div>


                    <button
                        class="profile-edit-btn"
                        onclick="openEditProfile()">

                        ✎ Edit Profile

                    </button>

                </div>

            </div>



            <!-- =================================
                 PROFILE BODY
            ================================= -->

            <div class="profile-layout">


                <!-- LEFT SIDE -->

                <div class="profile-left">


                    <!-- PERSONAL INFORMATION -->

                    <div class="profile-card">


                        <div class="profile-card-header">

                            <div>

                                <h2>
                                    Personal Information
                                </h2>

                                <p>
                                    Your account and contact details
                                </p>

                            </div>


                            <button
                                class="small-edit"
                                onclick="openEditProfile()">

                                ✎ Edit

                            </button>

                        </div>


                        <div class="personal-grid">


                            <div class="info-item">

                                <span class="info-icon">
                                    👤
                                </span>

                                <div>

                                    <small>
                                        Full Name
                                    </small>

                                    <strong>
                                        ${manager.name}
                                    </strong>

                                </div>

                            </div>


                            <div class="info-item">

                                <span class="info-icon">
                                    ✉️
                                </span>

                                <div>

                                    <small>
                                        Email
                                    </small>

                                    <strong>
                                        ${manager.email}
                                    </strong>

                                </div>

                            </div>


                            <div class="info-item">

                                <span class="info-icon">
                                    📞
                                </span>

                                <div>

                                    <small>
                                        Phone
                                    </small>

                                    <strong>
                                        ${manager.phone}
                                    </strong>

                                </div>

                            </div>


                            <div class="info-item">

                                <span class="info-icon">
                                    🏭
                                </span>

                                <div>

                                    <small>
                                        Department
                                    </small>

                                    <strong>
                                        ${manager.department}
                                    </strong>

                                </div>

                            </div>


                            <div class="info-item">

                                <span class="info-icon">
                                    📍
                                </span>

                                <div>

                                    <small>
                                        Location
                                    </small>

                                    <strong>
                                        ${manager.location}
                                    </strong>

                                </div>

                            </div>


                            <div class="info-item">

                                <span class="info-icon">
                                    🛡️
                                </span>

                                <div>

                                    <small>
                                        Access Level
                                    </small>

                                    <strong>
                                        Manager
                                    </strong>

                                </div>

                            </div>


                        </div>

                    </div>



                    <!-- ABOUT -->

                    <div class="profile-card">


                        <div class="profile-card-header">

                            <div>

                                <h2>
                                    About Me
                                </h2>

                                <p>
                                    Your professional profile
                                </p>

                            </div>


                            <button
                                class="small-edit"
                                onclick="openEditProfile()">

                                ✎ Edit

                            </button>

                        </div>


                        <p class="profile-bio">

                            ${manager.bio}

                        </p>

                    </div>



                    <!-- INVENTORY ACTIVITY -->

                    <div class="profile-card">


                        <div class="profile-card-header">

                            <div>

                                <h2>
                                    Inventory Overview
                                </h2>

                                <p>
                                    Your current operational summary
                                </p>

                            </div>

                        </div>


                        <div class="profile-stats">


                            <div class="profile-stat purple">

                                <div class="stat-symbol">
                                    📦
                                </div>

                                <div>

                                    <span>
                                        Products
                                    </span>

                                    <strong>
                                        ${totalProducts}
                                    </strong>

                                </div>

                            </div>


                            <div class="profile-stat blue">

                                <div class="stat-symbol">
                                    📊
                                </div>

                                <div>

                                    <span>
                                        Total Stock
                                    </span>

                                    <strong>
                                        ${totalStock}
                                    </strong>

                                </div>

                            </div>


                            <div class="profile-stat orange">

                                <div class="stat-symbol">
                                    ⚠️
                                </div>

                                <div>

                                    <span>
                                        Low Stock
                                    </span>

                                    <strong>
                                        ${lowStock}
                                    </strong>

                                </div>

                            </div>


                            <div class="profile-stat green">

                                <div class="stat-symbol">
                                    🏭
                                </div>

                                <div>

                                    <span>
                                        Warehouses
                                    </span>

                                    <strong>
                                        ${warehousesCount}
                                    </strong>

                                </div>

                            </div>


                        </div>

                    </div>

                </div>



                <!-- =================================
                     RIGHT SIDE
                ================================= -->

                <div class="profile-right">


                    <!-- PROFILE COMPLETION -->

                    <div class="completion-card">


                        <div class="completion-header">

                            <div>

                                <h2>
                                    Complete Your Profile
                                </h2>

                                <p>
                                    Keep your profile updated
                                </p>

                            </div>

                        </div>


                        <!-- CIRCLE -->

                        <div class="completion-circle"
                             style="
                             --progress:${percentage * 3.6}deg;
                             ">

                            <div class="circle-inner">

                                <strong>
                                    ${percentage}%
                                </strong>

                                <span>
                                    Complete
                                </span>

                            </div>

                        </div>


                        <!-- CHECKLIST -->

                        <div class="completion-list">


                            <div class="completion-item done">

                                <span>✓</span>

                                <div>

                                    <b>
                                        Setup account
                                    </b>

                                    <small>
                                        Account created
                                    </small>

                                </div>

                                <strong>
                                    15%
                                </strong>

                            </div>


                            <div class="completion-item done">

                                <span>✓</span>

                                <div>

                                    <b>
                                        Personal information
                                    </b>

                                    <small>
                                        Contact details added
                                    </small>

                                </div>

                                <strong>
                                    15%
                                </strong>

                            </div>


                            <div class="completion-item done">

                                <span>✓</span>

                                <div>

                                    <b>
                                        Warehouse assigned
                                    </b>

                                    <small>
                                        ${manager.location}
                                    </small>

                                </div>

                                <strong>
                                    15%
                                </strong>

                            </div>


                            <div class="completion-item done">

                                <span>✓</span>

                                <div>

                                    <b>
                                        Role information
                                    </b>

                                    <small>
                                        ${manager.role}
                                    </small>

                                </div>

                                <strong>
                                    15%
                                </strong>

                            </div>


                            <div class="completion-item">

                                <span>○</span>

                                <div>

                                    <b>
                                        Profile photo
                                    </b>

                                    <small>
                                        Add a professional photo
                                    </small>

                                </div>

                                <strong>
                                    10%
                                </strong>

                            </div>


                            <div class="completion-item">

                                <span>○</span>

                                <div>

                                    <b>
                                        Notification settings
                                    </b>

                                    <small>
                                        Configure alerts
                                    </small>

                                </div>

                                <strong>
                                    10%
                                </strong>

                            </div>


                        </div>


                        <button
                            class="complete-profile-btn"
                            onclick="openEditProfile()">

                            Complete Profile →

                        </button>

                    </div>



                    <!-- SECURITY CARD -->

                    <div class="security-card">

                        <div class="security-icon">
                            🔐
                        </div>

                        <div>

                            <h3>
                                Account Security
                            </h3>

                            <p>
                                Your account is protected
                            </p>

                            <span class="security-status">
                                ● Secure
                            </span>

                        </div>

                    </div>



                    <!-- ROLE CARD -->

                    <div class="role-card">

                        <div class="role-icon">
                            📦
                        </div>

                        <h3>
                            Inventory Manager
                        </h3>

                        <p>
                            Full access to inventory,
                            warehouse and stock operations.
                        </p>

                        <div class="role-permissions">

                            <span>✓ Products</span>

                            <span>✓ Receipts</span>

                            <span>✓ Deliveries</span>

                            <span>✓ Transfers</span>

                            <span>✓ Adjustments</span>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    `;
}


/* =========================================
   EDIT PROFILE
========================================= */

// function openEditProfile(){

//     document.getElementById(
//         "modalContent"
//     ).innerHTML = `

//         <h2>
//             Edit Inventory Manager Profile
//         </h2>

//         <br>


//         <form
//             class="form"
//             onsubmit="saveProfile(event)">


//             <div class="form-group">

//                 <label>
//                     Full Name
//                 </label>

//                 <input
//                     name="name"
//                     value="Anjali Kumari"
//                     required>

//             </div>


//             <div class="form-group">

//                 <label>
//                     Role
//                 </label>

//                 <input
//                     name="role"
//                     value="Inventory Manager"
//                     readonly>

//             </div>


//             <div class="form-group">

//                 <label>
//                     Email
//                 </label>

//                 <input
//                     type="email"
//                     name="email"
//                     value="anjali@stocksense.com"
//                     required>

//             </div>


//             <div class="form-group">

//                 <label>
//                     Phone
//                 </label>

//                 <input
//                     name="phone"
//                     value="+91 98765 43210">

//             </div>


//             <div class="form-group">

//                 <label>
//                     Warehouse
//                 </label>

//                 <select name="location">

//                     ${warehouses.map(w => `

//                         <option>
//                             ${w}
//                         </option>

//                     `).join("")}

//                 </select>

//             </div>


//             <div class="form-group">

//                 <label>
//                     Department
//                 </label>

//                 <input
//                     name="department"
//                     value="Inventory Operations">

//             </div>


//             <div class="form-group full">

//                 <label>
//                     Bio
//                 </label>

//                 <textarea
//                     name="bio"
//                     rows="5">Inventory Manager responsible for monitoring stock, managing warehouse operations, validating receipts and deliveries, and maintaining accurate inventory records.</textarea>

//             </div>


//             <div class="form-group full">

//                 <button
//                     class="btn btn-primary">

//                     Save Profile

//                 </button>

//             </div>

//         </form>

//     `;


//     document.getElementById("modal")
//         .style.display="flex";

// }
function openEditProfile() {

    const profile = JSON.parse(
        localStorage.getItem("managerProfile")
    ) || {
        name: "Anjali Kumari",
        role: "Inventory Manager",
        email: "anjali@stocksense.com",
        phone: "+91 98765 43210",
        warehouse: "Main Warehouse",
        department: "Inventory Operations",
        bio: "Inventory Manager responsible for monitoring stock, managing warehouse operations, validating receipts and deliveries, and maintaining accurate inventory records."
    };

    const modal = document.getElementById("modal");

    modal.innerHTML = `
        <div class="modal-box profile-modal">

            <button
                type="button"
                class="profile-close-btn"
                onclick="closeProfileModal()">
                ×
            </button>

            <h2>Edit Inventory Manager Profile</h2>

            <div class="form">

                <!-- FULL NAME -->
                <div class="form-group">
                    <label>
                        Full Name <span class="required-star">*</span>
                    </label>

                    <input
                        type="text"
                        id="profileName"
                        value="${profile.name || ""}"
                        placeholder="Enter full name"
                        required>
                </div>


                <!-- ROLE -->
                <div class="form-group">
                    <label>
                        Role <span class="required-star">*</span>
                    </label>

                    <input
                        type="text"
                        id="profileRole"
                        value="${profile.role || ""}"
                        placeholder="Enter role"
                        required>
                </div>


                <!-- EMAIL -->
                <div class="form-group">
                    <label>
                        Email <span class="required-star">*</span>
                    </label>

                    <input
                        type="email"
                        id="profileEmail"
                        value="${profile.email || ""}"
                        placeholder="example@email.com"
                        required>
                </div>


                <!-- PHONE OPTIONAL -->
                <div class="form-group">
                    <label>
                        Phone Number
                        <span class="optional-text">(Optional)</span>
                    </label>

                    <input
                        type="tel"
                        id="profilePhone"
                        value="${profile.phone || ""}"
                        placeholder="+91 98765 43210"
                        pattern="^(\\+91[\\s-]?)?[6-9][0-9]{9}$"
                        title="Enter a valid 10-digit Indian mobile number">
                        
                    <small class="field-hint">
                        Leave blank if you don't want to provide a phone number.
                    </small>
                </div>


                <!-- WAREHOUSE -->
                <div class="form-group">
                    <label>
                        Warehouse <span class="required-star">*</span>
                    </label>

                    <select id="profileWarehouse" required>

                        <option value="Main Warehouse"
                            ${profile.warehouse === "Main Warehouse" ? "selected" : ""}>
                            Main Warehouse
                        </option>

                        <option value="Warehouse 2"
                            ${profile.warehouse === "Warehouse 2" ? "selected" : ""}>
                            Warehouse 2
                        </option>

                        <option value="Warehouse 3"
                            ${profile.warehouse === "Warehouse 3" ? "selected" : ""}>
                            Warehouse 3
                        </option>

                    </select>
                </div>


                <!-- DEPARTMENT -->
                <div class="form-group">
                    <label>
                        Department <span class="required-star">*</span>
                    </label>

                    <input
                        type="text"
                        id="profileDepartment"
                        value="${profile.department || ""}"
                        placeholder="Enter department"
                        required>
                </div>


                <!-- BIO -->
                <div class="form-group full">
                    <label>
                        Bio <span class="required-star">*</span>
                    </label>

                    <textarea
                        id="profileBio"
                        rows="5"
                        placeholder="Write a short description"
                        required>${profile.bio || ""}</textarea>
                </div>

            </div>


            <button
                type="button"
                class="profile-save-btn"
                onclick="saveProfile()">

                Save Profile

            </button>

        </div>
    `;

    modal.style.display = "flex";
}
function saveProfile() {

    const name = document
        .getElementById("profileName")
        .value
        .trim();

    const role = document
        .getElementById("profileRole")
        .value
        .trim();

    const email = document
        .getElementById("profileEmail")
        .value
        .trim();

    const phone = document
        .getElementById("profilePhone")
        .value
        .trim();

    const warehouse = document
        .getElementById("profileWarehouse")
        .value
        .trim();

    const department = document
        .getElementById("profileDepartment")
        .value
        .trim();

    const bio = document
        .getElementById("profileBio")
        .value
        .trim();


    /* REQUIRED FIELD VALIDATION */

    if (!name) {
        alert("Please enter Full Name.");
        return;
    }

    if (!role) {
        alert("Please enter Role.");
        return;
    }

    if (!email) {
        alert("Please enter Email.");
        return;
    }

    if (!warehouse) {
        alert("Please select Warehouse.");
        return;
    }

    if (!department) {
        alert("Please enter Department.");
        return;
    }

    if (!bio) {
        alert("Please enter Bio.");
        return;
    }


    /* EMAIL VALIDATION */

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        alert("Please enter a valid email address.");

        return;
    }


    /* PHONE VALIDATION ONLY IF USER ENTERED PHONE */

    if (phone) {

        const phonePattern =
            /^(\+91[\s-]?)?[6-9][0-9]{9}$/;

        if (!phonePattern.test(phone)) {

            alert(
                "Please enter a valid 10-digit Indian phone number."
            );

            return;
        }
    }


    /* SAVE PROFILE */

    const profile = {

        name: name,

        role: role,

        email: email,

        phone: phone,

        warehouse: warehouse,

        department: department,

        bio: bio
    };


    localStorage.setItem(
        "managerProfile",
        JSON.stringify(profile)
    );


    /* CLOSE MODAL */

    closeProfileModal();




    /* REFRESH PROFILE PAGE */

    renderCurrentPage();


    /* SUCCESS MESSAGE */

    alert("Profile updated successfully!");
}

// function saveProfile(event){

//     event.preventDefault();


//     alert(
//         "Profile updated successfully!"
//     );


//     closeModal();

//     profilePage();

// }
/* =========================================
   START APPLICATION
========================================= */

function closeProfileModal() {

    const modal = document.getElementById("modal");

    if (modal) {

        modal.style.display = "none";

        modal.innerHTML = "";
    }
}
showPage("dashboard");