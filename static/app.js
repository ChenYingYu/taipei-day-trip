document.addEventListener('DOMContentLoaded', () => {
    getAttractions();
})

async function getAttractions(page = 0) {
  try {
    const response = await fetch(`/api/attractions?page=${page}`); //
    const data = await response.json();
    renderAttractions(data.data);
  } catch (error) {
    console.error("Error fetching attractions:", error);
  }
}

function renderAttractions(attractions) {
  const grid = document.getElementById("attractions-grid");

  attractions.forEach((attraction) => {
    const card = document.createElement("div");
    card.className = "attraction-card";

    const imageUrl = attraction.images[0];

    card.innerHTML = `
            <div class="attraction-card__thumbnail" style="background-image: url('${imageUrl}')">
                <div class="attraction-card__name"></div>
            </div>
            <div class="attraction-card__info">
                <div class="attraction-card__mrt"></div>
                <div class="attraction-card__category"></div>
            </div>
        `;

    card.querySelector(".attraction-card__name").textContent = attraction.name;
    card.querySelector(".attraction-card__mrt").textContent =
      attraction.mrt || "";
    card.querySelector(".attraction-card__category").textContent =
      attraction.category;

    grid.appendChild(card);
  });
}
