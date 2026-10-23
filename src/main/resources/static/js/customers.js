
document.addEventListener("DOMContentLoaded", function () {
    // =========================
    // ELEMENTS
    // =========================
    const modal = document.getElementById("customerModal");
    const addButton = document.getElementById("addCustomerButton");
    const closeButton = document.getElementById("closeModal");
    const cancelButton = document.getElementById("cancelButton");
    const form = document.getElementById("customerForm");
    const customerTable = document.getElementById("customerTable");
    const searchInput = document.getElementById("searchInput");
    const areaFilter = document.getElementById("areaFilter");
    const areaSelect = document.getElementById("customerArea");

    let customers = [];
    let areas = [];
    let editingCustomerId = null;

    // =========================
    // PAGINATION SETTINGS
    // =========================
    let currentPage = 1;
    let pageSize = 10;
    let paginationContainer = null;

    // =========================
    // CSRF TOKEN
    // =========================
    async function getCsrfHeaders() {
        const response = await fetch("/api/csrf", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                "Unable to obtain CSRF token. Please refresh the page and log in again."
            );
        }

        // Use the token from the cookie created by CookieCsrfTokenRepository.
        const cookie = document.cookie
            .split("; ")
            .find(function (item) {
                return item.startsWith("XSRF-TOKEN=");
            });

        if (!cookie) {
            throw new Error(
                "XSRF-TOKEN cookie is missing. Check SecurityConfig.java and the /api/csrf endpoint."
            );
        }

        const token = decodeURIComponent(
            cookie.substring("XSRF-TOKEN=".length)
        );

        if (!token) {
            throw new Error("CSRF token is empty. Please log in again.");
        }

        return {
            "X-XSRF-TOKEN": token
        };
    }

    // =========================
    // INITIAL LOAD
    // =========================
    setupPaginationContainer();
    loadAreas();
    loadCustomers();

    // =========================
    // PAGINATION CONTAINER
    // =========================
    function setupPaginationContainer() {
        if (!customerTable || paginationContainer) return;

        const table = customerTable.closest("table");
        if (!table) return;

        paginationContainer = document.createElement("div");
        paginationContainer.id = "customerPagination";

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

    // =========================
    // ADD CUSTOMER MODAL
    // =========================
    function openAddModal() {
        if (!modal || !form) return;

        editingCustomerId = null;
        form.reset();

        const title = modal.querySelector(".modal-header h2");
        if (title) title.textContent = "Add New Customer";

        modal.classList.add("show");
    }

    if (addButton) {
        addButton.addEventListener("click", openAddModal);
    }

    // =========================
    // CLOSE MODALS
    // =========================
    function closeModal() {
        if (!modal) return;

        modal.classList.remove("show");
        editingCustomerId = null;

        if (form) form.reset();

        const title = modal.querySelector(".modal-header h2");
        if (title) title.textContent = "Add New Customer";
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

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeModal();

            const viewModal = document.getElementById("customerViewModal");
            if (viewModal) viewModal.remove();
        }
    });

    // =========================
    // LOAD AREAS
    // =========================
    async function loadAreas() {
        try {
            const response = await fetch("/api/areas", {
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error("Unable to load areas.");
            }

            areas = await response.json();
            populateAreas();
        } catch (error) {
            console.error("Area loading error:", error);
        }
    }

    // =========================
    // POPULATE AREA DROPDOWNS
    // =========================
    function populateAreas() {
        if (areaSelect) {
            areaSelect.innerHTML =
                '<option value="">Select Area</option>';
        }

        if (areaFilter) {
            areaFilter.innerHTML =
                '<option value="">All Areas</option>';
        }

        areas.forEach(function (area) {
            if (areaSelect) {
                const option = document.createElement("option");
                option.value = area.id;
                option.textContent = area.name;
                areaSelect.appendChild(option);
            }

            if (areaFilter) {
                const filterOption = document.createElement("option");
                filterOption.value = area.id;
                filterOption.textContent = area.name;
                areaFilter.appendChild(filterOption);
            }
        });
    }

    // =========================
    // LOAD CUSTOMERS
    // =========================
    async function loadCustomers() {
        try {
            const response = await fetch("/api/customers", {
                credentials: "same-origin"
            });

            if (!response.ok) {
                throw new Error("Unable to load customers.");
            }

            customers = await response.json();

            // Latest-created customers first.
            sortCustomersLatestFirst();

            updateStatistics();
            displayCustomers();
        } catch (error) {
            console.error("Customer loading error:", error);

            if (customerTable) {
                customerTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty">
                            Unable to load customers. Please refresh the page.
                        </td>
                    </tr>
                `;
            }

            if (paginationContainer) {
                paginationContainer.innerHTML = "";
            }
        }
    }

    function sortCustomersLatestFirst() {
        customers.sort(function (a, b) {
            return Number(b.id || 0) - Number(a.id || 0);
        });
    }

    // =========================
    // FILTER CUSTOMERS
    // =========================
    function getFilteredCustomers() {
        const searchText = searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";

        const selectedArea = areaFilter ? areaFilter.value : "";

        return customers.filter(function (customer) {
            const name = String(customer.name || "").toLowerCase();
            const phone = String(customer.phone || "").toLowerCase();
            const email = String(customer.email || "").toLowerCase();
            const address = String(customer.address || "").toLowerCase();

            const areaName = customer.area
                ? String(customer.area.name || "").toLowerCase()
                : "";

            const matchesSearch =
                name.includes(searchText) ||
                phone.includes(searchText) ||
                email.includes(searchText) ||
                address.includes(searchText) ||
                areaName.includes(searchText);

            const matchesArea =
                selectedArea === "" ||
                String(customer.area?.id ?? "") === String(selectedArea);

            return matchesSearch && matchesArea;
        });
    }

    // =========================
    // DISPLAY CUSTOMERS
    // =========================
    function displayCustomers() {
        if (!customerTable) return;

        setupPaginationContainer();

        const filteredCustomers = getFilteredCustomers();
        const totalRecords = filteredCustomers.length;

        const totalPages = Math.max(
            1,
            Math.ceil(totalRecords / pageSize)
        );

        currentPage = Math.min(
            Math.max(currentPage, 1),
            totalPages
        );

        const startIndex = (currentPage - 1) * pageSize;

        const pageCustomers = filteredCustomers.slice(
            startIndex,
            startIndex + pageSize
        );

        customerTable.innerHTML = "";

        if (totalRecords === 0) {
            customerTable.innerHTML = `
                <tr>
                    <td colspan="6" class="empty">
                        <div class="empty-icon">👥</div>
                        <strong>No customers found</strong>
                        <p>Try changing your search or add a new customer.</p>
                        <button
                            type="button"
                            class="primary-button empty-button"
                            id="emptyAddButton">
                            + Add Customer
                        </button>
                    </td>
                </tr>
            `;

            const newEmptyButton =
                document.getElementById("emptyAddButton");

            if (newEmptyButton) {
                newEmptyButton.addEventListener(
                    "click",
                    openAddModal
                );
            }

            renderPagination(totalRecords, startIndex, totalPages);
            return;
        }

        pageCustomers.forEach(function (customer) {
            const row = document.createElement("tr");

            const areaName = customer.area
                ? customer.area.name
                : "-";

            row.innerHTML = `
                <td>
                    <strong>${escapeHtml(customer.name || "-")}</strong>
                </td>
                <td>${escapeHtml(customer.phone || "-")}</td>
                <td>${escapeHtml(customer.email || "-")}</td>
                <td>${escapeHtml(areaName)}</td>
                <td>${Number(customer.orderCount || 0)}</td>
                <td class="customer-actions">
                    <button type="button" class="table-action view-button">
                        View
                    </button>
                    <button type="button" class="table-action edit-button">
                        Edit
                    </button>
                </td>
            `;

            row.querySelector(".view-button").addEventListener(
                "click",
                function () {
                    showCustomerDetails(customer);
                }
            );

            row.querySelector(".edit-button").addEventListener(
                "click",
                function () {
                    editCustomer(customer);
                }
            );

            customerTable.appendChild(row);
        });

        renderPagination(totalRecords, startIndex, totalPages);
    }

    // =========================
    // PAGINATION CONTROLS
    // =========================
    function renderPagination(totalRecords, startIndex, totalPages) {
        if (!paginationContainer) return;

        const startRecord =
            totalRecords === 0 ? 0 : startIndex + 1;

        const endRecord = Math.min(
            startIndex + pageSize,
            totalRecords
        );

        const pageButtons = [];
        const firstPage = Math.max(1, currentPage - 2);
        const lastPage = Math.min(totalPages, currentPage + 2);

        if (firstPage > 1) {
            pageButtons.push({ page: 1, label: "1" });

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
                gap:12px;
            ">
                <span style="font-size:13px;color:#64748b;">
                    Showing ${startRecord}–${endRecord} of ${totalRecords} customers
                </span>

                <label style="
                    display:flex;
                    align-items:center;
                    gap:6px;
                    font-size:13px;
                    color:#475569;
                ">
                    Rows per page
                    <select id="customerPageSize" style="
                        padding:6px 8px;
                        border:1px solid #cbd5e1;
                        border-radius:6px;
                        background:#fff;
                        color:#334155;
                    ">
                        <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
                        <option value="20" ${pageSize === 20 ? "selected" : ""}>20</option>
                        <option value="30" ${pageSize === 30 ? "selected" : ""}>30</option>
                    </select>
                </label>
            </div>

            <div style="
                display:flex;
                align-items:center;
                flex-wrap:wrap;
                gap:6px;
            " aria-label="Customer table pagination">

                <button
                    type="button"
                    data-page="${currentPage - 1}"
                    ${currentPage <= 1 ? "disabled" : ""}
                    class="pagination-button">
                    Previous
                </button>

                ${pageButtons.map(function (item) {
                    if (item.page === undefined) {
                        return `<span style="padding:6px;color:#64748b;">…</span>`;
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
                    data-page="${currentPage + 1}"
                    ${currentPage >= totalPages ? "disabled" : ""}
                    class="pagination-button">
                    Next
                </button>
            </div>
        `;

        paginationContainer
            .querySelectorAll(".pagination-button")
            .forEach(function (button) {
                button.style.cssText = `
                    padding:7px 10px;
                    border:1px solid #cbd5e1;
                    border-radius:6px;
                    background:#fff;
                    color:#334155;
                    cursor:pointer;
                `;

                if (button.disabled) {
                    button.style.opacity = "0.45";
                    button.style.cursor = "not-allowed";
                }
            });

        const pageSizeSelect =
            paginationContainer.querySelector("#customerPageSize");

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener("change", function () {
                pageSize = Number(pageSizeSelect.value) || 10;
                currentPage = 1;
                displayCustomers();
            });
        }

        paginationContainer
            .querySelectorAll("button[data-page]")
            .forEach(function (button) {
                button.addEventListener("click", function () {
                    if (button.disabled) return;

                    currentPage = Number(button.dataset.page);
                    displayCustomers();
                });
            });
    }

    // =========================
    // VIEW CUSTOMER DETAILS
    // =========================
    function showCustomerDetails(customer) {
        const oldModal =
            document.getElementById("customerViewModal");

        if (oldModal) oldModal.remove();

        const areaName = customer.area
            ? customer.area.name
            : "-";

        const viewModal = document.createElement("div");

        viewModal.id = "customerViewModal";
        viewModal.className = "modal-overlay show";

        viewModal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div>
                        <h2>Customer Details</h2>
                        <p>Customer information</p>
                    </div>

                    <button
                        type="button"
                        class="modal-close"
                        id="closeCustomerView"
                        aria-label="Close customer details">
                        ×
                    </button>
                </div>

                <div style="padding:24px;">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value="${escapeAttribute(customer.name || "")}"
                                readonly>
                        </div>

                        <div class="form-group">
                            <label>Mobile Number</label>
                            <input
                                type="text"
                                value="${escapeAttribute(customer.phone || "")}"
                                readonly>
                        </div>

                        <div class="form-group">
                            <label>Email</label>
                            <input
                                type="text"
                                value="${escapeAttribute(customer.email || "-")}"
                                readonly>
                        </div>

                        <div class="form-group">
                            <label>Area</label>
                            <input
                                type="text"
                                value="${escapeAttribute(areaName)}"
                                readonly>
                        </div>

                        <div class="form-group full">
                            <label>Address</label>
                            <textarea rows="3" readonly>${escapeHtml(customer.address || "-")}</textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(viewModal);

        viewModal
            .querySelector("#closeCustomerView")
            .addEventListener("click", function () {
                viewModal.remove();
            });

        viewModal.addEventListener("click", function (event) {
            if (event.target === viewModal) {
                viewModal.remove();
            }
        });
    }

    // =========================
    // EDIT CUSTOMER
    // =========================
    function editCustomer(customer) {
        if (!modal || !form) return;

        editingCustomerId = customer.id;

        document.getElementById("customerName").value =
            customer.name || "";

        document.getElementById("customerPhone").value =
            customer.phone || "";

        document.getElementById("customerEmail").value =
            customer.email || "";

        document.getElementById("customerAddress").value =
            customer.address || "";

        if (areaSelect) {
            areaSelect.value = customer.area
                ? String(customer.area.id)
                : "";
        }

        const title = modal.querySelector(".modal-header h2");
        if (title) title.textContent = "Edit Customer";

        modal.classList.add("show");
    }

    // =========================
    // SEARCH
    // =========================
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            currentPage = 1;
            displayCustomers();
        });
    }

    // =========================
    // AREA FILTER
    // =========================
    if (areaFilter) {
        areaFilter.addEventListener("change", function () {
            currentPage = 1;
            displayCustomers();
        });
    }

    // =========================
    // SAVE / UPDATE CUSTOMER
    // =========================
    if (form) {
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name =
                document.getElementById("customerName").value.trim();

            const phone =
                document.getElementById("customerPhone").value.trim();

            const email =
                document.getElementById("customerEmail").value.trim();

            const address =
                document.getElementById("customerAddress").value.trim();

            const areaId = areaSelect ? areaSelect.value : "";

            if (!name) {
                alert("Please enter customer name.");
                return;
            }

            if (!phone) {
                alert("Please enter mobile number.");
                return;
            }

            if (!address) {
                alert("Please enter customer address.");
                return;
            }

            if (!areaId) {
                alert("Please select an area.");
                return;
            }

            const customerData = {
                name: name,
                phone: phone,
                email: email,
                address: address,
                area: {
                    id: Number(areaId)
                }
            };

            const submitButton =
                form.querySelector('button[type="submit"]');

            const isEditing = editingCustomerId !== null;

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = isEditing
                    ? "Updating..."
                    : "Saving...";
            }

            try {
                const csrfHeaders = await getCsrfHeaders();

                const response = await fetch(
                    isEditing
                        ? "/api/customers/" + editingCustomerId
                        : "/api/customers",
                    {
                        method: isEditing ? "PUT" : "POST",
                        credentials: "same-origin",
                        headers: {
                            "Content-Type": "application/json",
                            ...csrfHeaders
                        },
                        body: JSON.stringify(customerData)
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();

                    throw new Error(
                        errorText ||
                        (isEditing
                            ? "Unable to update customer. HTTP " + response.status
                            : "Unable to save customer. HTTP " + response.status)
                    );
                }

                const savedCustomer = await response.json();

                if (isEditing) {
                    const index = customers.findIndex(function (item) {
                        return String(item.id) ===
                            String(editingCustomerId);
                    });

                    if (index !== -1) {
                        customers[index] = savedCustomer;
                    } else {
                        customers.push(savedCustomer);
                    }

                    alert("Customer updated successfully!");
                } else {
                    customers.push(savedCustomer);

                    if (searchInput) searchInput.value = "";
                    if (areaFilter) areaFilter.value = "";

                    alert("Customer added successfully!");
                }

                sortCustomersLatestFirst();

                closeModal();
                currentPage = 1;
                updateStatistics();
                displayCustomers();
            } catch (error) {
                console.error("Customer save error:", error);

                alert(
                    error.message ||
                    "An error occurred while saving the customer."
                );
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Save Customer";
                }
            }
        });
    }

    // =========================
    // STATISTICS
    // =========================
    function updateStatistics() {
        const total = document.getElementById("totalCustomers");
        const active = document.getElementById("activeCustomers");
        const areaCount = document.getElementById("areaCount");

        if (total) {
            total.textContent = customers.length;
        }

        // The current customer API does not expose an active/inactive field.
        if (active) {
            active.textContent = customers.length;
        }

        const uniqueAreas = new Set(
            customers
                .filter(function (customer) {
                    return customer.area && customer.area.id != null;
                })
                .map(function (customer) {
                    return customer.area.id;
                })
        );

        if (areaCount) {
            areaCount.textContent = uniqueAreas.size;
        }
    }

    // =========================
    // HTML ESCAPING
    // =========================
    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    }

    function escapeAttribute(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/'/g, "&#39;");
    }
});
