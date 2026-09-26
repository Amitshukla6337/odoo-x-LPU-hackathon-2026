const http = require("http");
const fs = require("fs");

const PORT = 3000;
const FILE = "./products.json";

function getProducts() {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveProducts(products) {
    fs.writeFileSync(FILE, JSON.stringify(products, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    // GET all products
    if (req.method === "GET" && req.url === "/api/products") {
        return res.end(JSON.stringify(getProducts()));
    }

    // POST product
    if (req.method === "POST" && req.url === "/api/products") {
        let body = "";

        req.on("data", chunk => body += chunk);

        req.on("end", () => {
            const products = getProducts();
            const product = JSON.parse(body);

            product.id = Date.now();
            products.push(product);
            saveProducts(products);

            res.writeHead(201);
            res.end(JSON.stringify(product));
        });

        return;
    }

    // DELETE product
    if (req.method === "DELETE" && req.url.startsWith("/api/products/")) {
        const id = Number(req.url.split("/").pop());
        const products = getProducts();

        const updated = products.filter(p => p.id !== id);
        saveProducts(updated);

        return res.end(JSON.stringify({ success: true }));
    }

    if (req.url === "/api/health") {
        return res.end(JSON.stringify({
            status: "OK",
            service: "StockSense Backend"
        }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "Route not found" }));
});

server.listen(PORT, () => {
    console.log(`StockSense Backend running on http://localhost:${PORT}`);
});