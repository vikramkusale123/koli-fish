
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

    // ===============================
    // CSRF HELPERS
    // Matches CookieCsrfTokenRepository in SecurityConfig.java
    // ===============================

    function getCookie(name) {
        const prefix = name + "=";

        const cookie = document.cookie
            .split(";")
            .map(value => value.trim())
            .find(value => value.startsWith(prefix));

        if (!cookie) {
            return null;
        }

        try {
            return decodeURIComponent(cookie.substring(prefix.length));
        } catch (error) {
            console.error("Unable to decode cookie:", name, error);
            return null;
        }
    }

    async function getCsrfToken() {
        // Initialize or refresh the CSRF cookie through Spring Security.
        const response = await fetch("/api/csrf", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                "Could not initialize CSRF token. HTTP " + response.status
            );
        }

        const csrfData = await response.json();

        // Use the cookie token, as in the working orders.js pattern.
        const cookieToken = getCookie("XSRF-TOKEN");

        if (cookieToken) {
            return cookieToken;
        }

        // Do not silently send a masked response token as a cookie token.
        console.error("CSRF endpoint response:", {
            headerName: csrfData.headerName,
            parameterName: csrfData.parameterName,
            cookieAvailable: false
        });

        throw new Error(
            "The XSRF-TOKEN cookie is missing. Check the browser cookies " +
            "and Spring Security CSRF configuration."
        );
    }

    // ===============================
    // PROFILE DROPDOWN
    // ===============================

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

    dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    document.addEventListener("click", function () {
        dropdown.hidden = true;
        profileButton.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            dropdown.hidden = true;
            profileButton.setAttribute("aria-expanded", "false");
        }
    });

    // ===============================
    // LOGOUT
    // ===============================

    logoutButton.addEventListener("click", async function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (!window.confirm("Are you sure you want to log out?")) {
            return;
        }

        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        try {
            const csrfToken = await getCsrfToken();

            const response = await fetch("/logout", {
                method: "POST",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "X-XSRF-TOKEN": csrfToken,
                    "Accept": "text/html"
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

            const responseText = await response.text().catch(() => "");

            console.error("Logout server response:", {
                status: response.status,
                response: responseText
            });

            throw new Error(
                "Logout failed. HTTP " + response.status +
                ". Check the browser console."
            );

        } catch (error) {
            console.error("Logout error:", error);

            window.alert(
                error.message || "Unable to log out."
            );

            logoutButton.disabled = false;
            logoutButton.innerHTML =
                '<span class="logout-icon" aria-hidden="true">↪</span>' +
                '<span>Logout</span>';
        }
    });
});
