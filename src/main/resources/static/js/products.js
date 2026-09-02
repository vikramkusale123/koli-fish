document.addEventListener("DOMContentLoaded", function () {

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

let products = [];
let editingProductId = null;


// =========================
// INITIAL LOAD
// =========================

loadProducts();


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
    const active = document.getElementById("productActive");

    if (title) {
        title.textContent = "Add New Product";
    }

    if (subtitle) {
        subtitle.textContent = "Enter product information";
    }

    if (saveButton) {
        saveButton.textContent = "Save Product";
    }

    if (active) {
        active.value = "true";
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

        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Unable to load products.");
        }

        products = await response.json();

        updateStatistics();
        populateCategories();
        displayProducts();

    } catch (error) {

        console.error("Product loading error:", error);

    }

}


// =========================
// POPULATE CATEGORIES
// =========================

function populateCategories() {

    if (!categoryFilter) {
        return;
    }

    const categories = [];

    products.forEach(function (product) {

        if (
            product.category &&
            !categories.includes(product.category)
        ) {
            categories.push(product.category);
        }

    });

    categories.sort();

    categoryFilter.innerHTML =
        '<option value="">All Categories</option>';

    categories.forEach(function (category) {

        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        categoryFilter.appendChild(option);

    });

}


// =========================
// DISPLAY PRODUCTS
// =========================

function displayProducts() {

    if (!productTable) {
        return;
    }


    const searchText =
        searchInput
            ? searchInput.value.toLowerCase().trim()
            : "";


    const selectedCategory =
        categoryFilter
            ? categoryFilter.value
            : "";


    const selectedStatus =
        statusFilter
            ? statusFilter.value
            : "";


    const filteredProducts = products.filter(function (product) {

        const name =
            (product.name || "").toLowerCase();

        const category =
            (product.category || "").toLowerCase();


        const matchesSearch =
            name.includes(searchText) ||
            category.includes(searchText);


        const matchesCategory =
            selectedCategory === "" ||
            product.category === selectedCategory;


        const matchesStatus =
            selectedStatus === "" ||
            String(product.active) === selectedStatus;


        return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus
        );

    });


    productTable.innerHTML = "";


    // =========================
    // NO PRODUCTS
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
        title.textContent = "No products found";

        const text = document.createElement("p");
        text.textContent =
            "Add your first fish product to get started.";

        cell.appendChild(icon);
        cell.appendChild(title);
        cell.appendChild(text);

        row.appendChild(cell);

        productTable.appendChild(row);

        return;
    }


    // =========================
    // PRODUCT ROWS
    // =========================

    filteredProducts.forEach(function (product) {

        const row = document.createElement("tr");


        // PRODUCT NAME

        const nameCell = document.createElement("td");

        const nameStrong = document.createElement("strong");

        nameStrong.textContent =
            product.name || "-";

        nameCell.appendChild(nameStrong);


        // CATEGORY

        const categoryCell =
            document.createElement("td");

        categoryCell.textContent =
            product.category || "-";


        // PRICE

        const priceCell =
            document.createElement("td");

        let priceText = "-";

        if (
            product.price !== null &&
            product.price !== undefined
        ) {

            priceText =
                "₹" +
                Number(product.price).toFixed(2);

            if (product.unit) {

                priceText +=
                    " / " +
                    product.unit;

            }

        }

        priceCell.textContent = priceText;


        // STOCK

        const stockCell =
            document.createElement("td");

        let stockText = "-";

        if (
            product.stockQuantity !== null &&
            product.stockQuantity !== undefined
        ) {

            stockText =
                product.stockQuantity +
                " " +
                (product.unit || "");

        }

        stockCell.textContent = stockText;


        // STATUS

        const statusCell =
            document.createElement("td");

        const statusSpan =
            document.createElement("span");

        if (product.active === true) {

            statusSpan.className =
                "status active";

            statusSpan.textContent =
                "Active";

        } else {

            statusSpan.className =
                "status inactive";

            statusSpan.textContent =
                "Inactive";

        }

        statusCell.appendChild(statusSpan);


        // ACTIONS

        const actionCell =
            document.createElement("td");

        actionCell.className = "product-actions";


        const editButton =
            document.createElement("button");

        editButton.type = "button";
        editButton.className =
            "table-action edit-button";

        editButton.textContent = "Edit";


        editButton.addEventListener(
            "click",
            function () {

                editProduct(product);

            }
        );


        const deleteButton =
            document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className =
            "table-action delete-button";

        deleteButton.textContent = "Delete";


        deleteButton.addEventListener(
            "click",
            function () {

                deleteProduct(product.id);

            }
        );


        actionCell.appendChild(editButton);
        actionCell.appendChild(deleteButton);


        // ADD CELLS

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
// SEARCH
// =========================

if (searchInput) {

    searchInput.addEventListener(
        "input",
        displayProducts
    );

}


// =========================
// CATEGORY FILTER
// =========================

if (categoryFilter) {

    categoryFilter.addEventListener(
        "change",
        displayProducts
    );

}


// =========================
// STATUS FILTER
// =========================

if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        displayProducts
    );

}


// =========================
// SAVE PRODUCT
// =========================

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document
                    .getElementById("productName")
                    .value
                    .trim();


            const category =
                document
                    .getElementById("productCategory")
                    .value
                    .trim();


            const price =
                Number(
                    document
                        .getElementById("productPrice")
                        .value
                );


            const unit =
                document
                    .getElementById("productUnit")
                    .value;


            const stockValue =
                document
                    .getElementById("stockQuantity")
                    .value;


            const stockQuantity =
                stockValue === ""
                    ? null
                    : Number(stockValue);


            const active =
                document
                    .getElementById("productActive")
                    .value === "true";


            // =========================
            // VALIDATION
            // =========================

            if (!name) {

                alert(
                    "Please enter product name."
                );

                return;
            }


            if (isNaN(price) || price < 0) {

                alert(
                    "Please enter a valid price."
                );

                return;
            }


            if (!unit) {

                alert(
                    "Please select a unit."
                );

                return;
            }


            if (
                stockQuantity !== null &&
                (
                    isNaN(stockQuantity) ||
                    stockQuantity < 0
                )
            ) {

                alert(
                    "Please enter a valid stock quantity."
                );

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


            try {

                let response;


                // =========================
                // CREATE PRODUCT
                // =========================

                if (editingProductId === null) {

                    response =
                        await fetch(
                            "/api/products",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(product)
                            }
                        );

                }


                // =========================
                // UPDATE PRODUCT
                // =========================

                else {

                    response =
                        await fetch(
                            "/api/products/" +
                            editingProductId,
                            {
                                method: "PUT",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(product)
                            }
                        );

                }


                if (!response.ok) {

                    if (response.status === 409) {

                        throw new Error(
                            "A product with this name already exists."
                        );

                    }

                    throw new Error(
                        "Unable to save product."
                    );

                }


                const savedProduct =
                    await response.json();


                // =========================
                // UPDATE LOCAL DATA
                // =========================

                if (editingProductId === null) {

                    products.push(savedProduct);

                    alert(
                        "Product added successfully!"
                    );

                } else {

                    const index =
                        products.findIndex(
                            function (item) {

                                return (
                                    item.id ===
                                    editingProductId
                                );

                            }
                        );


                    if (index !== -1) {

                        products[index] =
                            savedProduct;

                    }


                    alert(
                        "Product updated successfully!"
                    );

                }


                updateStatistics();
                populateCategories();
                displayProducts();

                closeModal();


            } catch (error) {

                console.error(
                    "Save product error:",
                    error
                );

                alert(error.message);

            }

        }
    );

}


// =========================
// EDIT PRODUCT
// =========================

function editProduct(product) {

    editingProductId =
        product.id;


    const title =
        document.getElementById(
            "modalTitle"
        );


    const subtitle =
        document.getElementById(
            "modalSubtitle"
        );


    const saveButton =
        document.getElementById(
            "saveProductButton"
        );


    if (title) {

        title.textContent =
            "Edit Product";

    }


    if (subtitle) {

        subtitle.textContent =
            "Update product information";

    }


    if (saveButton) {

        saveButton.textContent =
            "Update Product";

    }


    const nameInput =
        document.getElementById(
            "productName"
        );


    const categoryInput =
        document.getElementById(
            "productCategory"
        );


    const priceInput =
        document.getElementById(
            "productPrice"
        );


    const unitInput =
        document.getElementById(
            "productUnit"
        );


    const stockInput =
        document.getElementById(
            "stockQuantity"
        );


    const activeInput =
        document.getElementById(
            "productActive"
        );


    if (nameInput) {
        nameInput.value =
            product.name || "";
    }


    if (categoryInput) {
        categoryInput.value =
            product.category || "";
    }


    if (priceInput) {
        priceInput.value =
            product.price ?? "";
    }


    if (unitInput) {
        unitInput.value =
            product.unit || "";
    }


    if (stockInput) {
        stockInput.value =
            product.stockQuantity ?? "";
    }


    if (activeInput) {
        activeInput.value =
            String(product.active);
    }


    if (modal) {
        modal.classList.add("show");
    }

}


// =========================
// DELETE PRODUCT
// =========================

async function deleteProduct(id) {

    const product =
        products.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!product) {
        return;
    }


    const confirmed =
        confirm(
            'Are you sure you want to delete "' +
            product.name +
            '"?'
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/products/" + id,
                {
                    method: "DELETE"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to delete product."
            );

        }


        products =
            products.filter(
                function (item) {

                    return item.id !== id;

                }
            );


        updateStatistics();
        populateCategories();
        displayProducts();


        alert(
            "Product deleted successfully!"
        );


    } catch (error) {

        console.error(
            "Delete product error:",
            error
        );


        alert(
            error.message
        );

    }

}


// =========================
// STATISTICS
// =========================

function updateStatistics() {

    const total =
        document.getElementById(
            "totalProducts"
        );


    const active =
        document.getElementById(
            "activeProducts"
        );


    const categoryCount =
        document.getElementById(
            "categoryCount"
        );


    if (total) {

        total.textContent =
            products.length;

    }


    if (active) {

        active.textContent =
            products.filter(
                function (product) {

                    return (
                        product.active === true
                    );

                }
            ).length;

    }


    const categories =
        new Set();


    products.forEach(
        function (product) {

            if (product.category) {

                categories.add(
                    product.category
                );

            }

        }
    );


    if (categoryCount) {

        categoryCount.textContent =
            categories.size;

    }

}

});
