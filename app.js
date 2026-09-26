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
   RECEIPTS
========================================= */

function receiptsPage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Incoming Stock
            </h2>

            <button
                class="btn btn-primary"
                onclick="openReceiptModal()">

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

                                <th>Supplier</th>

                                <th>Product</th>

                                <th>Quantity</th>

                                <th>Status</th>

                                <th>Action</th>

                            </tr>

                        </thead>


                        <tbody>

                            ${receipts.map(r => {

                                let p =
                                    getProduct(r.productId);

                                return `

                                <tr>

                                    <td>
                                        ${r.supplier}
                                    </td>

                                    <td>
                                        ${p ? p.name : "Deleted"}
                                    </td>

                                    <td>
                                        ${r.quantity}
                                    </td>

                                    <td>
                                        <span class="badge blue">
                                            ${r.status}
                                        </span>
                                    </td>

                                    <td>

                                        ${
                                            r.status !== "Done"

                                            ?

                                            `<button
                                                class="btn btn-success"
                                                onclick="validateReceipt(${r.id})">

                                                Validate

                                            </button>`

                                            :

                                            "✓ Completed"
                                        }

                                    </td>

                                </tr>

                                `;

                            }).join("")}

                        </tbody>

                    </table>

                </div>`

                :

                `<div class="empty">
                    No receipts found.
                </div>`
            }

        </div>

    `;

}


/* =========================================
   RECEIPT MODAL
========================================= */

function openReceiptModal(){

    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            New Receipt
        </h2>

        <br>


        <form
            class="form"
            onsubmit="saveReceipt(event)">


            <div class="form-group">

                <label>
                    Supplier
                </label>

                <input
                    name="supplier"
                    required>

            </div>


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
                    Quantity
                </label>

                <input
                    type="number"
                    name="quantity"
                    min="1"
                    required>

            </div>


            <div class="form-group">

                <label>
                    Status
                </label>

                <select name="status">

                    <option>
                        Draft
                    </option>

                    <option>
                        Waiting
                    </option>

                    <option>
                        Ready
                    </option>

                    <option>
                        Done
                    </option>

                </select>

            </div>


            <div class="form-group full">

                <button class="btn btn-primary">

                    Save Receipt

                </button>

            </div>

        </form>

    `;


    document.getElementById("modal")
        .style.display="flex";

}


function saveReceipt(event){

    event.preventDefault();


    let form =
        new FormData(event.target);


    let receipt = {

        id:generateID(),

        supplier:form.get("supplier"),

        productId:Number(
            form.get("product")
        ),

        quantity:Number(
            form.get("quantity")
        ),

        status:form.get("status")

    };


    receipts.push(receipt);


    if(receipt.status === "Done"){

        let p =
            getProduct(
                receipt.productId
            );


        p.stock +=
            receipt.quantity;


        addHistory(
            "Receipt",
            `Received ${receipt.quantity} ${p.unit} of ${p.name}`
        );

    }


    saveData();

    closeModal();

    receiptsPage();

}


function validateReceipt(id){

    let r =
        receipts.find(
            x => x.id === id
        );


    let p =
        getProduct(r.productId);


    p.stock +=
        r.quantity;


    r.status =
        "Done";


    addHistory(
        "Receipt Validated",
        `Received ${r.quantity} ${p.unit} of ${p.name}`
    );


    saveData();

    receiptsPage();

}


/* =========================================
   DELIVERY
========================================= */

function deliveriesPage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Delivery Orders
            </h2>

            <button
                class="btn btn-primary"
                onclick="openDeliveryModal()">

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

                                <th>Customer</th>

                                <th>Product</th>

                                <th>Quantity</th>

                                <th>Status</th>

                                <th>Action</th>

                            </tr>

                        </thead>


                        <tbody>

                            ${deliveries.map(d => {

                                let p =
                                    getProduct(
                                        d.productId
                                    );

                                return `

                                <tr>

                                    <td>
                                        ${d.customer}
                                    </td>

                                    <td>
                                        ${p ? p.name : "Deleted"}
                                    </td>

                                    <td>
                                        ${d.quantity}
                                    </td>

                                    <td>
                                        ${d.status}
                                    </td>

                                    <td>

                                        ${
                                            d.status !== "Done"

                                            ?

                                            `<button
                                                class="btn btn-success"
                                                onclick="validateDelivery(${d.id})">

                                                Validate

                                            </button>`

                                            :

                                            "✓ Completed"
                                        }

                                    </td>

                                </tr>

                                `;

                            }).join("")}

                        </tbody>

                    </table>

                </div>`

                :

                `<div class="empty">
                    No deliveries found.
                </div>`
            }

        </div>

    `;

}


/* =========================================
   DELIVERY MODAL
========================================= */

function openDeliveryModal(){

    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            New Delivery Order
        </h2>

        <br>


        <form
            class="form"
            onsubmit="saveDelivery(event)">


            <div class="form-group">

                <label>
                    Customer
                </label>

                <input
                    name="customer"
                    required>

            </div>


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
                    Quantity
                </label>

                <input
                    type="number"
                    name="quantity"
                    min="1"
                    required>

            </div>


            <div class="form-group">

                <label>
                    Status
                </label>

                <select name="status">

                    <option>Draft</option>

                    <option>Waiting</option>

                    <option>Ready</option>

                    <option>Done</option>

                </select>

            </div>


            <div class="form-group full">

                <button
                    class="btn btn-primary">

                    Save Delivery

                </button>

            </div>

        </form>

    `;


    document.getElementById("modal")
        .style.display="flex";

}


function saveDelivery(event){

    event.preventDefault();


    let form =
        new FormData(event.target);


    let p =
        getProduct(
            form.get("product")
        );


    let quantity =
        Number(
            form.get("quantity")
        );


    if(
        form.get("status") === "Done"
        &&
        p.stock < quantity
    ){

        alert(
            "Not enough stock!"
        );

        return;

    }


    let delivery = {

        id:generateID(),

        customer:
            form.get("customer"),

        productId:
            Number(form.get("product")),

        quantity:quantity,

        status:
            form.get("status")

    };


    deliveries.push(delivery);


    if(delivery.status === "Done"){

        p.stock -=
            quantity;


        addHistory(
            "Delivery",
            `Delivered ${quantity} ${p.unit} of ${p.name}`
        );

    }


    saveData();

    closeModal();

    deliveriesPage();

}


function validateDelivery(id){

    let d =
        deliveries.find(
            x => x.id === id
        );


    let p =
        getProduct(d.productId);


    if(p.stock < d.quantity){

        alert(
            "Not enough stock!"
        );

        return;

    }


    p.stock -=
        d.quantity;


    d.status =
        "Done";


    addHistory(
        "Delivery Validated",
        `Delivered ${d.quantity} ${p.unit} of ${p.name}`
    );


    saveData();

    deliveriesPage();

}


/* =========================================
   INTERNAL TRANSFER
========================================= */

function transfersPage(){

    let content =
        document.getElementById("content");


    content.innerHTML = `

        <div class="section-header">

            <h2>
                Internal Transfers
            </h2>

            <button
                class="btn btn-primary"
                onclick="openTransferModal()">

                + New Transfer

            </button>

        </div>


        <div class="card">

            ${
                transfers.length

                ?

                `<table>

                    <thead>

                        <tr>

                            <th>Product</th>

                            <th>Quantity</th>

                            <th>From</th>

                            <th>To</th>

                            <th>Status</th>

                            <th>Action</th>

                        </tr>

                    </thead>


                    <tbody>

                        ${transfers.map(t => {

                            let p =
                                getProduct(t.productId);

                            return `

                            <tr>

                                <td>
                                    ${p.name}
                                </td>

                                <td>
                                    ${t.quantity}
                                </td>

                                <td>
                                    ${t.from}
                                </td>

                                <td>
                                    ${t.to}
                                </td>

                                <td>
                                    ${t.status}
                                </td>

                                <td>

                                    ${
                                        t.status !== "Done"

                                        ?

                                        `<button
                                            class="btn btn-success"
                                            onclick="validateTransfer(${t.id})">

                                            Validate

                                        </button>`

                                        :

                                        "✓ Completed"
                                    }

                                </td>

                            </tr>

                            `;

                        }).join("")}

                    </tbody>

                </table>`

                :

                `<div class="empty">
                    No transfers found.
                </div>`
            }

        </div>

    `;

}


/* =========================================
   TRANSFER MODAL
========================================= */

function openTransferModal(){

    document.getElementById(
        "modalContent"
    ).innerHTML = `

        <h2>
            Internal Transfer
        </h2>

        <br>


        <form
            class="form"
            onsubmit="saveTransfer(event)">


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
                    Quantity
                </label>

                <input
                    type="number"
                    name="quantity"
                    min="1"
                    required>

            </div>


            <div class="form-group">

                <label>
                    From
                </label>

                <select name="from">

                    ${warehouses.map(w => `

                        <option>
                            ${w}
                        </option>

                    `).join("")}

                </select>

            </div>


            <div class="form-group">

                <label>
                    To
                </label>

                <select name="to">

                    ${warehouses.map(w => `

                        <option>
                            ${w}
                        </option>

                    `).join("")}

                </select>

            </div>


            <div class="form-group">

                <label>
                    Status
                </label>

                <select name="status">

                    <option>Draft</option>

                    <option>Waiting</option>

                    <option>Ready</option>

                    <option>Done</option>

                </select>

            </div>


            <div class="form-group full">

                <button class="btn btn-primary">

                    Save Transfer

                </button>

            </div>

        </form>

    `;


    document.getElementById("modal")
        .style.display="flex";

}


function saveTransfer(event){

    event.preventDefault();


    let form =
        new FormData(event.target);


    let p =
        getProduct(
            form.get("product")
        );


    let from =
        form.get("from");


    let to =
        form.get("to");


    let quantity =
        Number(
            form.get("quantity")
        );


    if(from === to){

        alert(
            "From and To cannot be same."
        );

        return;

    }


    if(
        form.get("status") === "Done"
        &&
        (
            p.location !== from
            ||
            p.stock < quantity
        )
    ){

        alert(
            "Product location or stock is invalid."
        );

        return;

    }


    let transfer = {

        id:generateID(),

        productId:
            Number(form.get("product")),

        quantity:quantity,

        from:from,

        to:to,

        status:
            form.get("status")

    };


    transfers.push(transfer);


    if(transfer.status === "Done"){

        p.location =
            to;


        addHistory(
            "Internal Transfer",
            `${quantity} ${p.unit} ${p.name}: ${from} → ${to}`
        );

    }


    saveData();

    closeModal();

    transfersPage();

}


function validateTransfer(id){

    let t =
        transfers.find(
            x => x.id === id
        );


    let p =
        getProduct(t.productId);


    if(
        p.location !== t.from
        ||
        p.stock < t.quantity
    ){

        alert(
            "Transfer cannot be completed."
        );

        return;

    }


    p.location =
        t.to;


    t.status =
        "Done";


    addHistory(
        "Internal Transfer",
        `${t.quantity} ${p.unit} ${p.name}: ${t.from} → ${t.to}`
    );


    saveData();

    transfersPage();

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