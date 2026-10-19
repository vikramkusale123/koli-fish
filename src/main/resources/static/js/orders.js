
document.addEventListener("DOMContentLoaded", function () {

    // ===============================
    // ELEMENTS
    // ===============================

    const orderTable = document.getElementById("orderTable");
    const searchInput = document.getElementById("searchInput");
    const addOrderButton = document.getElementById("addOrderButton");
    const emptyOrderButton = document.getElementById("emptyOrderButton");

    const orderModal = document.getElementById("orderModal");
    const closeOrderModal = document.getElementById("closeOrderModal");
    const cancelOrderButton = document.getElementById("cancelOrderButton");
    const orderForm = document.getElementById("orderForm");

    const orderCustomer = document.getElementById("orderCustomer");
    const orderDate = document.getElementById("orderDate");
    const orderStatus = document.getElementById("orderStatus");
    const orderProduct = document.getElementById("orderProduct");
    const orderQuantity = document.getElementById("orderQuantity");
    const addOrderItemButton = document.getElementById("addOrderItemButton");
    const orderItemsList = document.getElementById("orderItemsList");
    const orderTotal = document.getElementById("orderTotal");
    const orderNotes = document.getElementById("orderNotes");
    const statusFilter = document.getElementById("statusFilter");

    // ===============================
    // STATISTICS
    // ===============================

    const totalOrders = document.getElementById("totalOrders");
    const pendingOrders = document.getElementById("pendingOrders");
    const completedOrders = document.getElementById("completedOrders");
    const totalSales = document.getElementById("totalSales");

    // ===============================
    // DATA
    // ===============================

    let orders = [];
    let customers = [];
    let products = [];
    let orderItems = [];
    let editingOrderId = null;

    // ===============================
    // PAGINATION SETTINGS
    // Reference: Customer JS
    // ===============================

    let currentPage = 1;
    let pageSize = 30;
    let paginationContainer = null;

    // ===============================
    // INITIAL LOAD
    // ===============================

    loadOrders();

    // ===============================
    // HTML ESCAPING
    // ===============================

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value == null ? "" : String(value);
        return div.innerHTML;
    }

    // ===============================
    // SORT ORDERS: LATEST FIRST
    // ===============================

    function sortOrdersLatestFirst(ordersList) {
        return [...ordersList].sort((a, b) => {
            const dateA = new Date(a.orderDate || a.createdAt || 0).getTime() || 0;
            const dateB = new Date(b.orderDate || b.createdAt || 0).getTime() || 0;

            // Latest date first
            if (dateA !== dateB) {
                return dateB - dateA;
            }

            // If dates match, higher order ID first
            return Number(b.id || 0) - Number(a.id || 0);
        });
    }

    // ===============================
    // PAGINATION CONTAINER
    // ===============================

    function setupPaginationContainer() {
        if (!orderTable || paginationContainer) return;

        const table = orderTable.closest("table");
        if (!table) return;

        paginationContainer = document.createElement("div");
        paginationContainer.id = "orderPagination";

        paginationContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 16px 0;
            padding: 12px 0;
        `;

        const wrapper = table.closest(
            ".table-container, .table-wrapper, .table-responsive"
        );

        (wrapper || table).insertAdjacentElement(
            "afterend",
            paginationContainer
        );
    }

    // ===============================
    // SUBMIT BUTTON
    // ===============================

    function getSubmitButton() {
        if (!orderForm) return null;

        return orderForm.querySelector('button[type="submit"]');
    }

    // ===============================
    // OPEN NEW ORDER MODAL
    // ===============================

    async function openOrderModal() {
        if (!orderModal) return;

        editingOrderId = null;

        orderModal.classList.add("show");
        resetOrderForm();

        const submitButton = getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Create Order";
        }

        await Promise.all([
            loadCustomers(),
            loadProducts()
        ]);
    }

    // ===============================
    // OPEN EDIT ORDER MODAL
    // ===============================

    async function openEditModal(id) {
        try {
            const response = await fetch(`/api/orders/${id}`);

            if (!response.ok) {
                throw new Error("Unable to load order");
            }

            const order = await response.json();

            editingOrderId = id;

            if (orderModal) {
                orderModal.classList.add("show");
            }

            await Promise.all([
                loadCustomers(),
                loadProducts()
            ]);

            // Customer
            if (orderCustomer && order.customer) {
                orderCustomer.value = order.customer.id;
            }

            // Date
            if (orderDate && order.orderDate) {
                orderDate.value = order.orderDate.split("T")[0];
            }

            // Status
            if (orderStatus) {
                orderStatus.value = order.status || "PENDING";
            }

            // Order items
            orderItems = [];

            if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (!item.product) return;

                    const product = products.find(
                        p => Number(p.id) === Number(item.product.id)
                    );

                    const quantity = Number(item.quantity || 0);

                    const unitPrice = Number(
                        item.unitPrice ?? product?.price ?? 0
                    );

                    orderItems.push({
                        productId: Number(item.product.id),
                        productName:
                            item.product.name || product?.name || "-",
                        quantity: quantity,
                        unitPrice: unitPrice,
                        subtotal: quantity * unitPrice
                    });
                });
            }

            renderOrderItems();
            calculateOrderTotal();

            if (orderNotes) {
                orderNotes.value = order.notes || "";
            }

            const submitButton = getSubmitButton();

            if (submitButton) {
                submitButton.textContent = "Update Order";
            }

        } catch (error) {
            console.error("Edit order error:", error);
            alert("Unable to load order for editing.");
        }
    }

    // ===============================
    // CLOSE MODAL
    // ===============================

    function closeModal() {
        if (orderModal) {
            orderModal.classList.remove("show");
        }

        editingOrderId = null;
        orderItems = [];
    }

    // ===============================
    // RESET FORM
    // ===============================

    function resetOrderForm() {
        if (!orderForm) return;

        orderForm.reset();
        orderItems = [];

        if (orderItemsList) {
            orderItemsList.innerHTML = "";
        }

        if (orderDate) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");

            orderDate.value = `${year}-${month}-${day}`;
        }

        if (orderStatus) {
            orderStatus.value = "PENDING";
        }

        if (orderTotal) {
            orderTotal.value = "0.00";
        }
    }

    // ===============================
    // LOAD ORDERS
    // ===============================

    async function loadOrders() {
        try {
            const response = await fetch("/api/orders");

            if (!response.ok) {
                throw new Error("Unable to load orders");
            }

            const data = await response.json();

            orders = sortOrdersLatestFirst(
                Array.isArray(data) ? data : []
            );

            updateStats();
            displayOrders();

        } catch (error) {
            console.error("Order loading error:", error);

            orders = [];

            updateStats();
            displayOrders();
        }
    }

    // ===============================
    // LOAD CUSTOMERS
    // ===============================

    async function loadCustomers() {
        if (!orderCustomer) return;

        try {
            const response = await fetch("/api/customers");

            if (!response.ok) {
                throw new Error("Unable to load customers");
            }

            customers = await response.json();

            orderCustomer.innerHTML = `
                <option value="">Select Customer</option>
            `;

            customers.forEach(customer => {
                const option = document.createElement("option");

                option.value = customer.id;
                option.textContent =
                    customer.name +
                    (customer.phone ? " - " + customer.phone : "");

                orderCustomer.appendChild(option);
            });

        } catch (error) {
            console.error("Customer loading error:", error);
        }
    }

    // ===============================
    // LOAD PRODUCTS
    // ===============================

    async function loadProducts() {
        if (!orderProduct) return;

        try {
            const response = await fetch("/api/products");

            if (!response.ok) {
                throw new Error("Unable to load products");
            }

            products = await response.json();

            orderProduct.innerHTML = `
                <option value="">Select Product</option>
            `;

            products
                .filter(product => product.active !== false)
                .forEach(product => {
                    const option = document.createElement("option");

                    option.value = product.id;
                    option.textContent =
                        product.name +
                        (product.price != null
                            ? " - ₹" + product.price
                            : "");

                    orderProduct.appendChild(option);
                });

        } catch (error) {
            console.error("Product loading error:", error);
        }
    }

    // ===============================
    // ADD ORDER ITEM
    // ===============================

    if (addOrderItemButton) {
        addOrderItemButton.addEventListener("click", function () {
            const productId = Number(orderProduct?.value);
            const quantity = parseFloat(orderQuantity?.value || 0);

            if (!productId) {
                alert("Please select a product.");
                return;
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                alert("Please enter a valid quantity.");
                return;
            }

            const product = products.find(
                p => Number(p.id) === productId
            );

            if (!product) {
                alert("Product not found.");
                return;
            }

            const unitPrice = Number(product.price || 0);

            const existingItem = orderItems.find(
                item => Number(item.productId) === productId
            );

            if (existingItem) {
                existingItem.quantity =
                    Number(existingItem.quantity) + quantity;

                existingItem.subtotal =
                    existingItem.quantity * existingItem.unitPrice;

            } else {
                orderItems.push({
                    productId: productId,
                    productName: product.name,
                    quantity: quantity,
                    unitPrice: unitPrice,
                    subtotal: quantity * unitPrice
                });
            }

            renderOrderItems();
            calculateOrderTotal();

            if (orderProduct) orderProduct.value = "";
            if (orderQuantity) orderQuantity.value = "";
        });
    }

    // ===============================
    // RENDER ORDER ITEMS IN MODAL
    // ===============================

    function renderOrderItems() {
        if (!orderItemsList) return;

        if (orderItems.length === 0) {
            orderItemsList.innerHTML = `
                <div class="order-items-empty">
                    No fish added yet.
                </div>
            `;

            calculateOrderTotal();
            return;
        }

        orderItemsList.innerHTML = orderItems
            .map((item, index) => `
                <div class="order-item-row">

                    <div class="order-item-name">
                        <strong>${escapeHtml(item.productName)}</strong>
                    </div>

                    <div class="order-item-quantity">
                        ${escapeHtml(item.quantity)}
                    </div>

                    <div class="order-item-price">
                        ₹${Number(item.unitPrice).toFixed(2)}
                    </div>

                    <div class="order-item-subtotal">
                        ₹${Number(item.subtotal).toFixed(2)}
                    </div>

                    <button
                        type="button"
                        class="remove-order-item"
                        data-index="${index}"
                        title="Remove">
                        ✕
                    </button>

                </div>
            `)
            .join("");

        orderItemsList
            .querySelectorAll(".remove-order-item")
            .forEach(button => {
                button.addEventListener("click", function () {
                    const index = Number(this.dataset.index);

                    orderItems.splice(index, 1);

                    renderOrderItems();
                    calculateOrderTotal();
                });
            });
    }

    // ===============================
    // CALCULATE ORDER TOTAL
    // ===============================

    function calculateOrderTotal() {
        const total = orderItems.reduce(
            (sum, item) => sum + Number(item.subtotal || 0),
            0
        );

        if (orderTotal) {
            orderTotal.value = total.toFixed(2);
        }
    }

    // ===============================
    // GET FILTERED ORDERS
    // Reference: Customer JS
    // ===============================

    function getFilteredOrders() {
        const search = searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

        const selectedStatus = statusFilter
            ? statusFilter.value
            : "";

        return orders.filter(order => {
            const customerName =
                order.customerName ||
                order.customer?.name ||
                "";

            const matchesSearch = customerName
                .toLowerCase()
                .includes(search);

            const matchesStatus =
                !selectedStatus ||
                String(order.status || "PENDING").toUpperCase() ===
                String(selectedStatus).toUpperCase();

            return matchesSearch && matchesStatus;
        });
    }

    // ===============================
    // DISPLAY ORDERS WITH PAGINATION
    // ===============================

    function displayOrders() {
        if (!orderTable) return;

        setupPaginationContainer();

        const filteredOrders = getFilteredOrders();
        const totalRecords = filteredOrders.length;

        const totalPages = Math.max(
            1,
            Math.ceil(totalRecords / pageSize)
        );

        // Keep page valid after filtering or deletion
        currentPage = Math.min(
            Math.max(currentPage, 1),
            totalPages
        );

        const startIndex = (currentPage - 1) * pageSize;

        const pageOrders = filteredOrders.slice(
            startIndex,
            startIndex + pageSize
        );

        // Empty state
        if (totalRecords === 0) {
            orderTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty">
                        <div class="empty-icon">🧾</div>
                        <strong>No orders found</strong>
                        <p>
                            Try changing your search or status filter,
                            or create a new order.
                        </p>
                        <button
                            type="button"
                            class="primary-button empty-button"
                            id="emptyOrderButton">
                            + New Order
                        </button>
                    </td>
                </tr>
            `;

            const newEmptyButton =
                document.getElementById("emptyOrderButton");

            if (newEmptyButton) {
                newEmptyButton.addEventListener(
                    "click",
                    openOrderModal
                );
            }

            renderPagination(0, 0, totalPages);
            return;
        }

        // Render only the current page
        orderTable.innerHTML = pageOrders.map(order => {
            const customerName =
                order.customerName ||
                order.customer?.name ||
                "Unknown";

            const itemsText =
                Array.isArray(order.items) && order.items.length > 0
                    ? order.items.map(item => {
                        const name = item.product?.name || "-";
                        const quantity = item.quantity || 0;

                        return `${escapeHtml(name)} × ${escapeHtml(quantity)}`;
                    }).join("<br>")
                    : "-";

            const date = order.orderDate
                ? order.orderDate.split("T")[0]
                : "-";

            const total = Number(order.totalAmount || 0);
            const status = String(order.status || "PENDING");
            const statusClass = status
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, "");

            return `
                <tr>
                    <td>#${escapeHtml(order.id)}</td>

                    <td>${escapeHtml(customerName)}</td>

                    <td>${escapeHtml(date)}</td>

                    <td>${itemsText}</td>

                    <td>₹${total.toFixed(2)}</td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(status)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="edit-button"
                            data-id="${escapeHtml(order.id)}"
                            title="Edit Order">
                            ✏️
                        </button>

                        <button
                            type="button"
                            class="delete-button"
                            data-id="${escapeHtml(order.id)}"
                            title="Delete Order">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        attachEditEvents();
        attachDeleteEvents();

        renderPagination(
            totalRecords,
            startIndex,
            totalPages
        );
    }

    // ===============================
    // PAGINATION CONTROLS
    // Reference: Customer JS
    // ===============================

    function renderPagination(
        totalRecords,
        startIndex,
        totalPages
    ) {
        if (!paginationContainer) return;

        const startRecord = totalRecords === 0
            ? 0
            : startIndex + 1;

        const endRecord = Math.min(
            startIndex + pageSize,
            totalRecords
        );

        const pageButtons = [];

        const firstPage = Math.max(1, currentPage - 2);
        const lastPage = Math.min(totalPages, currentPage + 2);

        if (firstPage > 1) {
            pageButtons.push({
                page: 1,
                label: "1"
            });

            if (firstPage > 2) {
                pageButtons.push({ label: "…" });
            }
        }

        for (let page = firstPage; page <= lastPage; page++) {
            pageButtons.push({
                page: page,
                label: String(page)
            });
        }

        if (lastPage < totalPages) {
            if (lastPage < totalPages - 1) {
                pageButtons.push({ label: "…" });
            }

            pageButtons.push({
                page: totalPages,
                label: String(totalPages)
            });
        }

        paginationContainer.innerHTML = `
            <div style="
                display:flex;
                align-items:center;
                flex-wrap:wrap;
                gap:10px;
            ">
                <span style="font-size:13px;color:#64748b;">
                    Showing ${startRecord}–${endRecord}
                    of ${totalRecords} orders
                </span>

                <label style="
                    display:flex;
                    align-items:center;
                    gap:6px;
                    font-size:13px;
                    color:#334155;
                ">
                    Rows per page

                    <select id="orderPageSize" style="
                        padding:6px 8px;
                        border:1px solid #cbd5e1;
                        border-radius:6px;
                        background:#fff;
                        color:#334155;
                    ">
                        <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
                        <option value="20" ${pageSize === 20 ? "selected" : ""}>20</option>
                        <option value="30" ${pageSize === 30 ? "selected" : ""}>30</option>
                        <option value="40" ${pageSize === 40 ? "selected" : ""}>40</option>
                    </select>
                </label>
            </div>

            <div style="
                display:flex;
                align-items:center;
                flex-wrap:wrap;
                gap:6px;
            " aria-label="Order table pagination">

                <button
                    type="button"
                    data-action="first"
                    class="pagination-button"
                    ${currentPage <= 1 ? "disabled" : ""}>
                    First
                </button>

                <button
                    type="button"
                    data-action="previous"
                    class="pagination-button"
                    ${currentPage <= 1 ? "disabled" : ""}>
                    Previous
                </button>

                ${pageButtons.map(item => {
                    if (item.page === undefined) {
                        return `
                            <span style="padding:6px;color:#64748b;">
                                …
                            </span>
                        `;
                    }

                    const active = item.page === currentPage;

                    return `
                        <button
                            type="button"
                            data-page="${item.page}"
                            ${active ? 'aria-current="page"' : ""}
                            style="
                                min-width:34px;
                                padding:7px 10px;
                                border:1px solid ${active ? "#2563eb" : "#cbd5e1"};
                                border-radius:6px;
                                background:${active ? "#2563eb" : "#fff"};
                                color:${active ? "#fff" : "#334155"};
                                cursor:pointer;
                            ">
                            ${item.label}
                        </button>
                    `;
                }).join("")}

                <button
                    type="button"
                    data-action="next"
                    class="pagination-button"
                    ${currentPage >= totalPages ? "disabled" : ""}>
                    Next
                </button>

                <button
                    type="button"
                    data-action="last"
                    class="pagination-button"
                    ${currentPage >= totalPages ? "disabled" : ""}>
                    Last
                </button>
            </div>
        `;

        // Style navigation buttons
        paginationContainer
            .querySelectorAll(".pagination-button")
            .forEach(button => {
                button.style.cssText += `
                    padding:7px 10px;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                    background:#fff;
                    color:#334155;
                    cursor:${button.disabled ? "not-allowed" : "pointer"};
                    opacity:${button.disabled ? "0.45" : "1"};
                `;
            });

        // Rows per page
        const pageSizeSelect =
            paginationContainer.querySelector("#orderPageSize");

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener("change", function () {
                pageSize = Number(this.value) || 30;
                currentPage = 1;
                displayOrders();
            });
        }

        // First, Previous, Next and Last
        paginationContainer
            .querySelectorAll("button[data-action]")
            .forEach(button => {
                button.addEventListener("click", function () {
                    if (this.disabled) return;

                    switch (this.dataset.action) {
                        case "first":
                            currentPage = 1;
                            break;

                        case "previous":
                            currentPage--;
                            break;

                        case "next":
                            currentPage++;
                            break;

                        case "last":
                            currentPage = totalPages;
                            break;
                    }

                    displayOrders();
                });
            });

        // Numbered pages
        paginationContainer
            .querySelectorAll("button[data-page]")
            .forEach(button => {
                button.addEventListener("click", function () {
                    currentPage = Number(this.dataset.page);
                    displayOrders();
                });
            });
    }

    // ===============================
    // EDIT EVENTS
    // ===============================

    function attachEditEvents() {
        document.querySelectorAll(".edit-button").forEach(button => {
            button.addEventListener("click", function () {
                openEditModal(this.dataset.id);
            });
        });
    }

    // ===============================
    // DELETE EVENTS
    // ===============================

    function attachDeleteEvents() {
        document.querySelectorAll(".delete-button").forEach(button => {
            button.addEventListener("click", function () {
                deleteOrder(this.dataset.id);
            });
        });
    }

    // ===============================
    // DELETE ORDER
    // ===============================

    async function deleteOrder(id) {
        if (!confirm("Are you sure you want to delete this order?")) {
            return;
        }

        try {
            const response = await fetch(`/api/orders/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error("Unable to delete order");
            }

            orders = orders.filter(
                order => String(order.id) !== String(id)
            );

            updateStats();
            displayOrders();

        } catch (error) {
            console.error("Delete order error:", error);
            alert("Unable to delete order.");
        }
    }

    // ===============================
    // SAVE / UPDATE ORDER
    // ===============================

    if (orderForm) {
        orderForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const wasCreatingOrder = editingOrderId === null;

            const customerId = orderCustomer
                ? orderCustomer.value
                : "";

            if (!customerId) {
                alert("Please select a customer.");
                return;
            }

            if (!orderItems || orderItems.length === 0) {
                alert("Please add at least one fish/product.");
                return;
            }

            const orderData = {
                customerId: Number(customerId),

                orderDate: orderDate
                    ? orderDate.value
                    : "",

                status: orderStatus
                    ? orderStatus.value
                    : "PENDING",

                notes: orderNotes
                    ? orderNotes.value.trim()
                    : "",

                items: orderItems.map(item => ({
                    productId: Number(item.productId),
                    quantity: Number(item.quantity)
                }))
            };

            try {
                let response;

                if (!wasCreatingOrder) {
                    // Update existing order
                    response = await fetch(
                        `/api/orders/${editingOrderId}`,
                        {
                            method: "PUT",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(orderData)
                        }
                    );

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("Server update error:", errorText);

                        throw new Error("Unable to update order");
                    }

                    alert("Order updated successfully!");

                } else {
                    // Create new order
                    response = await fetch("/api/orders", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(orderData)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("Server create error:", errorText);

                        throw new Error("Unable to save order");
                    }

                    alert("Order created successfully!");
                }

                // Clear filters and show the last page after creation
                if (wasCreatingOrder) {
                    if (searchInput) {
                        searchInput.value = "";
                    }

                    if (statusFilter) {
                        statusFilter.value = "";
                    }

                    currentPage = Math.max(
                        1,
                        Math.ceil((orders.length + 1) / pageSize)
                    );
                }

                closeModal();

                await loadOrders();

            } catch (error) {
                console.error("Order save/update error:", error);

                alert(
                    "Unable to save order. Check the browser console " +
                    "and Spring Boot console."
                );
            }
        });
    }

    // ===============================
    // SEARCH
    // ===============================

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            currentPage = 1;
            displayOrders();
        });
    }

    // ===============================
    // STATUS FILTER
    // ===============================

    if (statusFilter) {
        statusFilter.addEventListener("change", function () {
            currentPage = 1;
            displayOrders();
        });
    }

    // ===============================
    // ADD ORDER BUTTON
    // ===============================

    if (addOrderButton) {
        addOrderButton.addEventListener("click", openOrderModal);
    }

    // ===============================
    // EMPTY STATE ADD BUTTON
    // ===============================

    if (emptyOrderButton) {
        emptyOrderButton.addEventListener("click", openOrderModal);
    }

    // ===============================
    // CLOSE BUTTON
    // ===============================

    if (closeOrderModal) {
        closeOrderModal.addEventListener("click", closeModal);
    }

    // ===============================
    // CANCEL BUTTON
    // ===============================

    if (cancelOrderButton) {
        cancelOrderButton.addEventListener("click", closeModal);
    }

    // ===============================
    // CLICK OUTSIDE MODAL
    // ===============================

    if (orderModal) {
        orderModal.addEventListener("click", function (event) {
            if (event.target === orderModal) {
                closeModal();
            }
        });
    }

    // ===============================
    // UPDATE STATISTICS
    // ===============================

    function updateStats() {
        const total = orders.length;

        const pending = orders.filter(
            order => String(order.status).toUpperCase() === "PENDING"
        ).length;

        const completed = orders.filter(
            order => String(order.status).toUpperCase() === "COMPLETED"
        ).length;

        const sales = orders.reduce(
            (sum, order) => sum + Number(order.totalAmount || 0),
            0
        );

        if (totalOrders) {
            totalOrders.textContent = total;
        }

        if (pendingOrders) {
            pendingOrders.textContent = pending;
        }

        if (completedOrders) {
            completedOrders.textContent = completed;
        }

        if (totalSales) {
            totalSales.textContent = "₹" + sales.toFixed(2);
        }
    }

});
