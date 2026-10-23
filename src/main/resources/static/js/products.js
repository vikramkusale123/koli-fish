document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // ELEMENTS
    // =========================
    const modal = document.getElementById("productModal");
    const addButton = document.getElementById("addProductButton");
    const emptyAddButton = document.getElementById("emptyAddButton");
    const closeButton = document.getElementById("closeModal");
    const cancelButton = document.getElementById("cancelButton");
    const form = document.getElementById("productForm");

    const productTable = document.getElementById("productTable");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const statusFilter = document.getElementById("statusFilter");

    const LOW_STOCK_THRESHOLD_KG = 5;
    const PRODUCT_REFRESH_INTERVAL_MS = 30000;

    let products = [];
    let editingProductId = null;

    // =========================
    // LOW-STOCK ALERT CONTAINER
    // Created automatically so existing HTML does not need to change.
    // =========================

function getLowStockAlertContainer() {
    let container = document.getElementById("lowStockAlerts");

    if (container) {
        return container;
    }

    container = document.createElement("section");
    container.id = "lowStockAlerts";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");

    const tableWrapper = document.querySelector(".table-wrapper");

    if (tableWrapper && tableWrapper.parentElement) {
        tableWrapper.parentElement.insertBefore(container, tableWrapper);
    } else {
        const content = document.querySelector(".content");
        if (content) {
            content.appendChild(container);
        }
    }

    return container;
}


    // =========================
    // STOCK UNIT HELPERS
    // =========================
    function isKilogramUnit(unit) {
        const normalizedUnit = String(unit || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

        return [
            "kg",
            "kgs",
            "kilogram",
            "kilograms"
        ].includes(normalizedUnit);
    }

    function getStockQuantity(product) {
        if (
            product.stockQuantity === null ||
            product.stockQuantity === undefined ||
            product.stockQuantity === ""
        ) {
            return null;
        }

        const quantity = Number(product.stockQuantity);

        return Number.isFinite(quantity) ? quantity : null;
    }

    function getLowStockProducts() {
        return products.filter(function (product) {
            const quantity = getStockQuantity(product);

            return (
                isKilogramUnit(product.unit) &&
                quantity !== null &&
                quantity >= 0 &&
                quantity <= LOW_STOCK_THRESHOLD_KG
            );
        });
    }

    // =========================
    // DISPLAY IN-APP LOW-STOCK ALERTS
    // =========================

function renderLowStockAlerts() {
    const container = getLowStockAlertContainer();

    if (!container) {
        return;
    }

    const lowStockProducts = getLowStockProducts()
        .sort(function (a, b) {
            return getStockQuantity(a) - getStockQuantity(b);
        });

    container.replaceChildren();

    if (lowStockProducts.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";

    let expanded = false;

    const card = document.createElement("div");
    card.className = "low-stock-card";

    const header = document.createElement("div");
    header.className = "low-stock-header";

    const headingGroup = document.createElement("div");
    headingGroup.className = "low-stock-heading-group";

    const icon = document.createElement("div");
    icon.className = "low-stock-main-icon";
    icon.textContent = "⚠";

    const headingText = document.createElement("div");

    const heading = document.createElement("h3");
    heading.textContent = "Inventory alerts";

    const description = document.createElement("p");
    description.textContent = "Products with 5 kg or less remaining";

    headingText.appendChild(heading);
    headingText.appendChild(description);

    headingGroup.appendChild(icon);
    headingGroup.appendChild(headingText);

    const count = document.createElement("span");
    count.className = "low-stock-count";
    count.textContent = String(lowStockProducts.length);

    count.setAttribute(
        "aria-label",
        lowStockProducts.length + " low-stock products"
    );

    header.appendChild(headingGroup);
    header.appendChild(count);

    const list = document.createElement("div");
    list.className = "low-stock-list";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "low-stock-toggle";

    function renderList() {
        list.replaceChildren();

        const visibleProducts = expanded
            ? lowStockProducts
            : lowStockProducts.slice(0, 3);

        visibleProducts.forEach(function (product) {
            const quantity = getStockQuantity(product);

            const row = document.createElement("div");
            row.className = "low-stock-item";

            const productInfo = document.createElement("div");
            productInfo.className = "low-stock-product-info";

            const productName = document.createElement("strong");
            productName.textContent = product.name || "Unnamed product";

            const stockDetail = document.createElement("span");
            stockDetail.textContent =
                quantity.toLocaleString("en-IN", {
                    maximumFractionDigits: 2
                }) + " kg remaining";

            productInfo.appendChild(productName);
            productInfo.appendChild(stockDetail);

            const status = document.createElement("span");

            if (quantity === 0) {
                status.className = "low-stock-status out";
                status.textContent = "Out of stock";
            } else {
                status.className = "low-stock-status low";
                status.textContent = "Low stock";
            }

            row.appendChild(productInfo);
            row.appendChild(status);
            list.appendChild(row);
        });

        if (lowStockProducts.length > 3) {
            toggleButton.hidden = false;
            toggleButton.textContent = expanded
                ? "Show less ↑"
                : "View all " + lowStockProducts.length + " products ↓";
        } else {
            toggleButton.hidden = true;
        }

        toggleButton.setAttribute("aria-expanded", String(expanded));
    }

    toggleButton.addEventListener("click", function () {
        expanded = !expanded;
        renderList();
    });

    card.appendChild(header);
    card.appendChild(list);
    card.appendChild(toggleButton);

    container.appendChild(card);

    renderList();
}
    // =========================
    // CSRF TOKEN SUPPORT
    // =========================
    async function getCsrfHeaders() {
        const response = await fetch("/api/csrf", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                "Unable to obtain CSRF token. HTTP " + response.status
            );
        }

        const cookie = document.cookie
            .split("; ")
            .find(function (item) {
                return item.startsWith("XSRF-TOKEN=");
            });

        if (!cookie) {
            throw new Error(
                "XSRF-TOKEN cookie is missing. Check SecurityConfig.java " +
                "and the /api/csrf endpoint."
            );
        }

        const token = decodeURIComponent(
            cookie.substring("XSRF-TOKEN=".length)
        );

        if (!token) {
            throw new Error(
                "CSRF token is empty. Please refresh the page."
            );
        }

        return {
            "X-XSRF-TOKEN": token
        };
    }

    // =========================
    // API FETCH WRAPPER
    // =========================
    async function apiFetch(url, options = {}) {
        const method = String(options.method || "GET").toUpperCase();

        const headers = {
            ...(options.headers || {})
        };

        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            const csrfHeaders = await getCsrfHeaders();
            Object.assign(headers, csrfHeaders);
        }

        return fetch(url, {
            ...options,
            method: method,
            credentials: "same-origin",
            headers: headers
        });
    }

    // =========================
    // INITIAL LOAD
    // =========================
    loadProducts();

    // Refresh stock data periodically so orders placed elsewhere
    // can update the alerts while this page remains open.
    window.setInterval(function () {
        if (!document.hidden) {
            loadProducts();
        }
    }, PRODUCT_REFRESH_INTERVAL_MS);

    // =========================
    // OPEN ADD MODAL
    // =========================
    function openAddModal() {
        editingProductId = null;

        if (form) {
            form.reset();
        }

        const title = document.getElementById("modalTitle");
        const subtitle = document.getElementById("modalSubtitle");
        const saveButton = document.getElementById("saveProductButton");
        const activeInput = document.getElementById("productActive");

        if (title) {
            title.textContent = "Add New Product";
        }

        if (subtitle) {
            subtitle.textContent = "Enter product information";
        }

        if (saveButton) {
            saveButton.textContent = "Save Product";
            saveButton.disabled = false;
        }

        if (activeInput) {
            activeInput.value = "true";
        }

        if (modal) {
            modal.classList.add("show");
        }
    }

    if (addButton) {
        addButton.addEventListener("click", openAddModal);
    }

    if (emptyAddButton) {
        emptyAddButton.addEventListener("click", openAddModal);
    }

    // =========================
    // CLOSE MODAL
    // =========================
    function closeModal() {
        if (modal) {
            modal.classList.remove("show");
        }

        editingProductId = null;

        if (form) {
            form.reset();
        }
    }

    if (closeButton) {
        closeButton.addEventListener("click", closeModal);
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", closeModal);
    }

    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // =========================
    // LOAD PRODUCTS
    // =========================
    async function loadProducts() {
        try {
            const response = await apiFetch("/api/products", {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                const errorText = await response.text();

                throw new Error(
                    "Unable to load products. HTTP " +
                    response.status +
                    (errorText ? ": " + errorText : "")
                );
            }

            const data = await response.json();

            products = Array.isArray(data) ? data : [];

            updateStatistics();
            populateCategories();
            renderLowStockAlerts();
            displayProducts();

        } catch (error) {
            console.error("Product loading error:", error);

            if (productTable) {
                productTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty">
                            Unable to load products. Please refresh the page.
                        </td>
                    </tr>
                `;
            }

            console.error(
                "Check that the backend is running and /api/products is accessible."
            );
        }
    }

    // =========================
    // POPULATE CATEGORY FILTER
    // =========================
    function populateCategories() {
        if (!categoryFilter) {
            return;
        }

        const selectedCategory = categoryFilter.value;

        const categories = [
            ...new Set(
                products
                    .map(product => product.category)
                    .filter(category =>
                        typeof category === "string" &&
                        category.trim() !== ""
                    )
            )
        ].sort((a, b) => a.localeCompare(b));

        categoryFilter.innerHTML =
            '<option value="">All Categories</option>';

        categories.forEach(function (category) {
            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            categoryFilter.appendChild(option);
        });

        if (categories.includes(selectedCategory)) {
            categoryFilter.value = selectedCategory;
        }
    }

    // =========================
    // DISPLAY PRODUCTS
    // =========================
    function displayProducts() {
        if (!productTable) {
            console.error("productTable element not found.");
            return;
        }

        const searchText = searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

        const selectedCategory = categoryFilter
            ? categoryFilter.value
            : "";

        const selectedStatus = statusFilter
            ? statusFilter.value
            : "";

        const filteredProducts = products.filter(function (product) {
            const name = String(product.name || "").toLowerCase();
            const category = String(product.category || "").toLowerCase();

            const matchesSearch =
                name.includes(searchText) ||
                category.includes(searchText);

            const matchesCategory =
                selectedCategory === "" ||
                product.category === selectedCategory;

            const matchesStatus =
                selectedStatus === "" ||
                String(product.active) === selectedStatus;

            return matchesSearch && matchesCategory && matchesStatus;
        });

        productTable.innerHTML = "";

        // =========================
        // NO PRODUCTS FOUND
        // =========================
        if (filteredProducts.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "empty";

            const icon = document.createElement("div");
            icon.className = "empty-icon";
            icon.textContent = "🐟";

            const title = document.createElement("strong");
            title.textContent = products.length === 0
                ? "No products found"
                : "No matching products";

            const message = document.createElement("p");
            message.textContent = products.length === 0
                ? "Add a product to get started."
                : "Try changing your search or filters.";

            cell.appendChild(icon);
            cell.appendChild(title);
            cell.appendChild(message);

            if (products.length === 0) {
                const addEmptyProductButton =
                    document.createElement("button");

                addEmptyProductButton.type = "button";
                addEmptyProductButton.className =
                    "primary-button empty-button";
                addEmptyProductButton.textContent = "+ Add Product";

                addEmptyProductButton.addEventListener(
                    "click",
                    openAddModal
                );

                cell.appendChild(addEmptyProductButton);
            }

            row.appendChild(cell);
            productTable.appendChild(row);

            return;
        }

        // =========================
        // PRODUCT ROWS
        // =========================
        filteredProducts.forEach(function (product) {
            const row = document.createElement("tr");

            // Product name
            const nameCell = document.createElement("td");
            const nameStrong = document.createElement("strong");

            nameStrong.textContent = product.name || "-";
            nameCell.appendChild(nameStrong);

            // Category
            const categoryCell = document.createElement("td");
            categoryCell.textContent = product.category || "-";

            // Price
            const priceCell = document.createElement("td");
            let priceText = "-";

            if (
                product.price !== null &&
                product.price !== undefined &&
                product.price !== ""
            ) {
                const price = Number(product.price);

                if (Number.isFinite(price)) {
                    priceText = "₹" + price.toFixed(2);

                    if (product.unit) {
                        priceText += " / " + product.unit;
                    }
                }
            }

            priceCell.textContent = priceText;

            // Stock
            const stockCell = document.createElement("td");
            const quantity = getStockQuantity(product);
            let stockText = "-";

            if (quantity !== null) {
                stockText = quantity +
                    (product.unit ? " " + product.unit : "");
            }

            stockCell.textContent = stockText;

            // Visually flag low stock in the table as well.
            if (
                isKilogramUnit(product.unit) &&
                quantity !== null &&
                quantity >= 0 &&
                quantity <= LOW_STOCK_THRESHOLD_KG
            ) {
                stockCell.style.fontWeight = "700";
                stockCell.style.color =
                    quantity === 0 ? "#b91c1c" : "#c2410c";

                const stockWarning = document.createElement("div");

                stockWarning.textContent =
                    quantity === 0 ? "Out of stock" : "Low stock";

                stockWarning.style.fontSize = "12px";
                stockWarning.style.marginTop = "4px";
                stockWarning.style.fontWeight = "600";

                stockCell.appendChild(stockWarning);
            }

            // Status
            const statusCell = document.createElement("td");
            const statusSpan = document.createElement("span");

            if (product.active === true) {
                statusSpan.className = "status active";
                statusSpan.textContent = "Active";
            } else {
                statusSpan.className = "status inactive";
                statusSpan.textContent = "Inactive";
            }

            statusCell.appendChild(statusSpan);

            // Actions
            const actionCell = document.createElement("td");
            actionCell.className = "product-actions";

            const editButton = document.createElement("button");

            editButton.type = "button";
            editButton.className = "table-action edit-button";
            editButton.textContent = "Edit";
            editButton.title = "Edit product";

            editButton.addEventListener("click", function () {
                editProduct(product);
            });

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "table-action delete-button";
            deleteButton.textContent = "Delete";
            deleteButton.title = "Delete product";

            deleteButton.addEventListener("click", function () {
                deleteProduct(product.id);
            });

            actionCell.appendChild(editButton);
            actionCell.appendChild(deleteButton);

            row.appendChild(nameCell);
            row.appendChild(categoryCell);
            row.appendChild(priceCell);
            row.appendChild(stockCell);
            row.appendChild(statusCell);
            row.appendChild(actionCell);

            productTable.appendChild(row);
        });
    }

    // =========================
    // SEARCH AND FILTERS
    // =========================
    if (searchInput) {
        searchInput.addEventListener("input", displayProducts);
    }

    if (categoryFilter) {
        categoryFilter.addEventListener("change", displayProducts);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", displayProducts);
    }

    // =========================
    // SAVE / UPDATE PRODUCT
    // =========================
    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const nameInput =
                document.getElementById("productName");
            const categoryInput =
                document.getElementById("productCategory");
            const priceInput =
                document.getElementById("productPrice");
            const unitInput =
                document.getElementById("productUnit");
            const stockInput =
                document.getElementById("stockQuantity");
            const activeInput =
                document.getElementById("productActive");
            const saveButton =
                document.getElementById("saveProductButton");

            const name = nameInput
                ? nameInput.value.trim()
                : "";

            const category = categoryInput
                ? categoryInput.value.trim()
                : "";

            const priceValue = priceInput
                ? priceInput.value
                : "";

            const price = Number(priceValue);

            const unit = unitInput
                ? unitInput.value
                : "";

            const stockValue = stockInput
                ? stockInput.value
                : "";

            const stockQuantity = stockValue === ""
                ? null
                : Number(stockValue);

            const active = activeInput
                ? activeInput.value === "true"
                : true;

            // Validation
            if (!name) {
                alert("Please enter product name.");
                return;
            }

            if (
                priceValue.trim() === "" ||
                !Number.isFinite(price) ||
                price < 0
            ) {
                alert("Please enter a valid price.");
                return;
            }

            if (!unit) {
                alert("Please select a unit.");
                return;
            }

            if (
                stockQuantity !== null &&
                (
                    !Number.isFinite(stockQuantity) ||
                    stockQuantity < 0
                )
            ) {
                alert("Please enter a valid stock quantity.");
                return;
            }

            const product = {
                name: name,
                category: category,
                price: price,
                unit: unit,
                stockQuantity: stockQuantity,
                active: active
            };

            const isCreating = editingProductId === null;

            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = isCreating
                    ? "Saving..."
                    : "Updating...";
            }

            try {
                const url = isCreating
                    ? "/api/products"
                    : "/api/products/" +
                      encodeURIComponent(editingProductId);

                const response = await apiFetch(url, {
                    method: isCreating ? "POST" : "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(product)
                });

                if (!response.ok) {
                    const errorText = await response.text();

                    console.error(
                        "Product save error:",
                        response.status,
                        errorText
                    );

                    if (response.status === 403) {
                        throw new Error(
                            "Access denied (403). The server rejected " +
                            "the request. Check the XSRF-TOKEN cookie, " +
                            "X-XSRF-TOKEN request header, and Spring " +
                            "Security configuration. Server response: " +
                            (errorText || "No response body")
                        );
                    }

                    throw new Error(
                        "Unable to save product. HTTP " +
                        response.status +
                        (errorText ? ": " + errorText : "")
                    );
                }

                await loadProducts();
                closeModal();

                alert(
                    isCreating
                        ? "Product added successfully!"
                        : "Product updated successfully!"
                );

            } catch (error) {
                console.error("Save product error:", error);

                alert(
                    error.message || "Unable to save product."
                );

            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent =
                        editingProductId === null
                            ? "Save Product"
                            : "Update Product";
                }
            }
        });
    }

    // =========================
    // EDIT PRODUCT
    // =========================
    function editProduct(product) {
        editingProductId = product.id;

        const title = document.getElementById("modalTitle");
        const subtitle = document.getElementById("modalSubtitle");
        const saveButton = document.getElementById("saveProductButton");

        if (title) {
            title.textContent = "Edit Product";
        }

        if (subtitle) {
            subtitle.textContent = "Update product information";
        }

        if (saveButton) {
            saveButton.textContent = "Update Product";
            saveButton.disabled = false;
        }

        const nameInput = document.getElementById("productName");
        const categoryInput = document.getElementById("productCategory");
        const priceInput = document.getElementById("productPrice");
        const unitInput = document.getElementById("productUnit");
        const stockInput = document.getElementById("stockQuantity");
        const activeInput = document.getElementById("productActive");

        if (nameInput) {
            nameInput.value = product.name || "";
        }

        if (categoryInput) {
            categoryInput.value = product.category || "";
        }

        if (priceInput) {
            priceInput.value = product.price ?? "";
        }

        if (unitInput) {
            unitInput.value = product.unit || "";
        }

        if (stockInput) {
            stockInput.value = product.stockQuantity ?? "";
        }

        if (activeInput) {
            activeInput.value = String(product.active);
        }

        if (modal) {
            modal.classList.add("show");
        }
    }

    // =========================
    // DELETE PRODUCT
    // =========================
    async function deleteProduct(id) {
        const product = products.find(
            item => String(item.id) === String(id)
        );

        if (!product) {
            alert("Product not found.");
            return;
        }

        const confirmed = confirm(
            'Are you sure you want to delete "' +
            product.name +
            '"?'
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await apiFetch(
                "/api/products/" + encodeURIComponent(id),
                {
                    method: "DELETE",
                    headers: {
                        "Accept": "application/json"
                    }
                }
            );

            if (!response.ok) {
                const errorText = await response.text();

                console.error(
                    "Delete product error:",
                    response.status,
                    errorText
                );

                if (response.status === 403) {
                    throw new Error(
                        "Access denied (403). Check the CSRF cookie, " +
                        "request header, and Spring Security configuration. " +
                        (errorText || "")
                    );
                }

                throw new Error(
                    "Unable to delete product. HTTP " +
                    response.status +
                    (errorText ? ": " + errorText : "")
                );
            }

            await loadProducts();

            alert("Product deleted successfully!");

        } catch (error) {
            console.error("Delete product error:", error);

            alert(
                error.message || "Unable to delete product."
            );
        }
    }

    // =========================
    // STATISTICS
    // =========================
    function updateStatistics() {
        const total = document.getElementById("totalProducts");
        const active = document.getElementById("activeProducts");
        const categoryCount = document.getElementById("categoryCount");

        if (total) {
            total.textContent = products.length;
        }

        if (active) {
            active.textContent = products.filter(
                product => product.active === true
            ).length;
        }

        const categories = new Set();

        products.forEach(function (product) {
            if (
                typeof product.category === "string" &&
                product.category.trim() !== ""
            ) {
                categories.add(product.category);
            }
        });

        if (categoryCount) {
            categoryCount.textContent = categories.size;
        }
    }

});
