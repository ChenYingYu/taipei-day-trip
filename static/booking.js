document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  // 1. Authentication Check
  if (!token) {
    window.location.href = "/";
    return;
  }

  // 2. Initial Page Setup
  await renderBookingPage(token);
});

async function renderBookingPage(token) {
  try {
    // Fetch User Info to get Name/Email for contact fields
    const userRes = await fetch("/api/user/auth", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userData = await userRes.json();

    if (userData.data) {
      document.querySelector("#user-name-display").textContent =
        userData.data.name;
      document.querySelector("#contact-name").value = userData.data.name;
      document.querySelector("#contact-email").value = userData.data.email;
    }

    // 3. Fetch Booking Data
    const bookingRes = await fetch("/api/booking", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bookingData = await bookingRes.json();

    const infoSection = document.querySelector("#booking-info-section");
    const noBookingMsg = document.querySelector("#no-booking-msg");
    const contactSection = document.querySelectorAll(".booking-section")[1]; // Contact
    const paymentSection = document.querySelectorAll(".booking-section")[2]; // Payment
    const dividers = document.querySelectorAll(".booking-divider");
    const confirmSection = document.querySelector(".booking-confirm");

    if (!bookingData.data) {
      // No booking exists
      infoSection.style.display = "none";
      contactSection.style.display = "none";
      paymentSection.style.display = "none";
      confirmSection.style.display = "none";
      dividers.forEach((hr) => (hr.style.display = "none"));
      noBookingMsg.style.display = "block";
      // Set footer to stick to bottom for empty page
      document.querySelector(".footer").style.height = "100vh";
    } else {
      // Booking exists: Render data
      const b = bookingData.data;
      document.querySelector("#attraction-image").src = b.attraction.image;
      document.querySelector("#attraction-name-display span").textContent =
        b.attraction.name;
      document.querySelector("#booking-date-display").textContent = b.date;
      document.querySelector("#booking-time-display").textContent =
        b.time === "morning" ? "早上 9 點到下午 4 點" : "下午 2 點到晚上 9 點";
      document.querySelector("#booking-price-display").textContent = b.price;
      document.querySelector("#attraction-address-display").textContent =
        b.attraction.address;
      document.querySelector("#final-price").textContent = b.price;

      // 4. Delete Booking Logic
      setupDeleteHandler(token);
    }
  } catch (error) {
    console.error("Error rendering booking page:", error);
  }
}

function setupDeleteHandler(token) {
  const deleteBtn = document.querySelector("#delete-booking-btn");
  deleteBtn.addEventListener("click", async () => {
    const confirmDelete = confirm("確定要刪除此預訂行程嗎？");
    if (!confirmDelete) return;

    try {
      const response = await fetch("/api/booking", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.ok) {
        location.reload(); // Refresh to show "No Booking" state
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  });
}
