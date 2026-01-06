async function getAttractionData() {
  const path = window.location.pathname;
  const attractionId = path.split("/").pop();

  try {
    const response = await fetch(`/api/attraction/${attractionId}`);
    const result = await response.json();
    const data = result.data;

    if (result.error) {
      window.location.href = "/";
      return;
    }

    document.getElementById("attraction-name").textContent = data.name;
    document.getElementById("attraction-category-mrt").textContent = `${
      data.category
    } at ${data.mrt || ""}`;
    document.getElementById("description").textContent = data.description;
    document.getElementById("address").textContent = data.address;
    document.getElementById("transport").textContent = data.transport;

    renderSlideshow(data.images);
  } catch (error) {
    console.error("Error fetching attraction details:", error);
  }
}

getAttractionData();

const timeRadios = document.querySelectorAll('input[name="time"]');
const priceDisplay = document.getElementById("booking-price");

timeRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "morning") {
      priceDisplay.textContent = "新台幣 2000 元";
    } else if (e.target.value === "afternoon") {
      priceDisplay.textContent = "新台幣 2500 元";
    }
  });
});

let currentIndex = 0;
let totalImages = [];

function renderSlideshow(images) {
  totalImages = images;
  const container = document.getElementById("slideshow-container");
  const indicatorsContainer = document.getElementById("indicators");

  container.innerHTML = "";
  indicatorsContainer.innerHTML = "";

  images.forEach((url, index) => {
    const img = document.createElement("img");
    img.src = url;
    img.className = index === 0 ? "slideshow__img active" : "slideshow__img";
    container.appendChild(img);

    const bar = document.createElement("div");
    bar.className = index === 0 ? "indicator-bar active" : "indicator-bar";
    indicatorsContainer.appendChild(bar);
  });
}

function updateSlideshow(newIndex) {
  const images = document.querySelectorAll(".slideshow__img");
  const bars = document.querySelectorAll(".indicator-bar");

  images[currentIndex].classList.remove("active");
  bars[currentIndex].classList.remove("active");

  if (newIndex >= totalImages.length) {
    currentIndex = 0;
  } else if (newIndex < 0) {
    currentIndex = totalImages.length - 1;
  } else {
    currentIndex = newIndex;
  }

  images[currentIndex].classList.add("active");
  bars[currentIndex].classList.add("active");
}

document
  .getElementById("next-btn")
  .addEventListener("click", () => updateSlideshow(currentIndex + 1));
document
  .getElementById("prev-btn")
  .addEventListener("click", () => updateSlideshow(currentIndex - 1));

const startBookingBtn = document.getElementById("start-booking-btn");

startBookingBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");

  if (!token) {
    authModal.style.display = "block";
    document.body.style.overflow = "hidden";
    showSignIn();
    return;
  }

  // Token exists but might be fake/expired
  const authRes = await fetch("/api/user/auth", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const authData = await authRes.json();

  if (!authData.data) {
    // Backend says token is invalid! Cleanup and show modal
    localStorage.removeItem("token");
    authModal.style.display = "block";
    document.body.style.overflow = "hidden";
    showSignIn();
    return;
  }

  // 1. Gather data
  const path = window.location.pathname;
  const attractionId = path.split("/").pop();
  const date = document.getElementById("booking-date").value;

  // Logic to determine time and price
  const isMorning = document.getElementById("morning").checked;
  const time = isMorning ? "morning" : "afternoon";
  const price = isMorning ? 2000 : 2500;

  if (!date) {
    alert("請選擇日期");
    return;
  }

  // 2. Send POST Request
  try {
    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        attractionId: parseInt(attractionId),
        date: date,
        time: time,
        price: price,
      }),
    });

    const result = await response.json();
    if (result.ok) {
      window.location.href = "/booking";
    } else {
      alert(result.message || "預約失敗");
    }
  } catch (error) {
    console.error("Booking error:", error);
  }
});
