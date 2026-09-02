document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // ELEMENTS
    // =========================================

    const modal =
        document.getElementById("areaModal");

    const addButton =
        document.getElementById("addAreaButton");

    const closeButton =
        document.getElementById("closeAreaModal");

    const cancelButton =
        document.getElementById("cancelAreaButton");

    const form =
        document.getElementById("areaForm");

    const areaTable =
        document.getElementById("areaTable");

    const searchInput =
        document.getElementById("areaSearch");

    const searchInputSecondary =
        document.getElementById("areaSearchSecondary");

    const totalAreas =
        document.getElementById("totalAreas");

    const activeAreas =
        document.getElementById("activeAreas");

    const totalCustomers =
        document.getElementById("totalCustomers");

    const areaNameInput =
        document.getElementById("areaName");


    // =========================================
    // DATA
    // =========================================

    let areas = [];

    let customers = [];


    // =========================================
    // START
    // =========================================

    loadData();


    async function loadData() {

        await loadAreas();

        await loadCustomers();

        updateStatistics();

        displayAreas();

    }


    // =========================================
    // LOAD AREAS
    // =========================================

    async function loadAreas() {

        try {

            const response =
                await fetch("/api/areas");

            if (!response.ok) {

                throw new Error(
                    "Unable to load areas"
                );

            }

            areas =
                await response.json();

            console.log(
                "Areas loaded:",
                areas
            );

        } catch (error) {

            console.error(
                "Area loading error:",
                error
            );

            areas = [];

        }

    }


    // =========================================
    // LOAD CUSTOMERS
    // =========================================

    async function loadCustomers() {

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

            console.log(
                "Customers loaded:",
                customers
            );

        } catch (error) {

            console.error(
                "Customer loading error:",
                error
            );

            customers = [];

        }

    }


    // =========================================
    // DISPLAY AREAS
    // =========================================

    function displayAreas() {

        if (!areaTable) {

            console.error(
                "areaTable not found"
            );

            return;

        }


        const search =
            searchInput
                ? searchInput.value
                    .toLowerCase()
                    .trim()
                : "";


        const secondarySearch =
            searchInputSecondary
                ? searchInputSecondary.value
                    .toLowerCase()
                    .trim()
                : "";


        const activeSearch =
            secondarySearch || search;


        const filteredAreas =
            areas.filter(function (area) {

                return String(area.name || "")
                    .toLowerCase()
                    .includes(activeSearch);

            });


        areaTable.innerHTML = "";


        // =====================================
        // NO AREAS
        // =====================================

        if (filteredAreas.length === 0) {

            areaTable.innerHTML = `

                <tr>

                    <td colspan="4">

                        <div class="area-empty">

                            <div class="empty-icon">
                                📍
                            </div>

                            <strong>
                                No areas found
                            </strong>

                            <p>
                                Add an area to get started.
                            </p>

                            <button
                                type="button"
                                class="primary-button"
                                id="emptyAreaButton">

                                + Add Area

                            </button>

                        </div>

                    </td>

                </tr>

            `;


            const emptyButton =
                document.getElementById(
                    "emptyAreaButton"
                );


            if (emptyButton) {

                emptyButton.addEventListener(
                    "click",
                    openModal
                );

            }


            updateShowingCount(0);

            return;

        }


        // =====================================
        // DISPLAY ROWS
        // =====================================

        filteredAreas.forEach(
            function (area) {

                const customerCount =
                    getCustomerCount(area.id);


                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <!-- AREA NAME -->

                    <td>

                        <div class="area-name-cell">

                            <div>

                                <strong>
                                    ${escapeHtml(area.name)}
                                </strong>

                            </div>

                        </div>

                    </td>


                    <!-- CUSTOMERS -->

                    <td>

                        <div class="customer-count">

                            <strong>
                                ${customerCount}
                            </strong>

                            <span>

                                ${
                                    customerCount === 1
                                        ? "customer"
                                        : "customers"
                                }

                            </span>

                        </div>

                    </td>


                    <!-- STATUS -->

                    <td>

                        <span class="area-status active">

                            <span class="status-dot"></span>

                            Active

                        </span>

                    </td>


                    <!-- ACTIONS -->

                    <td>

                        <div class="area-actions">

                            <button
                                type="button"
                                class="area-edit-button"
                                title="Edit Area">

                                ✏️

                            </button>


                            <button
                                type="button"
                                class="area-delete-button"
                                title="Delete Area">

                                🗑️

                            </button>

                        </div>

                    </td>

                `;


                // =================================
                // EDIT
                // =================================

                const editButton =
                    row.querySelector(
                        ".area-edit-button"
                    );


                if (editButton) {

                    editButton.addEventListener(
                        "click",
                        function () {

                            editArea(area);

                        }
                    );

                }


                // =================================
                // DELETE
                // =================================

                const deleteButton =
                    row.querySelector(
                        ".area-delete-button"
                    );


                if (deleteButton) {

                    deleteButton.addEventListener(
                        "click",
                        function () {

                            deleteArea(area.id);

                        }
                    );

                }


                areaTable.appendChild(row);

            }
        );


        updateShowingCount(
            filteredAreas.length
        );

    }


    // =========================================
    // CUSTOMER COUNT
    // =========================================

    function getCustomerCount(areaId) {

        return customers.filter(
            function (customer) {

                if (!customer.area) {
                    return false;
                }


                return String(customer.area.id) ===
                    String(areaId);

            }
        ).length;

    }


    // =========================================
    // STATISTICS
    // =========================================

    function updateStatistics() {

        if (totalAreas) {

            totalAreas.textContent =
                areas.length;

        }


        if (activeAreas) {

            activeAreas.textContent =
                areas.length;

        }


        if (totalCustomers) {

            totalCustomers.textContent =
                customers.length;

        }

    }


    // =========================================
    // SHOWING COUNT
    // =========================================

    function updateShowingCount(count) {

        const showingCount =
            document.getElementById(
                "showingCount"
            );


        if (!showingCount) {
            return;
        }


        if (count === 0) {

            showingCount.textContent =
                "Showing 0 areas";

        } else {

            showingCount.textContent =
                `Showing 1 to ${count} of ${count} areas`;

        }

    }


    // =========================================
    // OPEN MODAL
    // =========================================

    function openModal() {

        if (!modal) {
            return;
        }


        modal.classList.add("show");


        if (form) {
            form.reset();
        }


        if (areaNameInput) {

            areaNameInput.focus();

        }

    }


    if (addButton) {

        addButton.addEventListener(
            "click",
            openModal
        );

    }


    // =========================================
    // CLOSE MODAL
    // =========================================

    function closeModal() {

        if (!modal) {
            return;
        }


        modal.classList.remove("show");

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    closeModal();

                }

            }
        );

    }


    // =========================================
    // SAVE AREA
    // =========================================

    if (form) {

        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                const name =
                    areaNameInput
                        ? areaNameInput.value.trim()
                        : "";


                if (!name) {

                    alert(
                        "Please enter area name."
                    );

                    return;

                }


                // Prevent duplicate names

                const duplicate =
                    areas.some(
                        function (area) {

                            return String(
                                area.name || ""
                            )
                                .toLowerCase()
                                === name.toLowerCase();

                        }
                    );


                if (duplicate) {

                    alert(
                        "This area already exists."
                    );

                    return;

                }


                try {

                    const response =
                        await fetch(
                            "/api/areas",
                            {

                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        name: name
                                    })

                            }
                        );


                    if (!response.ok) {

                        const errorText =
                            await response.text();

                        console.error(
                            "Server error:",
                            errorText
                        );

                        throw new Error(
                            "Unable to save area."
                        );

                    }


                    const savedArea =
                        await response.json();


                    areas.push(
                        savedArea
                    );


                    updateStatistics();

                    displayAreas();

                    closeModal();


                    if (form) {
                        form.reset();
                    }


                } catch (error) {

                    console.error(
                        "Save area error:",
                        error
                    );

                    alert(
                        "Unable to save area."
                    );

                }

            }
        );

    }


    // =========================================
    // SEARCH - TOP
    // =========================================

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                if (searchInputSecondary) {
                    searchInputSecondary.value =
                        searchInput.value;
                }

                displayAreas();

            }
        );

    }


    // =========================================
    // SEARCH - SECONDARY
    // =========================================

    if (searchInputSecondary) {

        searchInputSecondary.addEventListener(
            "input",
            function () {

                if (searchInput) {
                    searchInput.value =
                        searchInputSecondary.value;
                }

                displayAreas();

            }
        );

    }


    // =========================================
    // EDIT AREA
    // =========================================

    function editArea(area) {

        const newName =
            prompt(
                "Enter new area name:",
                area.name
            );


        if (newName === null) {
            return;
        }


        const name =
            newName.trim();


        if (!name) {

            alert(
                "Area name cannot be empty."
            );

            return;

        }


        updateArea(
            area.id,
            name
        );

    }


    // =========================================
    // UPDATE AREA
    // =========================================

    async function updateArea(id, name) {

        try {

            const response =
                await fetch(
                    "/api/areas/" + id,
                    {

                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                name: name
                            })

                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to update area"
                );

            }


            const updatedArea =
                await response.json();


            areas =
                areas.map(
                    function (area) {

                        if (
                            String(area.id) ===
                            String(id)
                        ) {

                            return updatedArea;

                        }

                        return area;

                    }
                );


            displayAreas();


        } catch (error) {

            console.error(
                "Update area error:",
                error
            );

            alert(
                "Unable to update area. Check your backend PUT endpoint."
            );

        }

    }


    // =========================================
    // DELETE AREA
    // =========================================

    async function deleteArea(id) {

        const area =
            areas.find(
                function (item) {

                    return String(item.id) ===
                        String(id);

                }
            );


        if (!area) {
            return;
        }


        const confirmed =
            confirm(
                `Are you sure you want to delete "${area.name}"?`
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    "/api/areas/" + id,
                    {
                        method: "DELETE"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to delete area"
                );

            }


            areas =
                areas.filter(
                    function (item) {

                        return String(item.id) !==
                            String(id);

                    }
                );


            updateStatistics();

            displayAreas();


        } catch (error) {

            console.error(
                "Delete area error:",
                error
            );

            alert(
                "Unable to delete area."
            );

        }

    }


    // =========================================
    // ESCAPE HTML
    // =========================================

    function escapeHtml(value) {

        const div =
            document.createElement("div");


        div.textContent =
            value ?? "";


        return div.innerHTML;

    }

});
