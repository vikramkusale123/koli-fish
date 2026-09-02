document.addEventListener("DOMContentLoaded", function () {

    /* ===============================
       INITIALIZE DASHBOARD
    =============================== */

    setGreeting();

    loadDashboard();

});


/* =========================================================
   DYNAMIC GREETING
========================================================= */

function setGreeting() {

    const greeting =
        document.getElementById("greeting");

    if (!greeting) {
        return;
    }

    const hour =
        new Date().getHours();

    let message;

    if (hour >= 5 && hour < 12) {

        message = "Good Morning, Admin 👋";

    } else if (hour >= 12 && hour < 17) {

        message = "Good Afternoon, Admin 👋";

    } else if (hour >= 17 && hour < 21) {

        message = "Good Evening, Admin 👋";

    } else {

        message = "Good Night, Admin 👋";

    }

    greeting.textContent = message;

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        const [
            customersResponse,
            productsResponse,
            ordersResponse
        ] = await Promise.all([

            fetch("/api/customers"),
            fetch("/api/products"),
            fetch("/api/orders")

        ]);


        /* ===============================
           CUSTOMERS
        =============================== */

        let customers = [];

        if (customersResponse.ok) {

            customers =
                await customersResponse.json();

            const customerCount =
                document.getElementById("customerCount");

            if (customerCount) {

                customerCount.textContent =
                    customers.length;

            }

        }


        /* ===============================
           PRODUCTS
        =============================== */

        let products = [];

        if (productsResponse.ok) {

            products =
                await productsResponse.json();

            const productCount =
                document.getElementById("productCount");

            if (productCount) {

                productCount.textContent =
                    products.length;

            }

        }


        /* ===============================
           ORDERS
        =============================== */

        let orders = [];

        if (ordersResponse.ok) {

            orders =
                await ordersResponse.json();

            const orderCount =
                document.getElementById("orderCount");

            if (orderCount) {

                orderCount.textContent =
                    orders.length;

            }

        }


        /* ===============================
           TOTAL SALES
        =============================== */

        const totalSales =
            calculateTotalSales(orders);

        const salesCount =
            document.getElementById("salesCount");

        if (salesCount) {

            salesCount.textContent =
                formatCurrency(totalSales);

        }


        /* ===============================
           CHARTS
        =============================== */

        createSalesChart(orders);

        createFishChart(orders);


        /* ===============================
           RECENT ORDERS
        =============================== */

        displayRecentOrders(orders);


    } catch (error) {

        console.error(
            "Unable to load dashboard data:",
            error
        );

    }

}


/* =========================================================
   TOTAL SALES
========================================================= */

function calculateTotalSales(orders) {

    if (!Array.isArray(orders)) {
        return 0;
    }

    return orders.reduce(function (total, order) {

        const amount =
            Number(order.totalAmount) || 0;

        return total + amount;

    }, 0);

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(amount) {

    return "₹" +
        Number(amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

}


/* =========================================================
   SALES CHART
========================================================= */

function createSalesChart(orders) {

    const canvas =
        document.getElementById("salesChart");

    if (!canvas) {
        return;
    }


    /* Destroy existing chart */

    if (window.salesChartInstance) {

        window.salesChartInstance.destroy();

    }


    const monthlySales =
        getMonthlySales(orders);


    window.salesChartInstance =
        new Chart(canvas, {

            type: "line",

            data: {

                labels:
                    monthlySales.labels,

                datasets: [{

                    label: "Sales",

                    data:
                        monthlySales.values,

                    borderWidth: 2,

                    tension: 0.35,

                    fill: true

                }]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                },


                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            callback:
                                function (value) {

                                    if (value >= 1000) {

                                        return "₹" +
                                            (value / 1000) +
                                            "k";

                                    }

                                    return "₹" + value;

                                }

                        }

                    }

                }

            }

        });

}


/* =========================================================
   MONTHLY SALES
========================================================= */

function getMonthlySales(orders) {

    const now =
        new Date();

    const labels = [];

    const values = [];


    for (let i = 5; i >= 0; i--) {

        const date =
            new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );


        const monthName =
            date.toLocaleString("en-IN", {
                month: "short"
            });


        labels.push(monthName);


        let monthTotal = 0;


        if (Array.isArray(orders)) {

            orders.forEach(function (order) {

                if (!order.orderDate) {
                    return;
                }


                const orderDate =
                    new Date(order.orderDate);


                if (
                    orderDate.getFullYear()
                    === date.getFullYear()
                    &&
                    orderDate.getMonth()
                    === date.getMonth()
                ) {

                    monthTotal +=
                        Number(order.totalAmount) || 0;

                }

            });

        }


        values.push(monthTotal);

    }


    return {

        labels: labels,

        values: values

    };

}


/* =========================================================
   FISH SALES CHART
========================================================= */

function createFishChart(orders) {

    const canvas =
        document.getElementById("fishChart");

    if (!canvas) {
        return;
    }


    /* Destroy existing chart */

    if (window.fishChartInstance) {

        window.fishChartInstance.destroy();

    }


    const productSales = {};


    /* ===============================
       READ ALL ORDERS
    =============================== */

    if (Array.isArray(orders)) {

        orders.forEach(function (order) {

            if (!Array.isArray(order.items)) {
                return;
            }


            /* =========================
               READ ALL ITEMS
            ========================= */

            order.items.forEach(function (item) {

                if (!item || !item.product) {
                    return;
                }


                const productName =
                    item.product.name
                        ? String(
                            item.product.name
                        ).trim()
                        : "Unknown Product";


                const quantity =
                    Number(item.quantity) || 0;


                if (quantity <= 0) {
                    return;
                }


                if (
                    !Object.prototype.hasOwnProperty.call(
                        productSales,
                        productName
                    )
                ) {

                    productSales[productName] = 0;

                }


                productSales[productName] +=
                    quantity;

            });

        });

    }


    console.log(
        "Fish Sales:",
        productSales
    );


    /* ===============================
       SORT PRODUCTS
    =============================== */

    const entries =
        Object.entries(productSales)
            .sort(function (a, b) {

                return b[1] - a[1];

            });


    let labels =
        entries.map(function (entry) {

            return entry[0];

        });


    let values =
        entries.map(function (entry) {

            return entry[1];

        });


    /* ===============================
       NO SALES
    =============================== */

    if (entries.length === 0) {

        labels = ["No sales"];

        values = [1];

    }


    /* ===============================
       TOP 4 + OTHER
    =============================== */

    if (entries.length > 5) {

        const topProducts =
            entries.slice(0, 4);


        const otherQuantity =
            entries
                .slice(4)
                .reduce(function (sum, entry) {

                    return sum + entry[1];

                }, 0);


        labels =
            topProducts.map(function (entry) {

                return entry[0];

            });


        values =
            topProducts.map(function (entry) {

                return entry[1];

            });


        labels.push("Other");

        values.push(otherQuantity);

    }


    /* ===============================
       CREATE DOUGHNUT CHART
    =============================== */

    window.fishChartInstance =
        new Chart(canvas, {

            type: "doughnut",

            data: {

                labels: labels,

                datasets: [{

                    data: values,

                    borderWidth: 2

                }]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        position: "bottom",

                        labels: {

                            padding: 15

                        }

                    },


                    tooltip: {

                        callbacks: {

                            label:
                                function (context) {

                                    const value =
                                        context.raw;

                                    return (
                                        context.label +
                                        ": " +
                                        value +
                                        " kg"
                                    );

                                }

                        }

                    }

                }

            }

        });

}


/* =========================================================
   RECENT ORDERS
========================================================= */

function displayRecentOrders(orders) {

    const table =
        document.getElementById("ordersTable");

    if (!table) {
        return;
    }


    table.innerHTML = "";


    if (
        !Array.isArray(orders)
        ||
        orders.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="empty">

                    No orders yet

                </td>

            </tr>

        `;

        return;

    }


    /* ===============================
       NEWEST ORDERS FIRST
    =============================== */

    const recentOrders =
        [...orders]
            .sort(function (a, b) {

                return (
                    new Date(b.orderDate)
                    -
                    new Date(a.orderDate)
                );

            })
            .slice(0, 5);


    recentOrders.forEach(function (order) {

        const row =
            document.createElement("tr");


        /* ===============================
           CUSTOMER
        =============================== */

        const customerName =
            order.customer &&
            order.customer.name
                ? order.customer.name
                : "Unknown";


        /* ===============================
           AREA
        =============================== */

        const areaName =
            order.customer &&
            order.customer.area &&
            order.customer.area.name
                ? order.customer.area.name
                : "-";


        /* ===============================
           PRODUCTS
        =============================== */

        let productName = "-";


        if (
            Array.isArray(order.items)
            &&
            order.items.length > 0
        ) {

            const productNames =
                order.items
                    .filter(function (item) {

                        return (
                            item &&
                            item.product &&
                            item.product.name
                        );

                    })
                    .map(function (item) {

                        return item.product.name;

                    });


            if (productNames.length > 0) {

                productName =
                    productNames.join(", ");

            }

        }


        /* ===============================
           AMOUNT
        =============================== */

        const amount =
            Number(order.totalAmount) || 0;


        /* ===============================
           STATUS
        =============================== */

        const status =
            order.status || "PENDING";


        const statusClass =
            getStatusClass(status);


        /* ===============================
           ORDER NUMBER
        =============================== */

        const orderNumber =
            order.id
                ? "#" + order.id
                : "-";


        /* ===============================
           ROW
        =============================== */

        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(orderNumber)}
                </strong>
            </td>

            <td>
                ${escapeHtml(customerName)}
            </td>

            <td>
                ${escapeHtml(areaName)}
            </td>

            <td>
                ${escapeHtml(productName)}
            </td>

            <td>
                <strong>
                    ${formatCurrency(amount)}
                </strong>
            </td>

            <td>

                <span class="badge ${statusClass}">
                    ${escapeHtml(status)}
                </span>

            </td>

        `;


        table.appendChild(row);

    });

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    const value =
        String(status)
            .toUpperCase();


    if (value === "DELIVERED") {

        return "badge-success";

    }


    if (
        value === "PENDING"
        ||
        value === "PROCESSING"
    ) {

        return "badge-warning";

    }


    if (value === "COMPLETED") {

        return "badge-success";

    }


    if (value === "CANCELLED") {

        return "badge-danger";

    }


    return "badge-warning";

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
