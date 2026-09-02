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

    const orderPrice =
        document.getElementById("orderPrice");

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
            // ORDER ITEM
            // ===============================

            const item =
                order.items &&
                order.items.length > 0
                    ? order.items[0]
                    : null;


            if (item) {

                // Product
                if (
                    orderProduct &&
                    item.product
                ) {

                    orderProduct.value =
                        item.product.id;
                }


                // Quantity
                if (orderQuantity) {

                    orderQuantity.value =
                        item.quantity || 0;
                }


                // Price
                if (orderPrice) {

                    orderPrice.value =
                        item.unitPrice || 0;
                }
            }


            // Total
            if (orderTotal) {

                orderTotal.value =
                    Number(
                        order.totalAmount || 0
                    ).toFixed(2);
            }


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
    }


    // ===============================
    // RESET FORM
    // ===============================

    function resetOrderForm() {

        if (!orderForm) return;

        orderForm.reset();


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
                "0";
        }


        if (orderPrice) {

            orderPrice.value =
                "";
        }
    }


    // ===============================
    // LOAD ORDERS
    // ===============================

    async function loadOrders() {

        try {

            // IMPORTANT:
            // New backend endpoint is /api/orders

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

                    option.dataset.price =
                        product.price || 0;

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
    // PRODUCT SELECT
    // ===============================

    if (orderProduct) {

        orderProduct.addEventListener(
            "change",
            function () {

                const selectedOption =
                    this.options[
                        this.selectedIndex
                    ];

                if (!selectedOption) return;


                const price =
                    selectedOption.dataset.price;


                if (orderPrice) {

                    orderPrice.value =
                        price || "";
                }


                calculateTotal();
            }
        );
    }


    // ===============================
    // CALCULATE TOTAL
    // ===============================

    function calculateTotal() {

        const quantity =
            parseFloat(
                orderQuantity?.value || 0
            );

        const price =
            parseFloat(
                orderPrice?.value || 0
            );

        const total =
            quantity * price;


        if (orderTotal) {

            orderTotal.value =
                total.toFixed(2);
        }
    }


    if (orderQuantity) {

        orderQuantity.addEventListener(
            "input",
            calculateTotal
        );
    }


    if (orderPrice) {

        orderPrice.addEventListener(
            "input",
            calculateTotal
        );
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


                    // New backend structure:
                    // order.items[0].product
                    const item =
                        order.items &&
                        order.items.length > 0
                            ? order.items[0]
                            : null;


                    const productName =
                        order.productName ||
                        item?.product?.name ||
                        "-";


                    const date =
                        order.orderDate
                            ? order.orderDate
                                .split("T")[0]
                            : "-";


                    const quantity =
                        item?.quantity || 0;


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
                                ${productName}
                                × ${quantity}
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


                const productId =
                    orderProduct.value;


                const quantity =
                    parseFloat(
                        orderQuantity.value
                    );


                const price =
                    parseFloat(
                        orderPrice.value
                    );


                const totalAmount =
                    parseFloat(
                        orderTotal.value
                    );


                // ===============================
                // VALIDATION
                // ===============================

                if (!customerId) {

                    alert(
                        "Please select a customer."
                    );

                    return;
                }


                if (!productId) {

                    alert(
                        "Please select a product."
                    );

                    return;
                }


                if (!quantity ||
                    quantity <= 0) {

                    alert(
                        "Please enter a valid quantity."
                    );

                    return;
                }


                if (isNaN(price) ||
                    price < 0) {

                    alert(
                        "Please enter a valid price."
                    );

                    return;
                }


                // ===============================
                // ORDER DATA
                // ===============================

                const orderData = {

                    customerId:
                        Number(customerId),

                    productId:
                        Number(productId),

                    orderDate:
                        orderDate.value,

                    quantity:
                        quantity,

                    price:
                        price,

                    totalAmount:
                        totalAmount,

                    status:
                        orderStatus.value,

                    notes:
                        orderNotes.value.trim()
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

