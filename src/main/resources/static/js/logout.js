
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    if (!logoutButton) {
        console.error("Logout button not found.");
        return;
    }

    logoutButton.addEventListener("click", async function () {
        if (!confirm("Are you sure you want to log out?")) {
            return;
        }

        logoutButton.disabled = true;

        try {
            // Get a fresh CSRF token from Spring Security.
            const csrfResponse = await fetch("/api/csrf", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store"
            });

            if (!csrfResponse.ok) {
                throw new Error(
                    "Could not obtain CSRF token. HTTP " +
                    csrfResponse.status
                );
            }

            const csrfData = await csrfResponse.json();

            if (!csrfData.token || !csrfData.headerName) {
                throw new Error("CSRF token is missing from the response.");
            }

            // Submit logout with the token returned by Spring Security.
            const logoutResponse = await fetch("/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    [csrfData.headerName]: csrfData.token
                },
                redirect: "follow"
            });

            if (logoutResponse.redirected) {
                window.location.replace(logoutResponse.url);
            } else if (logoutResponse.ok) {
                window.location.replace("/login.html?logout");
            } else {
                throw new Error(
                    "Logout failed. HTTP " + logoutResponse.status
                );
            }
        } catch (error) {
            console.error("Logout error:", error);
            alert(error.message || "Unable to log out. Please try again.");
            logoutButton.disabled = false;
        }
    });
});
