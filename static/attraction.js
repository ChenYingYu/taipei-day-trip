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
    document.getElementById("attraction-category-mrt").textContent = 
      `${data.category} at ${data.mrt || ""}`;
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

timeRadios.forEach(radio => {
  radio.addEventListener("change", (e) => {
    if (e.target.value === "morning") {
      priceDisplay.textContent = "新台幣 2000 元";
    } else if (e.target.value === "afternoon") {
      priceDisplay.textContent = "新台幣 2500 元";
    }
  });
});

function renderSlideshow(images) {
  const container = document.getElementById("slideshow-container");
  const indicatorsContainer = document.getElementById("indicators");

  images.forEach((url, index) => {
    const img = document.createElement("img");
    img.src = url;
    img.className = "slideshow__img";
    if (index === 0) img.classList.add("active"); 
    container.appendChild(img);

    const dot = document.createElement("div");
    dot.className = "indicator-dot";
    if (index === 0) dot.classList.add("active");
    indicatorsContainer.appendChild(dot);
  });
}