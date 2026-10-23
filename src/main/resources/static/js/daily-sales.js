document.addEventListener("DOMContentLoaded", function () {
    const salesDate = document.getElementById("salesDate");
    const salesSearch = document.getElementById("salesSearch");
    const salesTable = document.getElementById("dailySalesTable");
    const salesMessage = document.getElementById("salesMessage");
    const salesPageSize = document.getElementById("salesPageSize");
    const salesPrevPage = document.getElementById("salesPrevPage");
    const salesNextPage = document.getElementById("salesNextPage");
    const salesPageInfo = document.getElementById("salesPageInfo");
    const salesPaginationInfo = document.getElementById("salesPaginationInfo");
    const exportSalesButton = document.getElementById("exportSalesButton");

    let allOrders = [];
    let filteredOrders = [];
    let currentPage = 1;
    let loadingFailed = false;

    function localDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function money(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    function orderDateString(order) {
        const rawDate = order?.orderDate ?? order?.createdAt ?? order?.date ?? "";
        if (!rawDate) return "";
        // Backend LocalDate/ISO values are returned as YYYY-MM-DD or ISO timestamps.
        return String(rawDate).split("T")[0].slice(0, 10);
    }

    function customerName(order) {
        return order?.customer?.name
            ?? order?.customerName
            ?? order?.customer?.fullName
            ?? "Unknown customer";
    }

    function orderItemsText(order) {
        const items = Array.isArray(order?.items) ? order.items : [];
        if (!items.length) return "—";
        return items.map(item => {
            const name = item?.product?.name ?? item?.productName ?? item?.name ?? "Product";
            const quantity = item?.quantity ?? "";
            const unit = item?.product?.unit ?? item?.unit ?? "";
            return `${name} × ${quantity}${unit ? " " + unit : ""}`;
        }).join(", ");
    }

    function isCompleted(order) {
        return String(order?.status ?? "").trim().toUpperCase() === "COMPLETED";
    }

    function showMessage(message, isError = false) {
        salesMessage.hidden = !message;
        salesMessage.textContent = message || "";
        salesMessage.classList.toggle("error", Boolean(isError));
    }

    async function loadOrders() {
        showMessage("");
        salesTable.innerHTML = '<tr><td colspan="6" class="empty">Loading completed orders...</td></tr>';
        loadingFailed = false;

        try {
            const response = await fetch("/api/orders", {
                method: "GET",
                headers: { "Accept": "application/json" },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Unable to load orders (HTTP ${response.status}).`);
            }

            const data = await response.json();
            if (!Array.isArray(data)) {
                throw new Error("The orders API did not return a list.");
            }

            allOrders = data;
            applyFilters();
        } catch (error) {
            console.error("Daily sales loading error:", error);
            loadingFailed = true;
            allOrders = [];
            filteredOrders = [];
            updateSummary([]);
            salesTable.innerHTML = '<tr><td colspan="6" class="empty">Unable to load orders. Check that the Koli Fish backend is running, then refresh this page.</td></tr>';
            updatePagination(0);
            showMessage(error.message || "Unable to load daily sales.", true);
        }
    }

    function applyFilters() {
        const selectedDate = salesDate.value;
        const search = (salesSearch.value || "").trim().toLowerCase();

        filteredOrders = allOrders
            .filter(order => isCompleted(order))
            .filter(order => orderDateString(order) === selectedDate)
            .filter(order => {
                if (!search) return true;
                const searchable = [
                    order?.id,
                    customerName(order),
                    orderItemsText(order),
                    order?.totalAmount,
                    order?.status
                ].join(" ").toLowerCase();
                return searchable.includes(search);
            })
            .sort((a, b) => {
                const dateCompare = orderDateString(b).localeCompare(orderDateString(a));
                if (dateCompare !== 0) return dateCompare;
                return Number(b?.id || 0) - Number(a?.id || 0);
            });

        currentPage = 1;
        updateSummary(filteredOrders);
        renderTable();
    }

    function updateSummary(orders) {
        const total = orders.reduce((sum, order) => sum + (Number(order?.totalAmount) || 0), 0);
        const count = orders.length;
        document.getElementById("completedSalesTotal").textContent = money(total);
        document.getElementById("completedSalesOrders").textContent = String(count);
        document.getElementById("averageOrderValue").textContent = money(count ? total / count : 0);
        document.getElementById("salesTableTitle").textContent = `Completed Orders — ${salesDate.value || ""}`;
        document.getElementById("salesTableSubtitle").textContent =
            `${count} completed order${count === 1 ? "" : "s"} included in sales for the selected date`;
    }

    function renderTable() {
        if (loadingFailed) return;

        const pageSize = Number(salesPageSize.value) || 30;
        const total = filteredOrders.length;
        const pageCount = Math.max(1, Math.ceil(total / pageSize));
        currentPage = Math.min(currentPage, pageCount);
        const startIndex = (currentPage - 1) * pageSize;
        const pageOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

        if (!pageOrders.length) {
            salesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="empty">
                        <div class="empty-icon">₹</div>
                        <strong>No completed sales for this date</strong>
                        <p>Choose another date or clear the search field.</p>
                    </td>
                </tr>`;
        } else {
            salesTable.innerHTML = pageOrders.map(order => {
                const id = escapeHtml(order?.id ?? "—");
                const customer = escapeHtml(customerName(order));
                const items = escapeHtml(orderItemsText(order));
                const date = escapeHtml(orderDateString(order) || "—");
                const amount = money(order?.totalAmount);
                return `
                    <tr>
                        <td>#${id}</td>
                        <td>${customer}</td>
                        <td class="sales-products-cell">${items}</td>
                        <td>${date}</td>
                        <td>${escapeHtml(amount)}</td>
                        <td><span class="status-badge completed">COMPLETED</span></td>
                    </tr>`;
            }).join("");
        }

        updatePagination(total, pageSize, pageCount, startIndex, pageOrders.length);
    }

    function updatePagination(total, pageSize = Number(salesPageSize.value) || 30,
                              pageCount = Math.max(1, Math.ceil(total / (Number(salesPageSize.value) || 30))),
                              startIndex = 0, shown = 0) {
        salesPaginationInfo.textContent = total
            ? `Showing ${startIndex + 1}–${startIndex + shown} of ${total} orders`
            : "Showing 0 orders";
        salesPageInfo.textContent = `Page ${currentPage} of ${pageCount}`;
        salesPrevPage.disabled = currentPage <= 1 || total === 0;
        salesNextPage.disabled = currentPage >= pageCount || total === 0;
    }

    function exportCsv() {
        // Export the currently filtered date/search results, not just the visible page.
        const rows = [
            ["Order ID", "Customer", "Products", "Order Date", "Amount (INR)", "Status"],
            ...filteredOrders.map(order => [
                order?.id ?? "",
                customerName(order),
                orderItemsText(order),
                orderDateString(order),
                Number(order?.totalAmount) || 0,
                "COMPLETED"
            ])
        ];

        const csv = rows.map(row => row.map(value => {
            const text = String(value ?? "");
            return `"${text.replace(/"/g, '""')}"`;
        }).join(",")).join("\r\n");

        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `koli-fish-daily-sales-${salesDate.value || localDateString()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    salesDate.value = localDateString();

    salesDate.addEventListener("change", applyFilters);
    salesSearch.addEventListener("input", applyFilters);

    salesPageSize.addEventListener("change", () => {
        currentPage = 1;
        renderTable();
    });

    salesPrevPage.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    salesNextPage.addEventListener("click", () => {
        const pageSize = Number(salesPageSize.value) || 30;
        const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
        if (currentPage < pageCount) {
            currentPage++;
            renderTable();
        }
    });

    exportSalesButton.addEventListener("click", exportCsv);

    loadOrders();
});
