document.addEventListener("DOMContentLoaded", function () {

    // ===============================
    // ELEMENTS
    // ===============================

    const orderTable =
        document.getElementById("orderTable");

    const searchInput =
        document.getElementById("searchInput");

    const addOrderButton =
        document.getElementById("addOrderButton");

    const emptyOrderButton =
        document.getElementById("emptyOrderButton");

    const orderModal =
        document.getElementById("orderModal");

    const closeOrderModal =
        document.getElementById("closeOrderModal");

    const cancelOrderButton =
        document.getElementById("cancelOrderButton");

    const orderForm =
        document.getElementById("orderForm");

    const orderCustomer =
        document.getElementById("orderCustomer");

    const orderDate =
        document.getElementById("orderDate");

    const orderStatus =
        document.getElementById("orderStatus");

    const orderProduct =
        document.getElementById("orderProduct");

    const orderQuantity =
        document.getElementById("orderQuantity");

    const addOrderItemButton =
        document.getElementById("addOrderItemButton");

    const orderItemsList =
        document.getElementById("orderItemsList");

    const orderTotal =
        document.getElementById("orderTotal");

    const orderNotes =
        document.getElementById("orderNotes");

    const statusFilter =
        document.getElementById("statusFilter");


    // ===============================
    // STATS
    // ===============================

    const totalOrders =
        document.getElementById("totalOrders");

    const pendingOrders =
        document.getElementById("pendingOrders");

    const completedOrders =
        document.getElementById("completedOrders");

    const totalSales =
        document.getElementById("totalSales");


    // ===============================
    // DATA
    // ===============================

    let orders = [];
    let customers = [];
    let products = [];

    // Multiple products in ONE order
    let orderItems = [];

    // null = creating new order
    // number = editing existing order
    let editingOrderId = null;


    // ===============================
    // MODAL SUBMIT BUTTON
    // ===============================

    function getSubmitButton() {

        if (!orderForm) return null;

        return orderForm.querySelector(
            'button[type="submit"]'
        );
    }


    // ===============================
    // OPEN NEW ORDER MODAL
    // ===============================

    async function openOrderModal() {

        if (!orderModal) return;

        editingOrderId = null;

        orderModal.classList.add("show");

        resetOrderForm();

        const submitButton =
            getSubmitButton();

        if (submitButton) {
            submitButton.textContent = "Create Order";
        }

        await Promise.all([
            loadCustomers(),
            loadProducts()
        ]);
    }


    // ===============================
    // OPEN EDIT MODAL
    // ===============================

    async function openEditModal(id) {

        try {

            const response =
                await fetch(`/api/orders/${id}`);

            if (!response.ok) {

                throw new Error(
                    "Unable to load order"
                );
            }

            const order =
                await response.json();


            editingOrderId = id;

            if (orderModal) {
                orderModal.classList.add("show");
            }


            // Load dropdown data first
            await Promise.all([
                loadCustomers(),
                loadProducts()
            ]);


            // ===============================
            // CUSTOMER
            // ===============================

            if (
                orderCustomer &&
                order.customer
            ) {

                orderCustomer.value =
                    order.customer.id;
            }


            // ===============================
            // DATE
            // ===============================

            if (
                orderDate &&
                order.orderDate
            ) {

                orderDate.value =
                    order.orderDate.split("T")[0];
            }


            // ===============================
            // STATUS
            // ===============================

            if (orderStatus) {

                orderStatus.value =
                    order.status || "PENDING";
            }


            // ===============================
            // LOAD ALL ORDER ITEMS
            // ===============================

            orderItems = [];

            if (
                order.items &&
                order.items.length > 0
            ) {

                order.items.forEach(item => {

                    if (!item.product) return;

                    const product =
                        products.find(
                            p =>
                                Number(p.id) ===
                                Number(item.product.id)
                        );

                    const unitPrice =
                        Number(
                            item.unitPrice ??
                            product?.price ??
                            0
                        );

                    const quantity =
                        Number(
                            item.quantity || 0
                        );

                    orderItems.push({
                        productId:
                            Number(item.product.id),

                        productName:
                            item.product.name ||
                            product?.name ||
                            "-",

                        quantity:
                            quantity,

                        unitPrice:
                            unitPrice,

                        subtotal:
                            quantity * unitPrice
                    });
                });
            }

            renderOrderItems();


            // Total
            calculateOrderTotal();


            // Notes
            if (orderNotes) {

                orderNotes.value =
                    order.notes || "";
            }


            // Change button
            const submitButton =
                getSubmitButton();

            if (submitButton) {

                submitButton.textContent =
                    "Update Order";
            }


        } catch (error) {

            console.error(
                "Edit order error:",
                error
            );

            alert(
                "Unable to load order for editing."
            );
        }
    }


    // ===============================
    // CLOSE MODAL
    // ===============================

    function closeModal() {

        if (!orderModal) return;

        orderModal.classList.remove("show");

        editingOrderId = null;

        orderItems = [];
    }


    // ===============================
    // RESET FORM
    // ===============================

    function resetOrderForm() {

        if (!orderForm) return;

        orderForm.reset();

        // Clear selected products
        orderItems = [];

        if (orderItemsList) {
            orderItemsList.innerHTML = "";
        }


        if (orderDate) {

            const today =
                new Date()
                    .toISOString()
                    .split("T")[0];

            orderDate.value = today;
        }


        if (orderStatus) {

            orderStatus.value =
                "PENDING";
        }


        if (orderTotal) {

            orderTotal.value =
                "0.00";
        }
    }


    // ===============================
    // LOAD ORDERS
    // ===============================

    async function loadOrders() {

        try {

            const response =
                await fetch("/api/orders");

            if (!response.ok) {

                throw new Error(
                    "Unable to load orders"
                );
            }

            orders =
                await response.json();

            displayOrders();

            updateStats();

        } catch (error) {

            console.error(
                "Order loading error:",
                error
            );

            orders = [];

            displayOrders();

            updateStats();
        }
    }


    // ===============================
    // LOAD CUSTOMERS
    // ===============================

    async function loadCustomers() {

        if (!orderCustomer) return;

        try {

            const response =
                await fetch("/api/customers");

            if (!response.ok) {

                throw new Error(
                    "Unable to load customers"
                );
            }

            customers =
                await response.json();


            orderCustomer.innerHTML = `
                <option value="">
                    Select Customer
                </option>
            `;


            customers.forEach(customer => {

                const option =
                    document.createElement("option");

                option.value =
                    customer.id;

                option.textContent =
                    customer.name +
                    (
                        customer.phone
                            ? " - " + customer.phone
                            : ""
                    );

                orderCustomer.appendChild(
                    option
                );
            });


        } catch (error) {

            console.error(
                "Customer loading error:",
                error
            );
        }
    }


    // ===============================
    // LOAD PRODUCTS
    // ===============================

    async function loadProducts() {

        if (!orderProduct) return;

        try {

            const response =
                await fetch("/api/products");

            if (!response.ok) {

                throw new Error(
                    "Unable to load products"
                );
            }

            products =
                await response.json();


            orderProduct.innerHTML = `
                <option value="">
                    Select Product
                </option>
            `;


            products
                .filter(product =>
                    product.active !== false
                )
                .forEach(product => {

                    const option =
                        document.createElement("option");

                    option.value =
                        product.id;

                    option.textContent =
                        product.name +
                        (
                            product.price != null
                                ? " - ₹" +
                                  product.price
                                : ""
                        );

                    orderProduct.appendChild(
                        option
                    );
                });


        } catch (error) {

            console.error(
                "Product loading error:",
                error
            );
        }
    }


    // ===============================
    // ADD ORDER ITEM
    // ===============================

    if (addOrderItemButton) {

        addOrderItemButton.addEventListener(
            "click",
            function () {

                const productId =
                    Number(orderProduct?.value);

                const quantity =
                    parseFloat(
                        orderQuantity?.value || 0
                    );


                if (!productId) {

                    alert(
                        "Please select a product."
                    );

                    return;
                }


                if (!quantity || quantity <= 0) {

                    alert(
                        "Please enter a valid quantity."
                    );

                    return;
                }


                const product =
                    products.find(
                        p =>
                            Number(p.id) ===
                            productId
                    );


                if (!product) {

                    alert(
                        "Product not found."
                    );

                    return;
                }


                const unitPrice =
                    Number(product.price || 0);


                // Check if product already exists
                const existingItem =
                    orderItems.find(
                        item =>
                            Number(item.productId) ===
                            productId
                    );


                if (existingItem) {

                    existingItem.quantity =
                        Number(existingItem.quantity) +
                        quantity;

                    existingItem.subtotal =
                        existingItem.quantity *
                        existingItem.unitPrice;

                } else {

                    orderItems.push({

                        productId:
                            productId,

                        productName:
                            product.name,

                        quantity:
                            quantity,

                        unitPrice:
                            unitPrice,

                        subtotal:
                            quantity * unitPrice
                    });
                }


                renderOrderItems();

                calculateOrderTotal();


                // Reset product entry
                if (orderProduct) {
                    orderProduct.value = "";
                }

                if (orderQuantity) {
                    orderQuantity.value = "";
                }
            }
        );
    }


    // ===============================
    // RENDER ORDER ITEMS
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


        orderItemsList.innerHTML =
            orderItems
                .map((item, index) => {

                    return `
                        <div class="order-item-row">

                            <div class="order-item-name">
                                <strong>
                                    ${item.productName}
                                </strong>
                            </div>

                            <div class="order-item-quantity">
                                ${item.quantity}
                            </div>

                            <div class="order-item-price">
                                ₹${Number(
                                    item.unitPrice
                                ).toFixed(2)}
                            </div>

                            <div class="order-item-subtotal">
                                ₹${Number(
                                    item.subtotal
                                ).toFixed(2)}
                            </div>

                            <button
                                type="button"
                                class="remove-order-item"
                                data-index="${index}"
                                title="Remove">

                                ✕

                            </button>

                        </div>
                    `;
                })
                .join("");


        // Remove buttons
        orderItemsList
            .querySelectorAll(".remove-order-item")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                this.dataset.index
                            );

                        orderItems.splice(
                            index,
                            1
                        );

                        renderOrderItems();

                        calculateOrderTotal();
                    }
                );
            });
    }


    // ===============================
    // CALCULATE ORDER TOTAL
    // ===============================

    function calculateOrderTotal() {

        const total =
            orderItems.reduce(
                (sum, item) =>
                    sum +
                    Number(item.subtotal || 0),
                0
            );


        if (orderTotal) {

            orderTotal.value =
                total.toFixed(2);
        }
    }


    // ===============================
    // DISPLAY ORDERS
    // ===============================

    function displayOrders() {

        if (!orderTable) return;


        const search =
            searchInput
                ? searchInput.value
                    .toLowerCase()
                    .trim()
                : "";


        const selectedStatus =
            statusFilter
                ? statusFilter.value
                : "";


        const filteredOrders =
            orders.filter(order => {

                const customerName =
                    order.customerName ||
                    order.customer?.name ||
                    "";


                const matchesSearch =
                    customerName
                        .toLowerCase()
                        .includes(search);


                const matchesStatus =
                    !selectedStatus ||
                    String(order.status)
                        .toUpperCase() ===
                    String(selectedStatus)
                        .toUpperCase();


                return (
                    matchesSearch &&
                    matchesStatus
                );
            });


        // ===============================
        // EMPTY STATE
        // ===============================

        if (filteredOrders.length === 0) {

            orderTable.innerHTML = `

                <tr>

                    <td
                        colspan="7"
                        class="empty">

                        <div class="empty-icon">
                            🧾
                        </div>

                        <strong>
                            No orders yet
                        </strong>

                        <p>
                            Create your first order
                            to get started.
                        </p>

                        <button
                            class="primary-button empty-button"
                            id="emptyOrderButton">

                            + New Order

                        </button>

                    </td>

                </tr>
            `;


            const newEmptyButton =
                document.getElementById(
                    "emptyOrderButton"
                );


            if (newEmptyButton) {

                newEmptyButton.addEventListener(
                    "click",
                    openOrderModal
                );
            }


            return;
        }


        // ===============================
        // ORDER ROWS
        // ===============================

        orderTable.innerHTML =
            filteredOrders
                .map(order => {

                    const customerName =
                        order.customerName ||
                        order.customer?.name ||
                        "Unknown";


                    // SHOW ALL PRODUCTS
                    const itemsText =
                        order.items &&
                        order.items.length > 0

                            ? order.items
                                .map(item => {

                                    const name =
                                        item.product?.name ||
                                        "-";

                                    const quantity =
                                        item.quantity || 0;

                                    return `
                                        ${name}
                                        × ${quantity}
                                    `;
                                })
                                .join("<br>")

                            : "-";


                    const date =
                        order.orderDate
                            ? order.orderDate
                                .split("T")[0]
                            : "-";


                    const total =
                        order.totalAmount || 0;


                    const status =
                        order.status ||
                        "PENDING";


                    return `

                        <tr>

                            <td>
                                #${order.id}
                            </td>

                            <td>
                                ${customerName}
                            </td>

                            <td>
                                ${date}
                            </td>

                            <td>
                                ${itemsText}
                            </td>

                            <td>
                                ₹${Number(total)
                                    .toFixed(2)}
                            </td>

                            <td>

                                <span
                                    class="status-badge ${status.toLowerCase()}">

                                    ${status}

                                </span>

                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="edit-button"
                                    data-id="${order.id}"
                                    title="Edit Order">

                                    ✏️

                                </button>

                                <button
                                    type="button"
                                    class="delete-button"
                                    data-id="${order.id}"
                                    title="Delete Order">

                                    🗑️

                                </button>

                            </td>

                        </tr>
                    `;

                })
                .join("");


        attachEditEvents();

        attachDeleteEvents();
    }


    // ===============================
    // EDIT EVENTS
    // ===============================

    function attachEditEvents() {

        document
            .querySelectorAll(".edit-button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        const id =
                            this.dataset.id;

                        openEditModal(id);
                    }
                );
            });
    }


    // ===============================
    // DELETE EVENTS
    // ===============================

    function attachDeleteEvents() {

        document
            .querySelectorAll(".delete-button")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    function () {

                        deleteOrder(
                            this.dataset.id
                        );
                    }
                );
            });
    }


    // ===============================
    // DELETE ORDER
    // ===============================

    async function deleteOrder(id) {

        if (
            !confirm(
                "Are you sure you want to delete this order?"
            )
        ) {

            return;
        }


        try {

            const response =
                await fetch(
                    `/api/orders/${id}`,
                    {
                        method: "DELETE"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to delete order"
                );
            }


            orders =
                orders.filter(
                    order =>
                        String(order.id) !==
                        String(id)
                );


            displayOrders();

            updateStats();


        } catch (error) {

            console.error(
                "Delete order error:",
                error
            );


            alert(
                "Unable to delete order."
            );
        }
    }


    // ===============================
    // SAVE / UPDATE ORDER
    // ===============================

    if (orderForm) {

        orderForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const customerId =
                    orderCustomer.value;


                // ===============================
                // VALIDATION
                // ===============================

                if (!customerId) {

                    alert(
                        "Please select a customer."
                    );

                    return;
                }


                if (
                    !orderItems ||
                    orderItems.length === 0
                ) {

                    alert(
                        "Please add at least one fish/product."
                    );

                    return;
                }


                // ===============================
                // ORDER DATA
                // ===============================

                const orderData = {

                    customerId:
                        Number(customerId),

                    orderDate:
                        orderDate.value,

                    status:
                        orderStatus.value,

                    notes:
                        orderNotes.value.trim(),

                    items:
                        orderItems.map(item => ({

                            productId:
                                Number(
                                    item.productId
                                ),

                            quantity:
                                Number(
                                    item.quantity
                                )
                        }))
                };


                try {

                    let response;


                    // ===============================
                    // UPDATE EXISTING ORDER
                    // ===============================

                    if (editingOrderId !== null) {

                        response =
                            await fetch(
                                `/api/orders/${editingOrderId}`,
                                {
                                    method: "PUT",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify(
                                            orderData
                                        )
                                }
                            );


                        if (!response.ok) {

                            const errorText =
                                await response.text();

                            console.error(
                                "Server update error:",
                                errorText
                            );

                            throw new Error(
                                "Unable to update order"
                            );
                        }


                        alert(
                            "Order updated successfully!"
                        );


                    } else {

                        // ===============================
                        // CREATE NEW ORDER
                        // ===============================

                        response =
                            await fetch(
                                "/api/orders",
                                {
                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify(
                                            orderData
                                        )
                                }
                            );


                        if (!response.ok) {

                            const errorText =
                                await response.text();

                            console.error(
                                "Server create error:",
                                errorText
                            );

                            throw new Error(
                                "Unable to save order"
                            );
                        }


                        alert(
                            "Order created successfully!"
                        );
                    }


                    // ===============================
                    // CLOSE + REFRESH
                    // ===============================

                    closeModal();

                    await loadOrders();


                } catch (error) {

                    console.error(
                        "Order save/update error:",
                        error
                    );


                    alert(
                        "Unable to save order. Check the browser console and Spring Boot console."
                    );
                }

            }
        );
    }


    // ===============================
    // SEARCH
    // ===============================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            displayOrders
        );
    }


    // ===============================
    // STATUS FILTER
    // ===============================

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            displayOrders
        );
    }


    // ===============================
    // ADD ORDER BUTTON
    // ===============================

    if (addOrderButton) {

        addOrderButton.addEventListener(
            "click",
            openOrderModal
        );
    }


    // ===============================
    // EMPTY ORDER BUTTON
    // ===============================

    if (emptyOrderButton) {

        emptyOrderButton.addEventListener(
            "click",
            openOrderModal
        );
    }


    // ===============================
    // CLOSE BUTTON
    // ===============================

    if (closeOrderModal) {

        closeOrderModal.addEventListener(
            "click",
            closeModal
        );
    }


    // ===============================
    // CANCEL BUTTON
    // ===============================

    if (cancelOrderButton) {

        cancelOrderButton.addEventListener(
            "click",
            closeModal
        );
    }


    // ===============================
    // CLICK OUTSIDE MODAL
    // ===============================

    if (orderModal) {

        orderModal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    orderModal
                ) {

                    closeModal();
                }
            }
        );
    }


    // ===============================
    // UPDATE STATS
    // ===============================

    function updateStats() {

        const total =
            orders.length;


        const pending =
            orders.filter(
                order =>
                    String(order.status)
                        .toUpperCase() ===
                    "PENDING"
            ).length;


        const completed =
            orders.filter(
                order =>
                    String(order.status)
                        .toUpperCase() ===
                    "COMPLETED"
            ).length;


        const sales =
            orders.reduce(
                (sum, order) =>
                    sum +
                    Number(
                        order.totalAmount || 0
                    ),
                0
            );


        if (totalOrders) {

            totalOrders.textContent =
                total;
        }


        if (pendingOrders) {

            pendingOrders.textContent =
                pending;
        }


        if (completedOrders) {

            completedOrders.textContent =
                completed;
        }


        if (totalSales) {

            totalSales.textContent =
                "₹" +
                sales.toFixed(2);
        }
    }


    // ===============================
    // INITIAL LOAD
    // ===============================

    loadOrders();

});