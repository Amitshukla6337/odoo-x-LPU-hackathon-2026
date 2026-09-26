/* =========================================
   STOCKSENSE INVENTORY MANAGEMENT SYSTEM
========================================= */


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


function saveProduct(event,id){

    event.preventDefault();


    let form =
        new FormData(event.target);


    let data = {

        name:form.get("name"),

        sku:form.get("sku"),

        category:form.get("category"),

        unit:form.get("unit"),

        stock:Number(form.get("stock")),

        reorder:Number(form.get("reorder")),

        location:form.get("location")

    };


    if(id){

        let p =
            getProduct(id);

        Object.assign(p,data);

        addHistory(
            "Product Updated",
            data.name
        );

    }

    else{

        data.id =
            generateID();

        products.push(data);

        addHistory(
            "Product Created",
            data.name
        );

    }


    saveData();

    closeModal();

    productsPage();

}


function editProduct(id){

    openProductModal(id);

}


function deleteProduct(id){

    let p =
        getProduct(id);


    if(confirm(
        "Delete this product?"
    )){

        products =
            products.filter(
                x => x.id !== id
            );


        addHistory(
            "Product Deleted",
            p.name
        );


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


function saveReceipt(event){

    event.preventDefault();

    let form = new FormData(event.target);

    let qty = Number(form.get("quantity"));

    if(qty <= 0){
        showToast("Quantity must be greater than 0.", "error");
        return;
    }

    let status = form.get("status");

    let receipt = {
        id:            generateID(),
        ref:           nextRef("WH/IN"),
        supplier:      form.get("supplier"),
        productId:     Number(form.get("product")),
        quantity:      qty,
        scheduledDate: form.get("scheduledDate"),
        destWarehouse: form.get("destWarehouse"),
        status:        status,
        createdAt:     new Date().toLocaleString()
    };

    receipts.push(receipt);

    // If directly marked Done, apply stock immediately
    if(status === "Done"){
        let p = getProduct(receipt.productId);
        if(p){
            p.stock += qty;
            p.location = receipt.destWarehouse;
            addHistory("Receipt", `[${receipt.ref}] Received ${qty} ${p.unit} of ${p.name} from ${receipt.supplier}`);
        }
    }

    saveData();
    closeModal();
    receiptsPage();
    showToast(`Receipt ${receipt.ref} created successfully.`, "success");
}


function validateReceipt(id){

    let r = receipts.find(x => x.id === id);
    let p = getProduct(r.productId);

    if(!p){
        showToast("Product no longer exists in the system.", "error");
        return;
    }

    p.stock += r.quantity;
    if(r.destWarehouse) p.location = r.destWarehouse;

    r.status = "Done";
    r.validatedAt = new Date().toLocaleString();

    addHistory("Receipt Validated", `[${r.ref}] +${r.quantity} ${p.unit} of ${p.name} from ${r.supplier}`);

    saveData();
    receiptsPage();
    showToast(`Receipt ${r.ref} validated. Stock updated: +${r.quantity} ${p.unit}.`, "success");
}


function cancelReceipt(id){

    let r = receipts.find(x => x.id === id);

    confirmAction(`Cancel receipt <b>${r.ref}</b> from <b>${r.supplier}</b>? No stock will be added.`, () => {

        r.status = "Cancelled";
        addHistory("Receipt Cancelled", `[${r.ref}] Cancelled – ${r.supplier}`);
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


function saveDelivery(event){

    event.preventDefault();

    let form     = new FormData(event.target);
    let p        = getProduct(form.get("product"));
    let qty      = Number(form.get("quantity"));
    let status   = form.get("status");

    // Validation
    if(!p){
        showToast("Selected product not found.", "error");
        return;
    }

    if(qty <= 0){
        showToast("Quantity must be greater than 0.", "error");
        return;
    }

    // Stock-check: only block if trying to validate immediately
    if(status === "Done" && p.stock < qty){
        showToast(`Insufficient stock! Available: ${p.stock} ${p.unit}, Requested: ${qty} ${p.unit}.`, "error");
        return;
    }

    let delivery = {
        id:            generateID(),
        ref:           nextRef("WH/OUT"),
        customer:      form.get("customer"),
        productId:     Number(form.get("product")),
        quantity:      qty,
        scheduledDate: form.get("scheduledDate"),
        srcWarehouse:  form.get("srcWarehouse"),
        status:        status,
        createdAt:     new Date().toLocaleString()
    };

    deliveries.push(delivery);

    if(delivery.status === "Done"){
        p.stock -= qty;
        addHistory("Delivery", `[${delivery.ref}] Delivered ${qty} ${p.unit} of ${p.name} to ${delivery.customer}`);
    }

    saveData();
    closeModal();
    deliveriesPage();
    showToast(`Delivery ${delivery.ref} created successfully.`, "success");
}


function validateDelivery(id){

    let d = deliveries.find(x => x.id === id);
    let p = getProduct(d.productId);

    if(!p){
        showToast("Product no longer exists in the system.", "error");
        return;
    }

    if(p.stock < d.quantity){
        showToast(`Cannot validate: Only ${p.stock} ${p.unit} available, but ${d.quantity} ${p.unit} needed.`, "error");
        return;
    }

    p.stock -= d.quantity;
    d.status = "Done";
    d.validatedAt = new Date().toLocaleString();

    addHistory("Delivery Validated", `[${d.ref}] −${d.quantity} ${p.unit} of ${p.name} → ${d.customer}`);

    saveData();
    deliveriesPage();
    showToast(`Delivery ${d.ref} validated. Stock updated: −${d.quantity} ${p.unit}.`, "success");
}


function cancelDelivery(id){

    let d = deliveries.find(x => x.id === id);

    confirmAction(`Cancel delivery <b>${d.ref}</b> to <b>${d.customer}</b>? No stock will be deducted.`, () => {

        d.status = "Cancelled";
        addHistory("Delivery Cancelled", `[${d.ref}] Cancelled – ${d.customer}`);
        saveData();
        deliveriesPage();
        showToast(`Delivery ${d.ref} has been cancelled.`, "warning");

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


function saveTransfer(event){

    event.preventDefault();

    let form     = new FormData(event.target);
    let p        = getProduct(form.get("product"));
    let from     = form.get("from");
    let to       = form.get("to");
    let qty      = Number(form.get("quantity"));
    let status   = form.get("status");

    // ── Validation ─────────────────────────────────────────────
    if(!p){
        showToast("Selected product not found.", "error");
        return;
    }

    if(qty <= 0){
        showToast("Quantity must be greater than 0.", "error");
        return;
    }

    if(from === to){
        showToast("Source and destination locations cannot be the same.", "error");
        return;
    }

    // Note: We intentionally do NOT require p.location === from
    // (multi-product-per-location systems allow flexible routing)
    if(status === "Done" && p.stock < qty){
        showToast(`Insufficient stock for immediate validation! Available: ${p.stock} ${p.unit}.`, "error");
        return;
    }
    // ────────────────────────────────────────────────────────────

    let transfer = {
        id:            generateID(),
        ref:           nextRef("WH/INT"),
        productId:     Number(form.get("product")),
        quantity:      qty,
        from:          from,
        to:            to,
        scheduledDate: form.get("scheduledDate"),
        status:        status,
        createdAt:     new Date().toLocaleString()
    };

    transfers.push(transfer);

    if(transfer.status === "Done"){
        // Transfer: stock stays same (just location moves), unless you want to track per-location stock
        p.location = to;
        addHistory("Internal Transfer", `[${transfer.ref}] ${qty} ${p.unit} of ${p.name}: ${from} → ${to}`);
    }

    saveData();
    closeModal();
    transfersPage();
    showToast(`Transfer ${transfer.ref} created successfully.`, "success");
}


function validateTransfer(id){

    let t = transfers.find(x => x.id === id);
    let p = getProduct(t.productId);

    if(!p){
        showToast("Product no longer exists in the system.", "error");
        return;
    }

    if(t.from === t.to){
        showToast("Cannot transfer: source and destination are the same location.", "error");
        return;
    }

    if(p.stock < t.quantity){
        showToast(`Insufficient stock! Available: ${p.stock} ${p.unit}, Required: ${t.quantity} ${p.unit}.`, "error");
        return;
    }

    // Apply the transfer
    p.location = t.to;
    t.status   = "Done";
    t.validatedAt = new Date().toLocaleString();

    addHistory("Transfer Validated", `[${t.ref}] ${t.quantity} ${p.unit} of ${p.name}: ${t.from} → ${t.to}`);

    saveData();
    transfersPage();
    showToast(`Transfer ${t.ref} validated. ${p.name} moved to ${t.to}.`, "success");
}


function cancelTransfer(id){

    let t = transfers.find(x => x.id === id);

    confirmAction(`Cancel transfer <b>${t.ref}</b>? No stock movement will occur.`, () => {

        t.status = "Cancelled";
        addHistory("Transfer Cancelled", `[${t.ref}] Cancelled`);
        saveData();
        transfersPage();
        showToast(`Transfer ${t.ref} has been cancelled.`, "warning");

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

function warehousePage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Warehouse Locations
            </h2>

            <button
                class="btn btn-primary"
                onclick="addWarehouse()">

                + Add Warehouse

            </button>

        </div>


        <div class="card">

            <table>

                <thead>

                    <tr>

                        <th>
                            Warehouse
                        </th>

                        <th>
                            Products
                        </th>

                        <th>
                            Total Stock
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${warehouses.map(w => {

                        let locationProducts =
                            products.filter(
                                p =>
                                p.location === w
                            );


                        let total =
                            locationProducts.reduce(
                                (sum,p)=>
                                sum+p.stock,
                                0
                            );


                        return `

                        <tr>

                            <td>
                                🏭 ${w}
                            </td>

                            <td>
                                ${locationProducts.length}
                            </td>

                            <td>
                                ${total}
                            </td>

                        </tr>

                        `;

                    }).join("")}

                </tbody>

            </table>

        </div>

    `;

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

function profilePage(){

    document.getElementById(
        "content"
    ).innerHTML = `

        <div class="card">

            <h2>
                My Profile
            </h2>

            <br>

            <p>
                <b>Name:</b>
                Inventory Manager
            </p>

            <br>

            <p>
                <b>Role:</b>
                Inventory Manager
            </p>

            <br>

            <p>
                <b>System:</b>
                StockSense
            </p>

            <br>

            <button
                class="btn btn-danger"
                onclick="logout()">

                Logout

            </button>

        </div>

    `;

}


/* =========================================
   LOGOUT
========================================= */

function logout(){

    alert(
        "Logout clicked."
    );

}


/* =========================================
   CLOSE MODAL
========================================= */

function closeModal(){

    document.getElementById(
        "modal"
    ).style.display="none";

}


/* =========================================
   GLOBAL SEARCH
========================================= */

function globalSearch(){

    let value =
        document.getElementById(
            "search"
        ).value.toLowerCase();


    if(!value){

        return;

    }


    let result =
        products.filter(
            p =>
            p.name
            .toLowerCase()
            .includes(value)
            ||
            p.sku
            .toLowerCase()
            .includes(value)
        );


    if(result.length){

        showPage("products");

    }

}


/* =========================================
   START APPLICATION
========================================= */

showPage("dashboard");