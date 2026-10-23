
document.addEventListener("DOMContentLoaded", function () {
    console.log("logout.js loaded on:", window.location.pathname);

    const profileButton = document.getElementById("profileMenuButton");
    const dropdown = document.getElementById("profileDropdown");
    const logoutButton = document.getElementById("logoutButton");

    if (!profileButton || !dropdown || !logoutButton) {
        console.error("Logout menu elements missing:", {
            profileButton: !!profileButton,
            dropdown: !!dropdown,
            logoutButton: !!logoutButton
        });
        return;
    }

    // Open or close the dropdown.
    profileButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        dropdown.hidden = !dropdown.hidden;

        profileButton.setAttribute(
            "aria-expanded",
            String(!dropdown.hidden)
        );

        console.log("Dropdown open:", !dropdown.hidden);
    });

    // Keep clicks inside the dropdown from closing it.
    dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    // Close when clicking outside.
    document.addEventListener("click", function () {
        dropdown.hidden = true;
        profileButton.setAttribute("aria-expanded", "false");
    });

    // Close with Escape.
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            dropdown.hidden = true;
            profileButton.setAttribute("aria-expanded", "false");
        }
    });

    // Log out.
    logoutButton.addEventListener("click", async function () {
        if (!window.confirm("Are you sure you want to log out?")) {
            return;
        }

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {
            const csrfResponse = await fetch("/api/csrf", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!csrfResponse.ok) {
                throw new Error(
                    "Could not get security token. HTTP " +
                    csrfResponse.status
                );
            }

            const csrfData = await csrfResponse.json();

            if (!csrfData.token || !csrfData.headerName) {
                throw new Error("CSRF token or header name is missing.");
            }

            const response = await fetch("/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    [csrfData.headerName]: csrfData.token
                },
                redirect: "follow"
            });

            if (response.redirected) {
                window.location.replace(response.url);
                return;
            }

            if (response.ok) {
                window.location.replace("/login.html?logout");
                return;
            }

            throw new Error("Logout failed. HTTP " + response.status);

        } catch (error) {
            console.error("Logout error:", error);
            window.alert(error.message || "Unable to log out.");

            logoutButton.disabled = false;
            logoutButton.innerHTML =
                '<span class="logout-icon" aria-hidden="true">↪</span>' +
                '<span>Logout</span>';
        }
    });
});
