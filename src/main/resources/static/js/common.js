document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // CURRENT DATE
    // =========================

    const dateElement = document.getElementById("currentDate");

    if (dateElement) {

        const today = new Date();

        const formattedDate = today.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        dateElement.textContent = formattedDate;
    }


    // =========================
    // CURRENT GREETING
    // =========================

    const greetingElement =
        document.getElementById("greeting");

    if (greetingElement) {

        const hour = new Date().getHours();

        let greeting = "Good morning";

        if (hour >= 12 && hour < 17) {
            greeting = "Good afternoon";
        }
        else if (hour >= 17) {
            greeting = "Good evening";
        }

        greetingElement.textContent =
            greeting + ", Admin 👋";
    }

});