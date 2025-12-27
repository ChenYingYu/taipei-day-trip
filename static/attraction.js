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
