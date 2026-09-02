document.addEventListener("DOMContentLoaded", function () {

    const modal = document.getElementById("customerModal");
    const addButton = document.getElementById("addCustomerButton");
    const emptyAddButton = document.getElementById("emptyAddButton");
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
    // INITIAL LOAD
    // =========================

    loadAreas();
    loadCustomers();


    // =========================
    // ADD CUSTOMER
    // =========================

    function openAddModal() {

        editingCustomerId = null;

        if (form) {
            form.reset();
        }

        const title = modal.querySelector(".modal-header h2");

        if (title) {
            title.textContent = "Add New Customer";
        }

        modal.classList.add("show");
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

        if (!modal) return;

        modal.classList.remove("show");

        editingCustomerId = null;

        if (form) {
            form.reset();
        }

        const title = modal.querySelector(".modal-header h2");

        if (title) {
            title.textContent = "Add New Customer";
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
    // LOAD AREAS
    // =========================

    async function loadAreas() {

        try {

            const response =
                await fetch("/api/areas");

            if (!response.ok) {
                throw new Error("Unable to load areas");
            }

            areas = await response.json();

            populateAreas();

        } catch (error) {

            console.error(
                "Area loading error:",
                error
            );

        }
    }


    // =========================
    // POPULATE AREAS
    // =========================

    function populateAreas() {

        if (!areaSelect || !areaFilter) {
            return;
        }

        areaSelect.innerHTML =
            '<option value="">Select Area</option>';

        areaFilter.innerHTML =
            '<option value="">All Areas</option>';


        areas.forEach(function (area) {

            const option =
                document.createElement("option");

            option.value = area.id;
            option.textContent = area.name;

            areaSelect.appendChild(option);


            const filterOption =
                document.createElement("option");

            filterOption.value = area.id;
            filterOption.textContent = area.name;

            areaFilter.appendChild(filterOption);

        });

    }


    // =========================
    // LOAD CUSTOMERS
    // =========================

    async function loadCustomers() {

        try {

            const response =
                await fetch("/api/customers");

            if (!response.ok) {
                throw new Error(
                    "Unable to load customers"
                );
            }

            customers = await response.json();

            updateStatistics();

            displayCustomers();

        } catch (error) {

            console.error(
                "Customer loading error:",
                error
            );

        }

    }


    // =========================
    // DISPLAY CUSTOMERS
    // =========================

    function displayCustomers() {

        if (!customerTable) {
            return;
        }


        const searchText =
            searchInput
                ? searchInput.value.toLowerCase().trim()
                : "";


        const selectedArea =
            areaFilter
                ? areaFilter.value
                : "";


        const filteredCustomers =
            customers.filter(function (customer) {

                const name =
                    (customer.name || "").toLowerCase();

                const phone =
                    (customer.phone || "").toLowerCase();

                const email =
                    (customer.email || "").toLowerCase();

                const address =
                    (customer.address || "").toLowerCase();

                const areaName =
                    customer.area
                        ? (customer.area.name || "").toLowerCase()
                        : "";


                const matchesSearch =
                    name.includes(searchText) ||
                    phone.includes(searchText) ||
                    email.includes(searchText) ||
                    address.includes(searchText) ||
                    areaName.includes(searchText);


                const matchesArea =
                    selectedArea === "" ||
                    String(customer.area?.id) ===
                    String(selectedArea);


                return matchesSearch && matchesArea;

            });


        customerTable.innerHTML = "";


        if (filteredCustomers.length === 0) {

            customerTable.innerHTML = `

                <tr>

                    <td colspan="6" class="empty">

                        <div class="empty-icon">
                            👥
                        </div>

                        <strong>
                            No customers found
                        </strong>

                        <p>
                            Try changing your search
                            or add a new customer.
                        </p>

                    </td>

                </tr>

            `;

            return;
        }


        filteredCustomers.forEach(function (customer) {

            const row =
                document.createElement("tr");


            const areaName =
                customer.area
                    ? customer.area.name
                    : "-";


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHtml(customer.name)}
                    </strong>
                </td>

                <td>
                    ${escapeHtml(customer.phone)}
                </td>

                <td>
                    ${
                        customer.email
                            ? escapeHtml(customer.email)
                            : "-"
                    }
                </td>

                <td>
                    ${escapeHtml(areaName)}
                </td>

                <td>
                    0
                </td>

                <td class="customer-actions">

                    <button
                        type="button"
                        class="table-action view-button">
                        View
                    </button>

                    <button
                        type="button"
                        class="table-action edit-button">
                        Edit
                    </button>

                </td>
            `;


            // =========================
            // VIEW
            // =========================

            const viewButton =
                row.querySelector(".view-button");


            viewButton.addEventListener(
                "click",
                function () {

                    showCustomerDetails(customer);

                }
            );


            // =========================
            // EDIT
            // =========================

            const editButton =
                row.querySelector(".edit-button");


            editButton.addEventListener(
                "click",
                function () {

                    editCustomer(customer);

                }
            );


            customerTable.appendChild(row);

        });

    }


    // =========================
    // VIEW CUSTOMER DETAILS
    // =========================

    function showCustomerDetails(customer) {

        // Remove old details modal if it exists
        const oldModal =
            document.getElementById("customerViewModal");

        if (oldModal) {
            oldModal.remove();
        }


        const areaName =
            customer.area
                ? customer.area.name
                : "-";


        const viewModal =
            document.createElement("div");

        viewModal.id = "customerViewModal";

        viewModal.className =
            "modal-overlay show";


        viewModal.innerHTML = `

            <div class="modal">

                <div class="modal-header">

                    <div>

                        <h2>
                            Customer Details
                        </h2>

                        <p>
                            Customer information
                        </p>

                    </div>

                    <button
                        type="button"
                        class="modal-close"
                        id="closeCustomerView">

                        ×

                    </button>

                </div>


                <div style="padding: 24px;">

                    <div class="form-grid">

                        <div class="form-group">

                            <label>
                                Full Name
                            </label>

                            <input
                                type="text"
                                value="${escapeAttribute(customer.name)}"
                                readonly>

                        </div>


                        <div class="form-group">

                            <label>
                                Mobile Number
                            </label>

                            <input
                                type="text"
                                value="${escapeAttribute(customer.phone)}"
                                readonly>

                        </div>


                        <div class="form-group">

                            <label>
                                Email
                            </label>

                            <input
                                type="text"
                                value="${escapeAttribute(customer.email || "-")}"
                                readonly>

                        </div>


                        <div class="form-group">

                            <label>
                                Area
                            </label>

                            <input
                                type="text"
                                value="${escapeAttribute(areaName)}"
                                readonly>

                        </div>


                        <div class="form-group full">

                            <label>
                                Address
                            </label>

                            <textarea
                                rows="3"
                                readonly>${escapeHtml(customer.address || "-")}</textarea>

                        </div>

                    </div>

                </div>


                <div class="modal-footer">

                    <button
                        type="button"
                        class="secondary-button"
                        id="closeCustomerView">

                        Close

                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(viewModal);


        // Close X
        document
            .getElementById("closeCustomerView")
            .addEventListener(
                "click",
                function () {

                    viewModal.remove();

                }
            );


        // Close button
        document
            .getElementById("closeCustomerView")
            .addEventListener(
                "click",
                function () {

                    viewModal.remove();

                }
            );


        // Click outside modal
        viewModal.addEventListener(
            "click",
            function (event) {

                if (event.target === viewModal) {
                    viewModal.remove();
                }

            }
        );

    }


    // =========================
    // EDIT CUSTOMER
    // =========================

    function editCustomer(customer) {

        editingCustomerId =
            customer.id;


        document.getElementById(
            "customerName"
        ).value =
            customer.name || "";


        document.getElementById(
            "customerPhone"
        ).value =
            customer.phone || "";


        document.getElementById(
            "customerEmail"
        ).value =
            customer.email || "";


        document.getElementById(
            "customerAddress"
        ).value =
            customer.address || "";


        if (areaSelect) {

            areaSelect.value =
                customer.area
                    ? customer.area.id
                    : "";

        }


        const title =
            modal.querySelector(".modal-header h2");


        if (title) {
            title.textContent =
                "Edit Customer";
        }


        modal.classList.add("show");

    }


    // =========================
    // SEARCH
    // =========================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            displayCustomers
        );

    }


    // =========================
    // AREA FILTER
    // =========================

    if (areaFilter) {

        areaFilter.addEventListener(
            "change",
            displayCustomers
        );

    }


    // =========================
    // SAVE / UPDATE
    // =========================

    if (form) {

        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const name =
                    document.getElementById(
                        "customerName"
                    ).value.trim();


                const phone =
                    document.getElementById(
                        "customerPhone"
                    ).value.trim();


                const email =
                    document.getElementById(
                        "customerEmail"
                    ).value.trim();


                const address =
                    document.getElementById(
                        "customerAddress"
                    ).value.trim();


                const areaId =
                    areaSelect
                        ? areaSelect.value
                        : "";


                if (!name) {

                    alert(
                        "Please enter customer name."
                    );

                    return;
                }


                if (!phone) {

                    alert(
                        "Please enter mobile number."
                    );

                    return;
                }


                if (!address) {

                    alert(
                        "Please enter customer address."
                    );

                    return;
                }


                if (!areaId) {

                    alert(
                        "Please select an area."
                    );

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


                try {

                    let response;


                    // =========================
                    // UPDATE
                    // =========================

                    if (editingCustomerId !== null) {

                        response =
                            await fetch(
                                "/api/customers/" +
                                editingCustomerId,
                                {
                                    method: "PUT",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify(
                                            customerData
                                        )
                                }
                            );


                        if (!response.ok) {

                            throw new Error(
                                "Unable to update customer."
                            );

                        }


                        const updatedCustomer =
                            await response.json();


                        const index =
                            customers.findIndex(
                                function (item) {

                                    return item.id ===
                                        editingCustomerId;

                                }
                            );


                        if (index !== -1) {

                            customers[index] =
                                updatedCustomer;

                        }


                        closeModal();

                        updateStatistics();

                        displayCustomers();


                        alert(
                            "Customer updated successfully!"
                        );

                    }

                    // =========================
                    // CREATE
                    // =========================

                    else {

                        response =
                            await fetch(
                                "/api/customers",
                                {
                                    method: "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body:
                                        JSON.stringify(
                                            customerData
                                        )
                                }
                            );


                        if (!response.ok) {

                            throw new Error(
                                "Unable to save customer."
                            );

                        }


                        const savedCustomer =
                            await response.json();


                        customers.push(
                            savedCustomer
                        );


                        closeModal();

                        updateStatistics();

                        displayCustomers();


                        alert(
                            "Customer added successfully!"
                        );

                    }


                } catch (error) {

                    console.error(
                        "Customer save error:",
                        error
                    );


                    alert(error.message);

                }

            }
        );

    }


    // =========================
    // STATISTICS
    // =========================

    function updateStatistics() {

        const total =
            document.getElementById(
                "totalCustomers"
            );

        const active =
            document.getElementById(
                "activeCustomers"
            );

        const areaCount =
            document.getElementById(
                "areaCount"
            );


        if (total) {
            total.textContent =
                customers.length;
        }


        if (active) {
            active.textContent =
                customers.length;
        }


        const uniqueAreas =
            new Set(

                customers
                    .filter(function (customer) {

                        return customer.area;

                    })
                    .map(function (customer) {

                        return customer.area.id;

                    })

            );


        if (areaCount) {

            areaCount.textContent =
                uniqueAreas.size;

        }

    }


    // =========================
    // ESCAPE HTML
    // =========================

    function escapeHtml(value) {

        const div =
            document.createElement("div");

        div.textContent =
            value ?? "";

        return div.innerHTML;

    }


    function escapeAttribute(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    }

});